/**
 * TikTok Content Posting API Publisher implementation.
 * Handles TikTok OAuth 2.0 v2 token exchange and refresh, Direct Post video initialization
 * (POST /v2/post/publish/video/init/), status fetch polling, creator privacy settings,
 * and strict dry-run mock execution.
 */

import {
  ISocialPublisher,
  OAuthConfig,
  OAuthToken,
  PublishRequest,
  PublishResponse,
  SocialCredentials,
  ValidationError,
  TikTokPublishError,
  TokenExpiredError,
} from './types';
import { tiktokRateLimiter, withRetry } from './rate-limiter';

export class TikTokPublisher implements ISocialPublisher {
  public readonly platform = 'tiktok' as const;

  /**
   * Generates TikTok OAuth 2.0 authorization URL.
   */
  getAuthUrl(config: OAuthConfig): string {
    const clientKey =
      config.clientId ||
      process.env.TIKTOK_CLIENT_KEY ||
      process.env.TIKTOK_CLIENT_ID ||
      '';
    const redirectUri =
      config.redirectUri ||
      process.env.TIKTOK_REDIRECT_URI ||
      '';

    if (!clientKey) {
      throw new ValidationError('TikTok OAuth requires a valid clientKey/clientId', this.platform);
    }
    if (!redirectUri) {
      throw new ValidationError('TikTok OAuth requires a valid redirectUri', this.platform);
    }

    const defaultScopes = ['user.info.basic', 'video.publish', 'video.upload'];
    const scopes = config.scopes && config.scopes.length > 0 ? config.scopes : defaultScopes;

    const params = new URLSearchParams({
      client_key: clientKey,
      scope: scopes.join(','),
      response_type: 'code',
      redirect_uri: redirectUri,
    });

    if (config.state) {
      params.set('state', config.state);
    }

    return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for TikTok access and refresh tokens.
   */
  async exchangeCode(code: string, config: OAuthConfig): Promise<OAuthToken> {
    if (!code) {
      throw new ValidationError('Authorization code is required', this.platform);
    }

    const clientKey = config.clientId || process.env.TIKTOK_CLIENT_KEY || '';
    const clientSecret = config.clientSecret || process.env.TIKTOK_CLIENT_SECRET || '';
    const redirectUri = config.redirectUri || process.env.TIKTOK_REDIRECT_URI || '';

    return withRetry(async () => {
      const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      const json = await response.json();

      if (!response.ok || (json.error && json.error.code !== 'ok' && json.error.code !== '0' && json.error.code !== 0)) {
        const errorMsg = json.error?.message || json.message || response.statusText;
        throw new TikTokPublishError(
          `TikTok OAuth token exchange failed: ${errorMsg}`,
          response.status,
          json
        );
      }

      const tokenData = json.data || json;
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        expiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : undefined,
        tokenType: tokenData.token_type || 'Bearer',
        scope: tokenData.scope,
        platformUserId: tokenData.open_id,
        extra: json,
      };
    });
  }

