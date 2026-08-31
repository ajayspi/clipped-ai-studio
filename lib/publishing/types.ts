/**
 * Core TypeScript models, interfaces, and custom error classes
 * for the Clipped Social Publishing subsystem.
 */

export type SocialPlatform = 'youtube' | 'instagram' | 'tiktok';

export type PublishStatus =
  | 'pending'
  | 'processing'
  | 'published'
  | 'scheduled'
  | 'failed';

export type VideoPrivacy = 'public' | 'unlisted' | 'private';

export interface SocialCredentials {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string | number;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  platformUserId?: string; // e.g. ig-user-id or open_id
  extra?: Record<string, any>;
}

export interface PublishRequest {
  platform: SocialPlatform;
  videoId?: string; // Clipped Supabase video UUID
  videoUrl?: string; // Public CDN URL
  videoBuffer?: Buffer | Uint8Array;
  title: string;
  description?: string;
  caption?: string; // Alias / platform-specific text
  tags?: string[];
  coverUrl?: string;
  privacy?: VideoPrivacy;
  scheduledAt?: string; // ISO 8601 string
  isDryRun?: boolean; // Defaults to true
  credentials?: SocialCredentials;
  metadata?: Record<string, any>;
  extraMetadata?: Record<string, any>;
}

// Alias for compatibility
export type PublishVideoRequest = PublishRequest;

export interface PublishResponse {
  success: boolean;
  platform: SocialPlatform | string;
  platformVideoId: string;
  publishedUrl: string;
  isDryRun: boolean;
  publishedAt: string;
  status: PublishStatus;
  logs: string[];
  metadata?: Record<string, any>;
  error?: string;
}

// Alias for compatibility
export type PublishVideoResponse = PublishResponse;

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: string;
  tokenType?: string;
  scope?: string;
  platformUserId?: string;
  extra?: Record<string, any>;
}

// Alias for compatibility
export type OAuthTokenResponse = OAuthToken;

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  state?: string;
  scopes?: string[];
}

export interface RateLimitConfig {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number, delayMs: number) => void;
}

// Alias for compatibility
export type RetryOptions = RateLimitConfig;

export interface ISocialPublisher {
  readonly platform: SocialPlatform;
  getAuthUrl(config: OAuthConfig): string;
  exchangeCode(code: string, config: OAuthConfig): Promise<OAuthToken>;
  refreshToken(refreshToken: string, config: OAuthConfig): Promise<OAuthToken>;
  publishVideo(request: PublishRequest): Promise<PublishResponse>;
  checkStatus(platformVideoId: string, credentials?: SocialCredentials): Promise<PublishResponse>;
}

// ==========================================
// Custom Error Hierarchy
// ==========================================

export class PublishingError extends Error {
  public readonly platform?: SocialPlatform | string;
  public readonly statusCode?: number;
  public readonly details?: any;

  constructor(message: string, platform?: SocialPlatform | string, statusCode?: number, details?: any) {
    super(message);
    this.name = 'PublishingError';
    this.platform = platform;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends PublishingError {
  constructor(message: string, platform?: SocialPlatform | string, details?: any) {
    super(message, platform, 400, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RateLimitError extends PublishingError {
  public readonly retryAfterMs?: number;

  constructor(message: string, platform?: SocialPlatform | string, retryAfterMs?: number, details?: any) {
    super(message, platform, 429, details);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TokenExpiredError extends PublishingError {
  constructor(message: string, platform?: SocialPlatform | string, details?: any) {
    super(message, platform, 401, details);
    this.name = 'TokenExpiredError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class YouTubePublishError extends PublishingError {
  constructor(message: string, statusCode?: number, details?: any) {
    super(message, 'youtube', statusCode, details);
    this.name = 'YouTubePublishError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class YouTubeQuotaExceededError extends YouTubePublishError {
  constructor(message?: string, details?: any) {
    super(
      message ||
        'Daily quota of 10,000 units exceeded (1,600 units required for video upload). Resets at 00:00 Pacific Time.',
      403,
      details
    );
    this.name = 'YouTubeQuotaExceededError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InstagramPublishError extends PublishingError {
  constructor(message: string, statusCode?: number, details?: any) {
    super(message, 'instagram', statusCode, details);
    this.name = 'InstagramPublishError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InstagramRateLimitError extends InstagramPublishError {
  constructor(message?: string, details?: any) {
    super(
      message || 'Account publishing limit of 50 posts per 24 hours reached.',
      429,
      details
    );
    this.name = 'InstagramRateLimitError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TikTokPublishError extends PublishingError {
  constructor(message: string, statusCode?: number, details?: any) {
    super(message, 'tiktok', statusCode, details);
    this.name = 'TikTokPublishError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
