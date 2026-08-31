/**
 * YouTube Data API v3 Publisher implementation.
 * Zero-SDK native fetch client with Google OAuth 2.0, 2-step resumable upload,
 * quota tracking (1,600 units/upload), 403 quotaExceeded handling, and strict dry-run mock execution.
 */

import {
  ISocialPublisher,
  OAuthConfig,
  OAuthToken,
  PublishRequest,
  PublishResponse,
  SocialCredentials,
  ValidationError,
  YouTubePublishError,
  YouTubeQuotaExceededError,
  TokenExpiredError,
} from './types';
import { youtubeRateLimiter, withRetry } from './rate-limiter';

export class YouTubePublisher implements ISocialPublisher {
  public readonly platform = 'youtube' as const;
  public static readonly UPLOAD_QUOTA_COST = 1600;
  public static readonly DAILY_QUOTA_BUDGET = 10000;

  /**
   * Generates Google OAuth 2.0 authorization URL.
   */
  getAuthUrl(config: OAuthConfig): string {
    const clientId = config.clientId || process.env.YOUTUBE_CLIENT_ID || '';
    const redirectUri = config.redirectUri || process.env.YOUTUBE_REDIRECT_URI || '';

    if (!clientId) {
      throw new ValidationError('YouTube OAuth requires a valid clientId', this.platform);
    }
    if (!redirectUri) {
      throw new ValidationError('YouTube OAuth requires a valid redirectUri', this.platform);
    }

    const defaultScopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
    ];
    const scopes = config.scopes && config.scopes.length > 0 ? config.scopes : defaultScopes;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    });

    if (config.state) {
      params.set('state', config.state);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for access and refresh tokens.
   */
  async exchangeCode(code: string, config: OAuthConfig): Promise<OAuthToken> {
    if (!code) {
      throw new ValidationError('Authorization code is required', this.platform);
    }

    const clientId = config.clientId || process.env.YOUTUBE_CLIENT_ID || '';
    const clientSecret = config.clientSecret || process.env.YOUTUBE_CLIENT_SECRET || '';
    const redirectUri = config.redirectUri || process.env.YOUTUBE_REDIRECT_URI || '';

    return withRetry(async () => {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new YouTubePublishError(
          `YouTube OAuth token exchange failed: ${data.error_description || data.error || response.statusText}`,
          response.status,
          data
        );
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        expiresAt: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : undefined,
        tokenType: data.token_type || 'Bearer',
        scope: data.scope,
        extra: data,
      };
    });
  }

  /**
   * Refreshes an expired Google OAuth 2.0 access token using a refresh token.
   */
  async refreshToken(refreshToken: string, config: OAuthConfig): Promise<OAuthToken> {
    if (!refreshToken) {
      throw new TokenExpiredError('Refresh token is required to refresh YouTube access token', this.platform);
    }

    const clientId = config.clientId || process.env.YOUTUBE_CLIENT_ID || '';
    const clientSecret = config.clientSecret || process.env.YOUTUBE_CLIENT_SECRET || '';

    return withRetry(async () => {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          throw new TokenExpiredError(
            `YouTube token refresh failed: ${data.error_description || data.error}. Re-authentication required.`,
            this.platform,
            data
          );
        }
        throw new YouTubePublishError(
          `YouTube token refresh failed: ${data.error_description || data.error}`,
          response.status,
          data
        );
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in,
        expiresAt: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : undefined,
        tokenType: data.token_type || 'Bearer',
        scope: data.scope,
        extra: data,
      };
    });
  }

  /**
   * Validates YouTube video publish request metadata.
   */
  private validateRequest(request: PublishRequest): void {
    if (!request.title || typeof request.title !== 'string' || request.title.trim().length === 0) {
      throw new ValidationError('YouTube video title is required and cannot be empty', this.platform);
    }

    if (request.title.length > 100) {
      throw new ValidationError(
        `YouTube video title cannot exceed 100 characters (received ${request.title.length} chars)`,
        this.platform
      );
    }

    if (request.description && request.description.length > 5000) {
      throw new ValidationError(
        `YouTube video description cannot exceed 5000 characters (received ${request.description.length} chars)`,
        this.platform
      );
    }

    if (Array.isArray(request.tags)) {
      const totalTagLength = request.tags.join(',').length;
      if (totalTagLength > 500) {
        throw new ValidationError(
          `YouTube total tags string length cannot exceed 500 characters (received ${totalTagLength} chars)`,
          this.platform
        );
      }
    }

    const validPrivacy = ['public', 'unlisted', 'private'];
    if (request.privacy && !validPrivacy.includes(request.privacy)) {
      throw new ValidationError(
        `Invalid YouTube privacy level: "${request.privacy}". Expected one of: ${validPrivacy.join(', ')}`,
        this.platform
      );
    }
  }

  /**
   * Publishes a video to YouTube Data API v3.
   * Defaults strictly to dry-run mock mode (isDryRun = true).
   */
  async publishVideo(request: PublishRequest): Promise<PublishResponse> {
    this.validateRequest(request);

    const isDryRun = request.isDryRun !== false;
    const logs: string[] = [];
    const publishedAt = new Date().toISOString();

    if (isDryRun) {
      logs.push(`[${new Date().toISOString()}] [YouTubePublisher] Running in safe dry-run mode.`);
      logs.push(`[${new Date().toISOString()}] [YouTubePublisher] Input metadata validated successfully.`);
      logs.push(`[${new Date().toISOString()}] [YouTubePublisher] Simulated 2-step resumable upload protocol.`);
      
      const mockId = `mock_yt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const publishedUrl = `https://www.youtube.com/watch?v=${mockId}`;

      return {
        success: true,
        platform: this.platform,
        platformVideoId: mockId,
        publishedUrl,
        isDryRun: true,
        status: 'published',
        publishedAt,
        logs,
        metadata: {
          quotaUnitsUsed: YouTubePublisher.UPLOAD_QUOTA_COST,
          dailyBudget: YouTubePublisher.DAILY_QUOTA_BUDGET,
          privacyStatus: request.privacy || 'public',
          title: request.title,
          tagsCount: request.tags?.length || 0,
        },
      };
    }

    // --- Live API Execution ---
    const accessToken = request.credentials?.accessToken;
    if (!accessToken) {
      throw new TokenExpiredError('Valid OAuth accessToken is required for live YouTube publishing', this.platform);
    }

    if (!request.videoBuffer && !request.videoUrl) {
      throw new ValidationError('Either videoBuffer or videoUrl is required for YouTube video upload', this.platform);
    }

    await youtubeRateLimiter.acquire(1);
    logs.push(`[${new Date().toISOString()}] [YouTubePublisher] Initiating live YouTube video upload.`);

    return withRetry(async () => {
      // Step 1: Create Resumable Upload Session
      const metadataPayload = {
        snippet: {
          title: request.title,
          description: request.description || request.caption || '',
          tags: request.tags || [],
          categoryId: '22', // People & Blogs (standard for short-form creators)
        },
        status: {
          privacyStatus: request.privacy || 'public',
          selfDeclaredMadeForKids: false,
          publishAt: request.scheduledAt,
        },
      };

      // Determine video payload & byte length
      let videoBytes: Buffer;
      if (request.videoBuffer) {
        videoBytes = Buffer.isBuffer(request.videoBuffer)
          ? request.videoBuffer
          : Buffer.from(request.videoBuffer);
      } else {
        logs.push(`[${new Date().toISOString()}] [YouTubePublisher] Fetching video binary from ${request.videoUrl}`);
        const videoFetchRes = await fetch(request.videoUrl!);
        if (!videoFetchRes.ok) {
          throw new YouTubePublishError(
            `Failed to download source video from ${request.videoUrl}: ${videoFetchRes.statusText}`,
            videoFetchRes.status
          );
        }
        const arrayBuf = await videoFetchRes.arrayBuffer();
        videoBytes = Buffer.from(arrayBuf);
      }

      const initResponse = await fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': 'video/mp4',
            'X-Upload-Content-Length': String(videoBytes.length),
          },
          body: JSON.stringify(metadataPayload),
        }
      );

      if (!initResponse.ok) {
        const errData = await initResponse.json().catch(() => ({}));
        const reason = errData?.error?.errors?.[0]?.reason || errData?.error?.message || '';

        if (initResponse.status === 403 && (reason === 'quotaExceeded' || reason.includes('quota'))) {
          throw new YouTubeQuotaExceededError(
            'Daily YouTube API quota exceeded (1,600 units required per video upload). Resets at midnight Pacific Time.',
            errData
          );
        }

        if (initResponse.status === 401) {
          throw new TokenExpiredError('YouTube OAuth access token expired or invalid', this.platform, errData);
        }

        throw new YouTubePublishError(
          `YouTube resumable session initialization failed: ${errData?.error?.message || initResponse.statusText}`,
          initResponse.status,
          errData
        );
      }

      const uploadUrl = initResponse.headers.get('Location');
      if (!uploadUrl) {
        throw new YouTubePublishError('YouTube API did not return a resumable Location upload URL', initResponse.status);
      }

      logs.push(`[${new Date().toISOString()}] [YouTubePublisher] Resumable session created. Uploading ${videoBytes.length} bytes.`);

      // Step 2: Upload Binary Video Payload
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': String(videoBytes.length),
        },
        body: videoBytes as unknown as BodyInit,
      });

      const uploadResult = await uploadResponse.json().catch(() => ({}));

      if (!uploadResponse.ok) {
        throw new YouTubePublishError(
          `YouTube video upload payload transfer failed: ${uploadResult?.error?.message || uploadResponse.statusText}`,
          uploadResponse.status,
          uploadResult
        );
      }

      const platformVideoId = uploadResult.id;
      const publishedUrl = `https://www.youtube.com/watch?v=${platformVideoId}`;
      logs.push(`[${new Date().toISOString()}] [YouTubePublisher] Video published successfully: ${publishedUrl}`);

      return {
        success: true,
        platform: this.platform,
        platformVideoId,
        publishedUrl,
        isDryRun: false,
        status: 'published',
        publishedAt,
        logs,
        metadata: {
          quotaUnitsUsed: YouTubePublisher.UPLOAD_QUOTA_COST,
          uploadResult,
        },
      };
    });
  }

  /**
   * Checks video processing and upload status on YouTube.
   */
  async checkStatus(platformVideoId: string, credentials?: SocialCredentials): Promise<PublishResponse> {
    if (!platformVideoId) {
      throw new ValidationError('platformVideoId is required to check status', this.platform);
    }

    if (platformVideoId.startsWith('mock_')) {
      return {
        success: true,
        platform: this.platform,
        platformVideoId,
        publishedUrl: `https://www.youtube.com/watch?v=${platformVideoId}`,
        isDryRun: true,
        status: 'published',
        publishedAt: new Date().toISOString(),
        logs: ['[YouTubePublisher] Mock status verified as published.'],
      };
    }

    const accessToken = credentials?.accessToken;
    if (!accessToken) {
      throw new TokenExpiredError('Valid accessToken required to query live YouTube video status', this.platform);
    }

    return withRetry(async () => {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,status,processingDetails&id=${platformVideoId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new YouTubePublishError(
          `Failed to fetch YouTube video status: ${data?.error?.message || response.statusText}`,
          response.status,
          data
        );
      }

      const item = data.items?.[0];
      if (!item) {
        throw new YouTubePublishError(`YouTube video ${platformVideoId} not found`, 404, data);
      }

      const uploadStatus = item.status?.uploadStatus;
      const status: PublishResponse['status'] =
        uploadStatus === 'uploaded' || uploadStatus === 'processed'
          ? 'published'
          : uploadStatus === 'rejected' || uploadStatus === 'failed'
          ? 'failed'
          : 'processing';

      return {
        success: status === 'published',
        platform: this.platform,
        platformVideoId,
        publishedUrl: `https://www.youtube.com/watch?v=${platformVideoId}`,
        isDryRun: false,
        status,
        publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
        logs: [`[YouTubePublisher] Current upload status: ${uploadStatus}`],
        metadata: item,
      };
    });
  }
}

export const youtubePublisher = new YouTubePublisher();
