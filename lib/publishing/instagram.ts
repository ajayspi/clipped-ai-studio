/**
 * Instagram Graph API Reels Publisher implementation.
 * Handles Meta OAuth 2.0 long-lived token exchange, 3-step Reels container publishing flow
 * (media container creation -> transcoding status polling -> media publication),
 * 50 posts/24hr rate limit tracking, and strict dry-run mock execution.
 */

import {
  ISocialPublisher,
  OAuthConfig,
  OAuthToken,
  PublishRequest,
  PublishResponse,
  SocialCredentials,
  ValidationError,
  InstagramPublishError,
  InstagramRateLimitError,
  TokenExpiredError,
} from './types';
import { instagramRateLimiter, withRetry } from './rate-limiter';

export class InstagramPublisher implements ISocialPublisher {
  public readonly platform = 'instagram' as const;
  public static readonly DAILY_POST_LIMIT = 50;

  /**
   * Generates Facebook / Instagram OAuth authorization URL.
   */
  getAuthUrl(config: OAuthConfig): string {
    const clientId =
      config.clientId ||
      process.env.INSTAGRAM_APP_ID ||
      process.env.FACEBOOK_APP_ID ||
      '';
    const redirectUri =
      config.redirectUri ||
      process.env.INSTAGRAM_REDIRECT_URI ||
      '';

    if (!clientId) {
      throw new ValidationError('Instagram OAuth requires a valid clientId/appId', this.platform);
    }
    if (!redirectUri) {
      throw new ValidationError('Instagram OAuth requires a valid redirectUri', this.platform);
    }

    const defaultScopes = [
      'instagram_basic',
      'instagram_content_publish',
      'pages_show_list',
      'pages_read_engagement',
    ];
    const scopes = config.scopes && config.scopes.length > 0 ? config.scopes : defaultScopes;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(','),
    });

    if (config.state) {
      params.set('state', config.state);
    }

    return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for a 60-day long-lived user access token.
   */
  async exchangeCode(code: string, config: OAuthConfig): Promise<OAuthToken> {
    if (!code) {
      throw new ValidationError('Authorization code is required', this.platform);
    }

    const clientId = config.clientId || process.env.INSTAGRAM_APP_ID || '';
    const clientSecret = config.clientSecret || process.env.INSTAGRAM_APP_SECRET || '';
    const redirectUri = config.redirectUri || process.env.INSTAGRAM_REDIRECT_URI || '';

    return withRetry(async () => {
      // Step 1: Exchange code for short-lived user access token
      const shortTokenRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code,
        }).toString()}`
      );

      const shortTokenData = await shortTokenRes.json();
      if (!shortTokenRes.ok) {
        throw new InstagramPublishError(
          `Instagram short-lived token exchange failed: ${shortTokenData?.error?.message || shortTokenRes.statusText}`,
          shortTokenRes.status,
          shortTokenData
        );
      }

      const shortLivedToken = shortTokenData.access_token;

      // Step 2: Exchange short-lived token for 60-day long-lived token
      const longTokenRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: clientId,
          client_secret: clientSecret,
          fb_exchange_token: shortLivedToken,
        }).toString()}`
      );

      const longTokenData = await longTokenRes.json();
      if (!longTokenRes.ok) {
        throw new InstagramPublishError(
          `Instagram long-lived token exchange failed: ${longTokenData?.error?.message || longTokenRes.statusText}`,
          longTokenRes.status,
          longTokenData
        );
      }

      const longLivedToken = longTokenData.access_token;
      const expiresIn = longTokenData.expires_in || 5184000; // 60 days standard

      // Step 3: Attempt to resolve linked Instagram Business Account ID
      let igUserId: string | undefined;
      try {
        const pagesRes = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`
        );
        const pagesData = await pagesRes.json();
        if (pagesData.data && pagesData.data.length > 0) {
          const pageId = pagesData.data[0].id;
          const igAccountRes = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${longLivedToken}`
          );
          const igAccountData = await igAccountRes.json();
          igUserId = igAccountData.instagram_business_account?.id;
        }
      } catch {
        // Non-critical during initial exchange; can be supplied in credentials
      }

      return {
        accessToken: longLivedToken,
        refreshToken: longLivedToken,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        tokenType: 'Bearer',
        platformUserId: igUserId,
        extra: longTokenData,
      };
    });
  }

  /**
   * Refreshes a long-lived Meta / Instagram access token.
   */
  async refreshToken(refreshToken: string, config: OAuthConfig): Promise<OAuthToken> {
    if (!refreshToken) {
      throw new TokenExpiredError('Refresh token is required to refresh Instagram access token', this.platform);
    }

    const clientId = config.clientId || process.env.INSTAGRAM_APP_ID || '';
    const clientSecret = config.clientSecret || process.env.INSTAGRAM_APP_SECRET || '';

    return withRetry(async () => {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: clientId,
          client_secret: clientSecret,
          fb_exchange_token: refreshToken,
        }).toString()}`
      );

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          throw new TokenExpiredError(
            `Instagram token refresh failed: ${data?.error?.message || response.statusText}. Re-authentication required.`,
            this.platform,
            data
          );
        }
        throw new InstagramPublishError(
          `Instagram token refresh failed: ${data?.error?.message || response.statusText}`,
          response.status,
          data
        );
      }

      const expiresIn = data.expires_in || 5184000;
      return {
        accessToken: data.access_token,
        refreshToken: data.access_token,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        tokenType: 'Bearer',
        extra: data,
      };
    });
  }

  /**
   * Validates Instagram Reels publish request payload.
   */
  private validateRequest(request: PublishRequest): string {
    const caption = (request.caption || request.description || request.title || '').trim();

    if (caption.length > 2200) {
      throw new ValidationError(
        `Instagram caption cannot exceed 2200 characters (received ${caption.length} chars)`,
        this.platform
      );
    }

    // Check hashtag limit (max 30 hashtags per Meta API policy)
    const hashtags = caption.match(/#[^\s#]+/g) || [];
    if (hashtags.length > 30) {
      throw new ValidationError(
        `Instagram Reels support a maximum of 30 hashtags (received ${hashtags.length} hashtags)`,
        this.platform
      );
    }

    return caption;
  }

  /**
   * Publishes a short-form video as an Instagram Reel.
   * Defaults strictly to dry-run mock mode (isDryRun = true).
   */
  async publishVideo(request: PublishRequest): Promise<PublishResponse> {
    const caption = this.validateRequest(request);

    const isDryRun = request.isDryRun !== false;
    const logs: string[] = [];
    const publishedAt = new Date().toISOString();

    if (isDryRun) {
      logs.push(`[${new Date().toISOString()}] [InstagramPublisher] Running in safe dry-run mode.`);
      logs.push(`[${new Date().toISOString()}] [InstagramPublisher] Validated caption length and hashtag limits.`);
      logs.push(`[${new Date().toISOString()}] [InstagramPublisher] Step 1: Simulated Reels media container creation.`);
      logs.push(`[${new Date().toISOString()}] [InstagramPublisher] Step 2: Simulated transcoding status polling (FINISHED).`);
      logs.push(`[${new Date().toISOString()}] [InstagramPublisher] Step 3: Simulated media_publish.`);

      const mockId = `mock_ig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const mockContainerId = `mock_cnt_${Math.random().toString(36).substring(2, 8)}`;
      const publishedUrl = `https://www.instagram.com/reel/${mockId}/`;

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
          containerId: mockContainerId,
          dailyLimit: InstagramPublisher.DAILY_POST_LIMIT,
          captionLength: caption.length,
          shareToFeed: true,
        },
      };
    }

    // --- Live API Execution ---
    const accessToken = request.credentials?.accessToken;
    const igUserId =
      request.credentials?.platformUserId ||
      request.credentials?.extra?.igUserId ||
      process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

    if (!accessToken) {
      throw new TokenExpiredError('Valid OAuth accessToken is required for live Instagram publishing', this.platform);
    }
    if (!igUserId) {
      throw new ValidationError(
        'Instagram Business Account ID (igUserId) is required for live publishing',
        this.platform
      );
    }
    if (!request.videoUrl) {
      throw new ValidationError(
        'Publicly accessible HTTPS videoUrl is required for Instagram Graph API Reels publishing',
        this.platform
      );
    }

    await instagramRateLimiter.acquire(1);
    logs.push(`[${new Date().toISOString()}] [InstagramPublisher] Starting 3-step Reels publishing flow.`);

    return withRetry(async () => {
      // Step 1: Create Media Container
      const containerParams: Record<string, string> = {
        media_type: 'REELS',
        video_url: request.videoUrl!,
        caption,
        share_to_feed: 'true',
        thumb_offset: '1000',
        access_token: accessToken,
      };

      if (request.coverUrl) {
        containerParams.cover_url = request.coverUrl;
      }

      const containerRes = await fetch(
        `https://graph.facebook.com/v19.0/${igUserId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(containerParams),
        }
      );

      const containerData = await containerRes.json();
      if (!containerRes.ok) {
        const errCode = containerData?.error?.code;
        const subCode = containerData?.error?.error_subcode;

        // Meta Platform rate limit codes: 32, 4, 17, 2207001 (User has reached 50 posts limit)
        if (errCode === 32 || errCode === 4 || subCode === 2207001 || containerData?.error?.message?.includes('limit')) {
          throw new InstagramRateLimitError(
            `Account publishing limit of 50 posts per 24 hours reached: ${containerData?.error?.message}`,
            containerData
          );
        }

        if (containerRes.status === 401 || errCode === 190) {
          throw new TokenExpiredError('Instagram OAuth access token expired or invalid', this.platform, containerData);
        }

        throw new InstagramPublishError(
          `Instagram media container creation failed: ${containerData?.error?.message || containerRes.statusText}`,
          containerRes.status,
          containerData
        );
      }

      const containerId = containerData.id;
      logs.push(`[${new Date().toISOString()}] [InstagramPublisher] Step 1 Complete: Container created (ID: ${containerId}).`);

      // Step 2: Poll Container Transcoding Status
      let isReady = false;
      const maxPollAttempts = 30; // 30 * 3000ms = 90s max timeout
      const pollIntervalMs = 3000;

      for (let attempt = 1; attempt <= maxPollAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

        const statusRes = await fetch(
          `https://graph.facebook.com/v19.0/${containerId}?fields=status_code,status&access_token=${accessToken}`
        );
        const statusData = await statusRes.json();

        if (!statusRes.ok) {
          throw new InstagramPublishError(
            `Failed to check Instagram container status: ${statusData?.error?.message || statusRes.statusText}`,
            statusRes.status,
            statusData
          );
        }

        const statusCode = statusData.status_code;
        logs.push(`[${new Date().toISOString()}] [InstagramPublisher] Poll attempt ${attempt}: status is ${statusCode}`);

        if (statusCode === 'FINISHED') {
          isReady = true;
          break;
        } else if (statusCode === 'ERROR') {
          throw new InstagramPublishError(
            `Container processing failed with status ERROR: ${statusData.status || 'Transcoding failure'}`,
            400,
            statusData
          );
        } else if (statusCode === 'EXPIRED') {
          throw new InstagramPublishError(
            'Instagram media container expired before publication',
            400,
            statusData
          );
        }
      }

      if (!isReady) {
        throw new InstagramPublishError(
          `Instagram video transcoding timed out after ${maxPollAttempts * (pollIntervalMs / 1000)} seconds`,
          408
        );
      }

      // Step 3: Publish Media Container
      const publishRes = await fetch(
        `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            creation_id: containerId,
            access_token: accessToken,
          }),
        }
      );

      const publishData = await publishRes.json();
      if (!publishRes.ok) {
        throw new InstagramPublishError(
          `Instagram media publication failed: ${publishData?.error?.message || publishRes.statusText}`,
          publishRes.status,
          publishData
        );
      }

      const platformVideoId = publishData.id;
      const publishedUrl = `https://www.instagram.com/reel/${platformVideoId}/`;
      logs.push(`[${new Date().toISOString()}] [InstagramPublisher] Step 3 Complete: Published successfully to ${publishedUrl}`);

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
          containerId,
          publishData,
        },
      };
    });
  }

  /**
   * Checks status of an Instagram media asset.
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
        publishedUrl: `https://www.instagram.com/reel/${platformVideoId}/`,
        isDryRun: true,
        status: 'published',
        publishedAt: new Date().toISOString(),
        logs: ['[InstagramPublisher] Mock status verified as published.'],
      };
    }

    const accessToken = credentials?.accessToken;
    if (!accessToken) {
      throw new TokenExpiredError('Valid accessToken required to query live Instagram media status', this.platform);
    }

    return withRetry(async () => {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${platformVideoId}?fields=id,permalink,media_type,status&access_token=${accessToken}`
      );

      const data = await response.json();
      if (!response.ok) {
        throw new InstagramPublishError(
          `Failed to fetch Instagram media status: ${data?.error?.message || response.statusText}`,
          response.status,
          data
        );
      }

      return {
        success: true,
        platform: this.platform,
        platformVideoId,
        publishedUrl: data.permalink || `https://www.instagram.com/reel/${platformVideoId}/`,
        isDryRun: false,
        status: 'published',
        publishedAt: new Date().toISOString(),
        logs: ['[InstagramPublisher] Media item active and published.'],
        metadata: data,
      };
    });
  }
}

export const instagramPublisher = new InstagramPublisher();