  /**
   * Refreshes an expired TikTok access token using a refresh token.
   */
  async refreshToken(refreshToken: string, config: OAuthConfig): Promise<OAuthToken> {
    if (!refreshToken) {
      throw new TokenExpiredError('Refresh token is required to refresh TikTok access token', this.platform);
    }

    const clientKey = config.clientId || process.env.TIKTOK_CLIENT_KEY || '';
    const clientSecret = config.clientSecret || process.env.TIKTOK_CLIENT_SECRET || '';

    return withRetry(async () => {
      const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      const json = await response.json();

      if (!response.ok || (json.error && json.error.code !== 'ok' && json.error.code !== '0' && json.error.code !== 0)) {
        if (response.status === 400 || response.status === 401 || json.error?.code === 'invalid_grant') {
          throw new TokenExpiredError(
            `TikTok token refresh failed: ${json.error?.message || response.statusText}. Re-authentication required.`,
            this.platform,
            json
          );
        }
        throw new TikTokPublishError(
          `TikTok token refresh failed: ${json.error?.message || response.statusText}`,
          response.status,
          json
        );
      }

      const tokenData = json.data || json;
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken,
        expiresIn: tokenData.expires_in,
        expiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : undefined,
        tokenType: tokenData.token_type || 'Bearer',
        scope: tokenData.scope,
        platformUserId: tokenData.open_id,
        extra: json,
      };
    });
  }

  /**
   * Maps common privacy levels to TikTok privacy enum strings.
   */
  private mapPrivacyLevel(privacy?: string): string {
    if (!privacy) return 'PUBLIC_TO_EVERYONE';

    const normalized = privacy.toUpperCase();
    if (normalized === 'PUBLIC' || normalized === 'PUBLIC_TO_EVERYONE') {
      return 'PUBLIC_TO_EVERYONE';
    }
    if (
      normalized === 'UNLISTED' ||
      normalized === 'FRIENDS' ||
      normalized === 'MUTUAL_FOLLOW_FRIENDS'
    ) {
      return 'MUTUAL_FOLLOW_FRIENDS';
    }
    if (
      normalized === 'PRIVATE' ||
      normalized === 'SELF_ONLY'
    ) {
      return 'SELF_ONLY';
    }

    throw new ValidationError(
      `Invalid TikTok privacy level: "${privacy}". Expected "public", "unlisted", "private", or TikTok enums.`,
      this.platform
    );
  }

  /**
   * Validates TikTok video publish request payload.
   */
  private validateRequest(request: PublishRequest): { title: string; privacyLevel: string } {
    const title = (request.title || request.caption || '').trim();

    if (!title || title.length === 0) {
      throw new ValidationError('TikTok video title is required and cannot be empty', this.platform);
    }

    if (title.length > 2200) {
      throw new ValidationError(
        `TikTok video title cannot exceed 2200 characters (received ${title.length} chars)`,
        this.platform
      );
    }

    const privacyLevel = this.mapPrivacyLevel(request.privacy);

    return { title, privacyLevel };
  }

  /**
   * Publishes a video to TikTok using the Content Posting API.
   * Defaults strictly to dry-run mock mode (isDryRun = true).
   */
  async publishVideo(request: PublishRequest): Promise<PublishResponse> {
    const { title, privacyLevel } = this.validateRequest(request);

    const isDryRun = request.isDryRun !== false;
    const logs: string[] = [];
    const publishedAt = new Date().toISOString();

    if (isDryRun) {
      logs.push(`[${new Date().toISOString()}] [TikTokPublisher] Running in safe dry-run mode.`);
      logs.push(`[${new Date().toISOString()}] [TikTokPublisher] Validated post metadata (privacy: ${privacyLevel}).`);
      logs.push(`[${new Date().toISOString()}] [TikTokPublisher] Initialized video publish (PULL_FROM_URL).`);
      logs.push(`[${new Date().toISOString()}] [TikTokPublisher] Polled publish status -> PUBLISH_COMPLETE.`);

      const mockId = `mock_tt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const mockPublishId = `v_pub_file_${Math.random().toString(36).substring(2, 8)}`;
      const publishedUrl = `https://www.tiktok.com/@creator/video/${mockId}`;

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
          publishId: mockPublishId,
          privacyLevel,
          title,
        },
      };
    }

    // --- Live API Execution ---
    const accessToken = request.credentials?.accessToken;
    if (!accessToken) {
      throw new TokenExpiredError('Valid OAuth accessToken is required for live TikTok publishing', this.platform);
    }

    if (!request.videoUrl) {
      throw new ValidationError(
        'Publicly accessible HTTPS videoUrl is required for TikTok direct video publishing (PULL_FROM_URL)',
        this.platform
      );
    }

    await tiktokRateLimiter.acquire(1);
    logs.push(`[${new Date().toISOString()}] [TikTokPublisher] Initializing direct video post.`);

    return withRetry(async () => {
      // Step 1: Initialize Video Publish
      const initPayload = {
        post_info: {
          title,
          privacy_level: privacyLevel,
          disable_duet: false,
          disable_stitch: false,
          disable_comment: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: request.videoUrl,
        },
      };

      const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(initPayload),
      });

      const initJson = await initRes.json();
      if (!initRes.ok || (initJson.error && initJson.error.code !== 'ok' && initJson.error.code !== '0' && initJson.error.code !== 0)) {
        const errorMsg = initJson.error?.message || initJson.message || initRes.statusText;
        if (initRes.status === 401) {
          throw new TokenExpiredError('TikTok OAuth access token expired or invalid', this.platform, initJson);
        }
        throw new TikTokPublishError(
          `TikTok video publishing initialization failed: ${errorMsg}`,
          initRes.status,
          initJson
        );
      }

      const publishId = initJson.data?.publish_id;
      if (!publishId) {
        throw new TikTokPublishError('TikTok API did not return a publish_id', initRes.status, initJson);
      }

      logs.push(`[${new Date().toISOString()}] [TikTokPublisher] Publish initialized (publish_id: ${publishId}). Polling status...`);

      // Step 2: Poll Publish Status
      let isPublished = false;
      const maxPollAttempts = 20;
      const pollIntervalMs = 3000;

      for (let attempt = 1; attempt <= maxPollAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

        const statusRes = await fetch('https://open.tiktokapis.com/v2/post/publish/status_fetch/', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ publish_id: publishId }),
        });

        const statusJson = await statusRes.json();
        if (!statusRes.ok) {
          throw new TikTokPublishError(
            `Failed to fetch TikTok publish status: ${statusJson?.error?.message || statusRes.statusText}`,
            statusRes.status,
            statusJson
          );
        }

        const status = statusJson.data?.status;
        logs.push(`[${new Date().toISOString()}] [TikTokPublisher] Poll attempt ${attempt}: status is ${status}`);

        if (status === 'PUBLISH_COMPLETE') {
          isPublished = true;
          break;
        } else if (status === 'FAILED') {
          const failReason = statusJson.data?.fail_reason || 'Unknown TikTok publishing failure';
          throw new TikTokPublishError(`TikTok video publishing failed: ${failReason}`, 400, statusJson);
        }
      }

      if (!isPublished) {
        throw new TikTokPublishError(
          `TikTok video publishing timed out waiting for completion after ${maxPollAttempts * (pollIntervalMs / 1000)} seconds`,
          408
        );
      }

      const publishedUrl = `https://www.tiktok.com/@creator/video/${publishId}`;
      logs.push(`[${new Date().toISOString()}] [TikTokPublisher] Publish complete: ${publishedUrl}`);

      return {
        success: true,
        platform: this.platform,
        platformVideoId: publishId,
        publishedUrl,
        isDryRun: false,
        status: 'published',
        publishedAt,
        logs,
        metadata: {
          publishId,
          privacyLevel,
          initData: initJson.data,
        },
      };
    });
  }

  /**
   * Checks status of a TikTok publish job.
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
        publishedUrl: `https://www.tiktok.com/@creator/video/${platformVideoId}`,
        isDryRun: true,
        status: 'published',
        publishedAt: new Date().toISOString(),
        logs: ['[TikTokPublisher] Mock status verified as published.'],
      };
    }

    const accessToken = credentials?.accessToken;
    if (!accessToken) {
      throw new TokenExpiredError('Valid accessToken required to query live TikTok publish status', this.platform);
    }

    return withRetry(async () => {
      const response = await fetch('https://open.tiktokapis.com/v2/post/publish/status_fetch/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publish_id: platformVideoId }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new TikTokPublishError(
          `Failed to fetch TikTok status: ${json?.error?.message || response.statusText}`,
          response.status,
          json
        );
      }

      const statusVal = json.data?.status;
      const status: PublishResponse['status'] =
        statusVal === 'PUBLISH_COMPLETE'
          ? 'published'
          : statusVal === 'FAILED'
          ? 'failed'
          : 'processing';

      return {
        success: status === 'published',
        platform: this.platform,
        platformVideoId,
        publishedUrl: `https://www.tiktok.com/@creator/video/${platformVideoId}`,
        isDryRun: false,
        status,
        publishedAt: new Date().toISOString(),
        logs: [`[TikTokPublisher] Current status: ${statusVal}`],
        metadata: json.data,
      };
    });
  }
}

export const tiktokPublisher = new TikTokPublisher();
