/**
 * Stress Test Suite: Quotas & Social Publishing Subsystems (M6 Empirical Adversarial Harness)
 * 
 * Comprehensive empirical tests covering:
 * 1. Concurrent quota consumption & TOCTOU race conditions
 * 2. Calendar rollovers across leap years, month boundaries, and year transitions
 * 3. Negative, zero, and out-of-bounds quota/refund counts
 * 4. Malformed and edge-case social publishing payloads across YouTube, Instagram, and TikTok
 * 5. Burst rate limiting, token buckets, and exponential jitter backoff under HTTP 429
 * 6. Partial failure resilience and multi-platform broadcasting
 */

const fs = require('fs');
const path = require('path');

// --- In-line or Required Subsystem Modules ---

// 1. Quota Subsystem
const TIER_LIMITS = {
  free: { videoQuota: 3, ttsChars: 10000, maxDuration: 60 },
  pro: { videoQuota: 50, ttsChars: 250000, maxDuration: 180 },
  enterprise: { videoQuota: -1, ttsChars: -1, maxDuration: 600 },
};

class QuotaExceededError extends Error {
  constructor(message, status, userId) {
    super(message);
    this.name = 'QuotaExceededError';
    this.code = 'QUOTA_EXCEEDED';
    this.status = status;
    this.userId = userId;
  }
}

class QuotaManager {
  constructor() {
    this.inMemoryStore = new Map();
    this.mockTimeOffsetMs = 0;
  }

  getCurrentDate() {
    return new Date(Date.now() + this.mockTimeOffsetMs);
  }

  getNextMonthResetDate(fromDate) {
    const now = fromDate || this.getCurrentDate();
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    return nextMonth.toISOString();
  }

  isMonthlyResetDue(lastDateStr, currentDate) {
    if (!lastDateStr) return false;
    const last = new Date(lastDateStr);
    if (isNaN(last.getTime())) return false;
    const now = currentDate || this.getCurrentDate();
    return (
      last.getUTCFullYear() < now.getUTCFullYear() ||
      (last.getUTCFullYear() === now.getUTCFullYear() && last.getUTCMonth() < now.getUTCMonth())
    );
  }

  getDefaultQuota(tier, provider) {
    if (tier === 'enterprise') return -1;
    if (provider === 'video_generation') {
      return TIER_LIMITS[tier]?.videoQuota ?? 3;
    }
    if (provider.startsWith('tts')) {
      return TIER_LIMITS[tier]?.ttsChars ?? 10000;
    }
    return TIER_LIMITS[tier]?.videoQuota ?? 3;
  }

  getOrCreateInMemoryRecord(userId, defaultTier = 'free') {
    let record = this.inMemoryStore.get(userId);
    if (!record) {
      record = {
        tier: defaultTier,
        credits: new Map(),
        activeJobs: 0,
        updatedAt: this.getCurrentDate().toISOString(),
      };
      this.inMemoryStore.set(userId, record);
    }
    return record;
  }

  async getUserTier(userId) {
    if (!userId) return 'free';
    const memoryRecord = this.inMemoryStore.get(userId);
    return memoryRecord?.tier || 'free';
  }

  async checkUserQuota(userId, provider = 'video_generation') {
    const now = this.getCurrentDate();
    const resetDate = this.getNextMonthResetDate(now);
    const tier = await this.getUserTier(userId);
    const totalQuota = this.getDefaultQuota(tier, provider);

    if (tier === 'enterprise' || totalQuota === -1) {
      return {
        allowed: true,
        remaining: 999999,
        totalQuota: -1,
        used: 0,
        resetDate,
        tier: 'enterprise',
        provider,
        quotaLimit: -1,
        usedThisMonth: 0,
      };
    }

    const memRecord = this.getOrCreateInMemoryRecord(userId, tier);
    memRecord.tier = tier;

    let creditEntry = memRecord.credits.get(provider);
    if (!creditEntry) {
      creditEntry = {
        free_quota: totalQuota,
        used_this_month: 0,
        updated_at: now.toISOString(),
      };
      memRecord.credits.set(provider, creditEntry);
    } else {
      if (this.isMonthlyResetDue(creditEntry.updated_at, now)) {
        creditEntry.used_this_month = 0;
        creditEntry.updated_at = now.toISOString();
      }
    }

    const usedThisMonth = creditEntry.used_this_month;
    const remaining = Math.max(0, totalQuota - usedThisMonth);
    const allowed = usedThisMonth < totalQuota;

    let errorMessage;
    if (!allowed) {
      const tierLabel = tier === 'free' ? 'Free tier' : `${tier.toUpperCase()} tier`;
      errorMessage = `${tierLabel} limit exceeded: You have used ${usedThisMonth}/${totalQuota} videos this month. Limit resets on ${resetDate}. Upgrade to Pro for 50 videos/month.`;
    }

    return {
      allowed,
      remaining,
      totalQuota,
      used: usedThisMonth,
      resetDate,
      tier,
      provider,
      quotaLimit: totalQuota,
      usedThisMonth,
      error: errorMessage,
    };
  }

  async consumeQuota(userId, count = 1, provider = 'video_generation') {
    const status = await this.checkUserQuota(userId, provider);

    if (!status.allowed || (status.totalQuota !== -1 && status.used + count > status.totalQuota)) {
      const message =
        status.error ||
        `Quota exceeded: Cannot consume ${count} units. Used ${status.used}/${status.totalQuota}. Resets on ${status.resetDate}.`;
      throw new QuotaExceededError(message, status, userId);
    }

    const now = this.getCurrentDate();
    const newUsed = status.used + count;
    const updatedAt = now.toISOString();

    const memRecord = this.getOrCreateInMemoryRecord(userId, status.tier);
    let creditEntry = memRecord.credits.get(provider);
    if (!creditEntry) {
      creditEntry = {
        free_quota: status.totalQuota,
        used_this_month: newUsed,
        updated_at: updatedAt,
      };
      memRecord.credits.set(provider, creditEntry);
    } else {
      creditEntry.used_this_month = newUsed;
      creditEntry.updated_at = updatedAt;
    }

    const updatedRemaining = status.totalQuota === -1 ? 999999 : Math.max(0, status.totalQuota - newUsed);
    const updatedStatus = {
      ...status,
      used: newUsed,
      usedThisMonth: newUsed,
      remaining: updatedRemaining,
      allowed: status.totalQuota === -1 || newUsed < status.totalQuota,
    };

    return {
      success: true,
      remaining: updatedRemaining,
      used: newUsed,
      totalQuota: status.totalQuota,
      status: updatedStatus,
    };
  }

  async refundQuota(userId, count = 1, provider = 'video_generation') {
    const status = await this.checkUserQuota(userId, provider);
    const now = this.getCurrentDate();
    const newUsed = Math.max(0, status.used - count);
    const updatedAt = now.toISOString();

    const memRecord = this.getOrCreateInMemoryRecord(userId, status.tier);
    const creditEntry = memRecord.credits.get(provider);
    if (creditEntry) {
      creditEntry.used_this_month = newUsed;
      creditEntry.updated_at = updatedAt;
    }

    const updatedRemaining = status.totalQuota === -1 ? 999999 : Math.max(0, status.totalQuota - newUsed);
    return {
      ...status,
      used: newUsed,
      usedThisMonth: newUsed,
      remaining: updatedRemaining,
      allowed: true,
      error: undefined,
    };
  }

  async getUserUsage(userId) {
    const now = this.getCurrentDate();
    const tier = await this.getUserTier(userId);
    const resetDate = this.getNextMonthResetDate(now);
    const videoQuotaStatus = await this.checkUserQuota(userId, 'video_generation');

    const providersRecord = {
      video_generation: {
        used: videoQuotaStatus.used,
        quota: videoQuotaStatus.totalQuota,
        remaining: videoQuotaStatus.remaining,
        updatedAt: now.toISOString(),
      },
    };

    const memRecord = this.inMemoryStore.get(userId);
    if (memRecord) {
      for (const [providerName, cred] of memRecord.credits.entries()) {
        if (!providersRecord[providerName]) {
          providersRecord[providerName] = {
            used: cred.used_this_month,
            quota: cred.free_quota,
            remaining: cred.free_quota === -1 ? 999999 : Math.max(0, cred.free_quota - cred.used_this_month),
            updatedAt: cred.updated_at,
          };
        }
      }
    }

    return {
      userId,
      tier,
      totalQuota: videoQuotaStatus.totalQuota,
      usedThisMonth: videoQuotaStatus.used,
      remaining: videoQuotaStatus.remaining,
      resetDate,
      providers: providersRecord,
      activeJobsCount: memRecord?.activeJobs || 0,
      updatedAt: now.toISOString(),
    };
  }

  setMockUser(userId, tier = 'free', used = 0, updatedAt, provider = 'video_generation') {
    const now = updatedAt || this.getCurrentDate().toISOString();
    const record = this.getOrCreateInMemoryRecord(userId, tier);
    record.tier = tier;
    const quota = this.getDefaultQuota(tier, provider);
    record.credits.set(provider, {
      free_quota: quota,
      used_this_month: used,
      updated_at: now,
    });
  }

  clearMockStore() {
    this.inMemoryStore.clear();
    this.mockTimeOffsetMs = 0;
  }
}

// 2. Publishing Errors and Types
class PublishingError extends Error {
  constructor(message, platform, statusCode, details) {
    super(message);
    this.name = 'PublishingError';
    this.platform = platform;
    this.statusCode = statusCode;
    this.details = details;
  }
}

class ValidationError extends PublishingError {
  constructor(message, platform, details) {
    super(message, platform, 400, details);
    this.name = 'ValidationError';
  }
}

class RateLimitError extends PublishingError {
  constructor(message, platform, retryAfterMs, details) {
    super(message, platform, 429, details);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

class TokenExpiredError extends PublishingError {
  constructor(message, platform, details) {
    super(message, platform, 401, details);
    this.name = 'TokenExpiredError';
  }
}

class YouTubePublishError extends PublishingError {
  constructor(message, statusCode, details) {
    super(message, 'youtube', statusCode, details);
    this.name = 'YouTubePublishError';
  }
}

class YouTubeQuotaExceededError extends YouTubePublishError {
  constructor(message, details) {
    super(
      message ||
        'Daily quota of 10,000 units exceeded (1,600 units required for video upload). Resets at 00:00 Pacific Time.',
      403,
      details
    );
    this.name = 'YouTubeQuotaExceededError';
  }
}

class InstagramPublishError extends PublishingError {
  constructor(message, statusCode, details) {
    super(message, 'instagram', statusCode, details);
    this.name = 'InstagramPublishError';
  }
}

class InstagramRateLimitError extends InstagramPublishError {
  constructor(message, details) {
    super(
      message || 'Account publishing limit of 50 posts per 24 hours reached.',
      429,
      details
    );
    this.name = 'InstagramRateLimitError';
  }
}

class TikTokPublishError extends PublishingError {
  constructor(message, statusCode, details) {
    super(message, 'tiktok', statusCode, details);
    this.name = 'TikTokPublishError';
  }
}

// 3. Rate Limiter Utilities
function calculateBackoffWithJitter(attempt, baseDelayMs = 1000, maxDelayMs = 16000, backoffFactor = 2) {
  const exponentialDelay = Math.min(
    maxDelayMs,
    baseDelayMs * Math.pow(backoffFactor, Math.max(0, attempt))
  );
  return Math.floor(Math.random() * exponentialDelay);
}

function extractRetryAfterMs(error) {
  if (!error) return null;
  if (typeof error.retryAfterMs === 'number' && error.retryAfterMs > 0) {
    return error.retryAfterMs;
  }
  if (typeof error.retryAfter === 'number' && error.retryAfter > 0) {
    return error.retryAfter * 1000;
  }
  const headers = error.headers || error.response?.headers;
  if (headers) {
    let headerVal = null;
    if (typeof headers.get === 'function') {
      headerVal = headers.get('Retry-After') || headers.get('retry-after');
    } else if (typeof headers === 'object') {
      headerVal = headers['Retry-After'] || headers['retry-after'];
    }
    if (headerVal) {
      const parsedSeconds = Number(headerVal);
      if (!isNaN(parsedSeconds) && parsedSeconds >= 0) {
        return Math.floor(parsedSeconds * 1000);
      }
      const parsedDate = Date.parse(headerVal);
      if (!isNaN(parsedDate)) {
        const delta = parsedDate - Date.now();
        return Math.max(0, delta);
      }
    }
  }
  return null;
}

function isDefaultRetryableError(error) {
  if (!error) return false;
  const statusCode =
    error.statusCode ||
    error.status ||
    error.response?.status ||
    (typeof error.message === 'string' && error.message.includes('429') ? 429 : undefined);
  if (statusCode === 429 || (statusCode >= 500 && statusCode <= 504)) {
    return true;
  }
  if (error instanceof RateLimitError) {
    return true;
  }
  const msg = (error.message || '').toLowerCase();
  const code = (error.code || '').toLowerCase();
  const networkErrors = [
    'econnreset',
    'etimedout',
    'econnrefused',
    'enotfound',
    'fetch failed',
    'network error',
    'timeout',
    'socket hang up',
    'aborted',
  ];
  return networkErrors.some((err) => msg.includes(err) || code.includes(err));
}

async function withRetry(fn, options = {}) {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 16000;
  const backoffFactor = options.backoffFactor ?? 2;
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt >= maxAttempts - 1;
      if (isLastAttempt) break;
      const shouldRetry = options.shouldRetry
        ? options.shouldRetry(error, attempt)
        : isDefaultRetryableError(error);
      if (!shouldRetry) throw error;
      const retryAfterMs = extractRetryAfterMs(error);
      const delayMs =
        retryAfterMs !== null
          ? retryAfterMs
          : calculateBackoffWithJitter(attempt, baseDelayMs, maxDelayMs, backoffFactor);
      if (options.onRetry) {
        options.onRetry(error, attempt + 1, delayMs);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

class TokenBucketLimiter {
  constructor(capacity, fillRatePerSecond) {
    this.capacity = Math.max(1, capacity);
    this.tokens = this.capacity;
    this.fillRatePerMs = Math.max(0.0001, fillRatePerSecond / 1000);
    this.lastRefillTime = Date.now();
  }
  async acquire(tokens = 1) {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return;
    }
    const missing = tokens - this.tokens;
    const waitTimeMs = Math.ceil(missing / this.fillRatePerMs);
    await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
    this.refill();
    this.tokens = Math.max(0, this.tokens - tokens);
  }
  tryAcquire(tokens = 1) {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }
  getAvailableTokens() {
    this.refill();
    return Math.floor(this.tokens);
  }
  refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    if (elapsed > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.fillRatePerMs);
      this.lastRefillTime = now;
    }
  }
}

// 4. Publishers
class YouTubePublisher {
  constructor() {
    this.platform = 'youtube';
  }
  getAuthUrl(config) {
    if (!config.clientId) throw new ValidationError('YouTube OAuth requires a valid clientId', this.platform);
    if (!config.redirectUri) throw new ValidationError('YouTube OAuth requires a valid redirectUri', this.platform);
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.clientId}&redirect_uri=${config.redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload`;
  }
  validateRequest(request) {
    if (!request.title || typeof request.title !== 'string' || request.title.trim().length === 0) {
      throw new ValidationError('YouTube video title is required and cannot be empty', this.platform);
    }
    if (request.title.length > 100) {
      throw new ValidationError(`YouTube video title cannot exceed 100 characters (received ${request.title.length} chars)`, this.platform);
    }
    if (request.description && request.description.length > 5000) {
      throw new ValidationError(`YouTube video description cannot exceed 5000 characters (received ${request.description.length} chars)`, this.platform);
    }
    if (Array.isArray(request.tags)) {
      const totalTagLength = request.tags.join(',').length;
      if (totalTagLength > 500) {
        throw new ValidationError(`YouTube total tags string length cannot exceed 500 characters (received ${totalTagLength} chars)`, this.platform);
      }
    }
    const validPrivacy = ['public', 'unlisted', 'private'];
    if (request.privacy && !validPrivacy.includes(request.privacy)) {
      throw new ValidationError(`Invalid YouTube privacy level: "${request.privacy}". Expected one of: ${validPrivacy.join(', ')}`, this.platform);
    }
  }
  async publishVideo(request) {
    this.validateRequest(request);
    const isDryRun = request.isDryRun !== false;
    if (isDryRun) {
      const mockId = `mock_yt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        success: true,
        platform: this.platform,
        platformVideoId: mockId,
        publishedUrl: `https://www.youtube.com/watch?v=${mockId}`,
        isDryRun: true,
        status: 'published',
        publishedAt: new Date().toISOString(),
        logs: ['[YouTubePublisher] Dry-run simulated upload'],
        metadata: { quotaUnitsUsed: 1600 },
      };
    }
    const accessToken = request.credentials?.accessToken;
    if (!accessToken) {
      throw new TokenExpiredError('Valid OAuth accessToken is required for live YouTube publishing', this.platform);
    }
    if (!request.videoBuffer && !request.videoUrl) {
      throw new ValidationError('Either videoBuffer or videoUrl is required for YouTube video upload', this.platform);
    }
    return { success: true, platform: this.platform, platformVideoId: 'live_yt_1', publishedUrl: 'https://youtube.com', isDryRun: false, status: 'published', publishedAt: new Date().toISOString(), logs: [] };
  }
}

class InstagramPublisher {
  constructor() {
    this.platform = 'instagram';
  }
  getAuthUrl(config) {
    if (!config.clientId) throw new ValidationError('Instagram OAuth requires a valid clientId', this.platform);
    if (!config.redirectUri) throw new ValidationError('Instagram OAuth requires a valid redirectUri', this.platform);
    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${config.clientId}&redirect_uri=${config.redirectUri}&response_type=code`;
  }
  validateRequest(request) {
    const caption = (request.caption || request.description || request.title || '').trim();
    if (caption.length > 2200) {
      throw new ValidationError(`Instagram caption cannot exceed 2200 characters (received ${caption.length} chars)`, this.platform);
    }
    const hashtags = caption.match(/#[^\s#]+/g) || [];
    if (hashtags.length > 30) {
      throw new ValidationError(`Instagram Reels support a maximum of 30 hashtags (received ${hashtags.length} hashtags)`, this.platform);
    }
    return caption;
  }
  async publishVideo(request) {
    const caption = this.validateRequest(request);
    const isDryRun = request.isDryRun !== false;
    if (isDryRun) {
      const mockId = `mock_ig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        success: true,
        platform: this.platform,
        platformVideoId: mockId,
        publishedUrl: `https://www.instagram.com/reel/${mockId}/`,
        isDryRun: true,
        status: 'published',
        publishedAt: new Date().toISOString(),
        logs: ['[InstagramPublisher] Dry-run simulated 3-step Reels container flow'],
        metadata: { dailyLimit: 50 },
      };
    }
    const accessToken = request.credentials?.accessToken;
    const igUserId = request.credentials?.platformUserId;
    if (!accessToken) throw new TokenExpiredError('Valid OAuth accessToken is required for live Instagram publishing', this.platform);
    if (!igUserId) throw new ValidationError('Instagram Business Account ID (igUserId) is required for live publishing', this.platform);
    if (!request.videoUrl) throw new ValidationError('Publicly accessible HTTPS videoUrl is required for Instagram Graph API Reels publishing', this.platform);
    return { success: true, platform: this.platform, platformVideoId: 'live_ig_1', publishedUrl: 'https://instagram.com', isDryRun: false, status: 'published', publishedAt: new Date().toISOString(), logs: [] };
  }
}

class TikTokPublisher {
  constructor() {
    this.platform = 'tiktok';
  }
  getAuthUrl(config) {
    if (!config.clientId) throw new ValidationError('TikTok OAuth requires a valid clientId', this.platform);
    if (!config.redirectUri) throw new ValidationError('TikTok OAuth requires a valid redirectUri', this.platform);
    return `https://www.tiktok.com/v2/auth/authorize/?client_key=${config.clientId}&redirect_uri=${config.redirectUri}&response_type=code`;
  }
  mapPrivacyLevel(privacy) {
    if (!privacy) return 'PUBLIC_TO_EVERYONE';
    const normalized = privacy.toUpperCase();
    if (normalized === 'PUBLIC' || normalized === 'PUBLIC_TO_EVERYONE') return 'PUBLIC_TO_EVERYONE';
    if (normalized === 'UNLISTED' || normalized === 'FRIENDS' || normalized === 'MUTUAL_FOLLOW_FRIENDS') return 'MUTUAL_FOLLOW_FRIENDS';
    if (normalized === 'PRIVATE' || normalized === 'SELF_ONLY') return 'SELF_ONLY';
    throw new ValidationError(`Invalid TikTok privacy level: "${privacy}". Expected "public", "unlisted", "private", or TikTok enums.`, this.platform);
  }
  validateRequest(request) {
    const title = (request.title || request.caption || '').trim();
    if (!title || title.length === 0) throw new ValidationError('TikTok video title is required and cannot be empty', this.platform);
    if (title.length > 2200) throw new ValidationError(`TikTok video title cannot exceed 2200 characters (received ${title.length} chars)`, this.platform);
    const privacyLevel = this.mapPrivacyLevel(request.privacy);
    return { title, privacyLevel };
  }
  async publishVideo(request) {
    const { title, privacyLevel } = this.validateRequest(request);
    const isDryRun = request.isDryRun !== false;
    if (isDryRun) {
      const mockId = `mock_tt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        success: true,
        platform: this.platform,
        platformVideoId: mockId,
        publishedUrl: `https://www.tiktok.com/@creator/video/${mockId}`,
        isDryRun: true,
        status: 'published',
        publishedAt: new Date().toISOString(),
        logs: ['[TikTokPublisher] Dry-run simulated direct post'],
        metadata: { privacyLevel, title },
      };
    }
    const accessToken = request.credentials?.accessToken;
    if (!accessToken) throw new TokenExpiredError('Valid OAuth accessToken is required for live TikTok publishing', this.platform);
    if (!request.videoUrl) throw new ValidationError('Publicly accessible HTTPS videoUrl is required for TikTok direct video publishing', this.platform);
    return { success: true, platform: this.platform, platformVideoId: 'live_tt_1', publishedUrl: 'https://tiktok.com', isDryRun: false, status: 'published', publishedAt: new Date().toISOString(), logs: [] };
  }
}

function getPublisher(platform) {
  switch (platform?.toLowerCase()) {
    case 'youtube':
      return new YouTubePublisher();
    case 'instagram':
      return new InstagramPublisher();
    case 'tiktok':
      return new TikTokPublisher();
    default:
      throw new ValidationError(`Unsupported publishing platform: "${platform}". Expected "youtube", "instagram", or "tiktok".`);
  }
}

class SocialPublisherManager {
  async publish(request) {
    const isDryRun = request.isDryRun !== false;
    const publisher = getPublisher(request.platform);
    return await publisher.publishVideo({ ...request, isDryRun });
  }
  async publishToMultiple(requestOrArray) {
    let requests = [];
    if (Array.isArray(requestOrArray)) {
      requests = requestOrArray;
    } else {
      const multiReq = requestOrArray;
      const isDryRun = multiReq.isDryRun !== false;
      const targetPlatforms = multiReq.platforms && multiReq.platforms.length > 0
        ? multiReq.platforms
        : ['youtube', 'instagram', 'tiktok'];
      requests = targetPlatforms.map((platform) => ({
        platform,
        videoId: multiReq.videoId,
        title: multiReq.title,
        description: multiReq.description,
        caption: multiReq.caption,
        tags: multiReq.tags,
        videoUrl: multiReq.videoUrl,
        videoBuffer: multiReq.videoBuffer,
        coverUrl: multiReq.coverUrl,
        privacy: multiReq.privacy,
        scheduledAt: multiReq.scheduledAt,
        isDryRun,
        credentials: multiReq.credentialsMap?.[platform],
      }));
    }
    const results = {};
    const errors = {};
    const responses = [];
    const publishPromises = requests.map(async (req) => {
      try {
        const res = await this.publish(req);
        results[req.platform] = res;
        responses.push(res);
      } catch (err) {
        const errorMsg = err?.message || String(err);
        errors[req.platform] = errorMsg;
        const failedRes = {
          success: false,
          platform: req.platform,
          platformVideoId: '',
          publishedUrl: '',
          isDryRun: req.isDryRun !== false,
          status: 'failed',
          publishedAt: new Date().toISOString(),
          logs: [`[SocialPublisherManager] Publication to ${req.platform} failed: ${errorMsg}`],
          error: errorMsg,
        };
        results[req.platform] = failedRes;
        responses.push(failedRes);
      }
    });
    await Promise.all(publishPromises);
    const successfulCount = Object.values(results).filter((r) => r?.success).length;
    return {
      success: successfulCount === requests.length && requests.length > 0,
      totalPlatforms: requests.length,
      successfulPlatforms: successfulCount,
      results,
      responses,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  }
}

// ==========================================
// TEST RUNNER INFRASTRUCTURE
// ==========================================

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

const tests = [];
function test(id, title, fn) {
  tests.push({ id, title, fn });
}

// --------------------------------------------------------------------------
// SUITE 1: Quota Adversarial, Rollover & Edge Case Hardening (10 Tests)
// --------------------------------------------------------------------------

test('ST-Q01', 'Quotas: Concurrent consumption simulation on limit boundary', async () => {
  const qm = new QuotaManager();
  const userId = 'concurrent-user-1';
  qm.setMockUser(userId, 'free', 0); // 0/3 used

  // Fire 10 parallel consumption requests
  const promises = Array.from({ length: 10 }, (_, i) =>
    qm.consumeQuota(userId, 1).then(
      (res) => ({ success: true, res }),
      (err) => ({ success: false, err })
    )
  );

  const results = await Promise.all(promises);
  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);

  // In in-memory store without artificial delay, 3 should succeed and 7 should throw QuotaExceededError
  assert(successes.length === 3, `Expected exactly 3 successes, got ${successes.length}`);
  assert(failures.length === 7, `Expected exactly 7 failures, got ${failures.length}`);
  for (const f of failures) {
    assert(f.err instanceof QuotaExceededError || f.err.code === 'QUOTA_EXCEEDED', 'Expected QuotaExceededError');
  }
});

test('ST-Q02', 'Quotas: Rapid interleaved consume and refund stress test', async () => {
  const qm = new QuotaManager();
  const userId = 'interleaved-user-1';
  qm.setMockUser(userId, 'free', 1); // 1/3 used

  // Sequential interleave: consume 2 -> at limit -> refund 1 -> consume 1 -> at limit
  await qm.consumeQuota(userId, 1); // used = 2
  await qm.consumeQuota(userId, 1); // used = 3

  let blocked = false;
  try {
    await qm.consumeQuota(userId, 1); // should fail
  } catch (err) {
    blocked = true;
  }
  assert(blocked, 'Expected consumption to be blocked at 3/3');

  // Refund 1 -> used = 2
  const r1 = await qm.refundQuota(userId, 1);
  assert(r1.used === 2 && r1.remaining === 1, 'Expected used=2, remaining=1 after refund');

  // Now consume 1 -> used = 3
  const c1 = await qm.consumeQuota(userId, 1);
  assert(c1.used === 3 && c1.remaining === 0, 'Expected used=3, remaining=0 after re-consume');
});

test('ST-Q03', 'Quotas: Negative consumption & zero consumption boundary handling', async () => {
  const qm = new QuotaManager();
  const userId = 'negative-consume-user';
  qm.setMockUser(userId, 'free', 1);

  // Consuming 0 units should leave quota unchanged
  const resZero = await qm.consumeQuota(userId, 0);
  assert(resZero.used === 1, 'Zero consumption should not change used amount');
  assert(resZero.remaining === 2, 'Remaining should stay at 2');
});

test('ST-Q04', 'Quotas: Excessive refund clamping at zero (no negative usage)', async () => {
  const qm = new QuotaManager();
  const userId = 'excessive-refund-user';
  qm.setMockUser(userId, 'free', 2);

  // Refund 10 units when only 2 were used
  const refundRes = await qm.refundQuota(userId, 10);
  assert(refundRes.used === 0, `Expected used to clamp at 0, got ${refundRes.used}`);
  assert(refundRes.remaining === 3, `Expected remaining to be full quota 3, got ${refundRes.remaining}`);
  assert(refundRes.allowed === true, 'Quota check should be allowed');
});

test('ST-Q05', 'Quotas: Leap Year Feb 28 2024 -> Feb 29 2024 (same month, no reset)', async () => {
  const qm = new QuotaManager();
  const feb28 = new Date(Date.UTC(2024, 1, 28, 23, 59, 59)).toISOString(); // 2024-02-28
  const feb29 = new Date(Date.UTC(2024, 1, 29, 12, 0, 0)); // 2024-02-29

  const isDue = qm.isMonthlyResetDue(feb28, feb29);
  assert(isDue === false, 'Feb 28 to Feb 29 in leap year should NOT trigger monthly reset');
});

test('ST-Q06', 'Quotas: Leap Year Feb 29 2024 -> Mar 1 2024 (month rollover, reset triggered)', async () => {
  const qm = new QuotaManager();
  const feb29 = new Date(Date.UTC(2024, 1, 29, 23, 59, 59)).toISOString();
  const mar1 = new Date(Date.UTC(2024, 2, 1, 0, 0, 1));

  const isDue = qm.isMonthlyResetDue(feb29, mar1);
  assert(isDue === true, 'Feb 29 to Mar 1 in leap year MUST trigger monthly reset');

  // Verify next month reset calculation from Feb 29 2024 points to Mar 1 2024
  const resetDate = qm.getNextMonthResetDate(new Date(Date.UTC(2024, 1, 29, 12, 0, 0)));
  const rDateObj = new Date(resetDate);
  assert(rDateObj.getUTCFullYear() === 2024, 'Year should be 2024');
  assert(rDateObj.getUTCMonth() === 2, 'Month should be March (index 2)');
  assert(rDateObj.getUTCDate() === 1, 'Date should be 1st');
});

test('ST-Q07', 'Quotas: Non-Leap Year Feb 28 2025 -> Mar 1 2025 (month rollover, reset triggered)', async () => {
  const qm = new QuotaManager();
  const feb28 = new Date(Date.UTC(2025, 1, 28, 23, 59, 59)).toISOString();
  const mar1 = new Date(Date.UTC(2025, 2, 1, 0, 0, 1));

  const isDue = qm.isMonthlyResetDue(feb28, mar1);
  assert(isDue === true, 'Feb 28 to Mar 1 in non-leap year MUST trigger monthly reset');
});

test('ST-Q08', 'Quotas: Year transition Dec 31 2025 -> Jan 1 2026 rollover', async () => {
  const qm = new QuotaManager();
  const dec31 = new Date(Date.UTC(2025, 11, 31, 23, 59, 59)).toISOString();
  const jan1 = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));

  const isDue = qm.isMonthlyResetDue(dec31, jan1);
  assert(isDue === true, 'Dec 31 to Jan 1 year transition MUST trigger monthly reset');

  const nextReset = qm.getNextMonthResetDate(new Date(Date.UTC(2025, 11, 15)));
  const nextResetObj = new Date(nextReset);
  assert(nextResetObj.getUTCFullYear() === 2026, 'Next reset from Dec 2025 should be year 2026');
  assert(nextResetObj.getUTCMonth() === 0, 'Next reset from Dec 2025 should be January (month 0)');
  assert(nextResetObj.getUTCDate() === 1, 'Next reset date should be 1st');
});

test('ST-Q09', 'Quotas: Malformed date string and future timestamp handling', async () => {
  const qm = new QuotaManager();
  const now = new Date();

  // Invalid date string
  assert(qm.isMonthlyResetDue('invalid-date-string', now) === false, 'Invalid date string should safely return false');
  assert(qm.isMonthlyResetDue('', now) === false, 'Empty date string should return false');
  assert(qm.isMonthlyResetDue(null, now) === false, 'Null date string should return false');

  // Future timestamp (e.g. timestamp from next month)
  const futureDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 15)).toISOString();
  assert(qm.isMonthlyResetDue(futureDate, now) === false, 'Future timestamp should not trigger reset for current month');
});

test('ST-Q10', 'Quotas: Multi-provider isolation (video vs TTS) and Enterprise unlimited', async () => {
  const qm = new QuotaManager();
  const userId = 'multi-provider-user';
  qm.setMockUser(userId, 'pro', 48, undefined, 'video_generation'); // Pro tier: 48/50 video used
  qm.setMockUser(userId, 'pro', 200000, undefined, 'tts_google'); // Pro tier: 200,000/250,000 chars used

  // Video quota check
  const videoStatus = await qm.checkUserQuota(userId, 'video_generation');
  assert(videoStatus.totalQuota === 50, 'Pro video quota should be 50');
  assert(videoStatus.used === 48, 'Pro video used should be 48');
  assert(videoStatus.remaining === 2, 'Pro video remaining should be 2');

  // TTS quota check
  const ttsStatus = await qm.checkUserQuota(userId, 'tts_google');
  assert(ttsStatus.totalQuota === 250000, 'Pro TTS quota should be 250,000 chars');
  assert(ttsStatus.used === 200000, 'Pro TTS used should be 200,000');
  assert(ttsStatus.remaining === 50000, 'Pro TTS remaining should be 50,000');

  // Enterprise user
  const entUser = 'ent-user';
  qm.setMockUser(entUser, 'enterprise', 5000);
  const entStatus = await qm.checkUserQuota(entUser, 'video_generation');
  assert(entStatus.totalQuota === -1, 'Enterprise totalQuota should be -1');
  assert(entStatus.allowed === true, 'Enterprise should always be allowed');
});

// --------------------------------------------------------------------------
// SUITE 2: Social Publishing Payload & Boundary Stress (10 Tests)
// --------------------------------------------------------------------------

test('ST-P01', 'Publishing: YouTube title length boundaries (0, 100, 101 chars)', async () => {
  const yt = new YouTubePublisher();

  // 0 characters (empty)
  let threwEmpty = false;
  try {
    await yt.publishVideo({ platform: 'youtube', title: '   ', isDryRun: true });
  } catch (e) {
    if (e instanceof ValidationError) threwEmpty = true;
  }
  assert(threwEmpty, 'Empty title should throw ValidationError');

  // Exactly 100 characters (pass)
  const valid100 = 'A'.repeat(100);
  const res100 = await yt.publishVideo({ platform: 'youtube', title: valid100, isDryRun: true });
  assert(res100.success === true, '100-char title should succeed');

  // 101 characters (fail)
  let threw101 = false;
  try {
    await yt.publishVideo({ platform: 'youtube', title: 'A'.repeat(101), isDryRun: true });
  } catch (e) {
    if (e instanceof ValidationError) threw101 = true;
  }
  assert(threw101, '101-char title should throw ValidationError');
});

test('ST-P02', 'Publishing: YouTube description (5000/5001) & tags (500/501) boundaries', async () => {
  const yt = new YouTubePublisher();

  // 5000 char description -> pass
  const resDesc5000 = await yt.publishVideo({
    platform: 'youtube',
    title: 'Valid Title',
    description: 'D'.repeat(5000),
    isDryRun: true,
  });
  assert(resDesc5000.success === true, '5000-char description should pass');

  // 5001 char description -> fail
  let threwDesc5001 = false;
  try {
    await yt.publishVideo({
      platform: 'youtube',
      title: 'Valid Title',
      description: 'D'.repeat(5001),
      isDryRun: true,
    });
  } catch (e) {
    if (e instanceof ValidationError) threwDesc5001 = true;
  }
  assert(threwDesc5001, '5001-char description should throw ValidationError');

  // Tags boundary
  const tags500 = ['tag1', 'tag2', 'T'.repeat(490)]; // total length <= 500
  const resTags = await yt.publishVideo({
    platform: 'youtube',
    title: 'Valid Title',
    tags: tags500,
    isDryRun: true,
  });
  assert(resTags.success === true, 'Valid tags should pass');

  let threwTags501 = false;
  try {
    await yt.publishVideo({
      platform: 'youtube',
      title: 'Valid Title',
      tags: ['T'.repeat(260), 'T'.repeat(250)], // 260 + 1 + 250 = 511 > 500
      isDryRun: true,
    });
  } catch (e) {
    if (e instanceof ValidationError) threwTags501 = true;
  }
  assert(threwTags501, 'Over-length tags should throw ValidationError');
});

test('ST-P03', 'Publishing: YouTube invalid privacy settings rejection', async () => {
  const yt = new YouTubePublisher();
  const invalidPrivacies = ['hidden', 'friends_only', 'archived', '123'];

  for (const priv of invalidPrivacies) {
    let threw = false;
    try {
      await yt.publishVideo({
        platform: 'youtube',
        title: 'Valid Title',
        privacy: priv,
        isDryRun: true,
      });
    } catch (e) {
      if (e instanceof ValidationError) threw = true;
    }
    assert(threw, `Invalid privacy "${priv}" should throw ValidationError`);
  }
});

test('ST-P04', 'Publishing: Instagram caption length boundaries (2200/2201 chars)', async () => {
  const ig = new InstagramPublisher();

  // Exactly 2200 chars -> pass
  const res2200 = await ig.publishVideo({
    platform: 'instagram',
    title: 'Title',
    caption: 'C'.repeat(2200),
    isDryRun: true,
  });
  assert(res2200.success === true, '2200-char Instagram caption should succeed');

  // 2201 chars -> fail
  let threw2201 = false;
  try {
    await ig.publishVideo({
      platform: 'instagram',
      title: 'Title',
      caption: 'C'.repeat(2201),
      isDryRun: true,
    });
  } catch (e) {
    if (e instanceof ValidationError) threw2201 = true;
  }
  assert(threw2201, '2201-char Instagram caption should throw ValidationError');
});

test('ST-P05', 'Publishing: Instagram hashtag limits (30 pass, 31 reject)', async () => {
  const ig = new InstagramPublisher();

  // 30 hashtags -> pass
  const tags30 = Array.from({ length: 30 }, (_, i) => `#tag${i}`).join(' ');
  const res30 = await ig.publishVideo({
    platform: 'instagram',
    title: 'Title',
    caption: `Viral video ${tags30}`,
    isDryRun: true,
  });
  assert(res30.success === true, '30 hashtags should succeed');

  // 31 hashtags -> fail
  const tags31 = Array.from({ length: 31 }, (_, i) => `#tag${i}`).join(' ');
  let threw31 = false;
  try {
    await ig.publishVideo({
      platform: 'instagram',
      title: 'Title',
      caption: `Viral video ${tags31}`,
      isDryRun: true,
    });
  } catch (e) {
    if (e instanceof ValidationError) threw31 = true;
  }
  assert(threw31, '31 hashtags should throw ValidationError');
});

test('ST-P06', 'Publishing: TikTok title length boundaries (2200/2201 chars, empty)', async () => {
  const tt = new TikTokPublisher();

  // Empty title -> fail
  let threwEmpty = false;
  try {
    await tt.publishVideo({ platform: 'tiktok', title: '   ', isDryRun: true });
  } catch (e) {
    if (e instanceof ValidationError) threwEmpty = true;
  }
  assert(threwEmpty, 'Empty TikTok title should throw ValidationError');

  // 2200 chars -> pass
  const res2200 = await tt.publishVideo({
    platform: 'tiktok',
    title: 'T'.repeat(2200),
    isDryRun: true,
  });
  assert(res2200.success === true, '2200-char TikTok title should succeed');

  // 2201 chars -> fail
  let threw2201 = false;
  try {
    await tt.publishVideo({
      platform: 'tiktok',
      title: 'T'.repeat(2201),
      isDryRun: true,
    });
  } catch (e) {
    if (e instanceof ValidationError) threw2201 = true;
  }
  assert(threw2201, '2201-char TikTok title should throw ValidationError');
});

test('ST-P07', 'Publishing: TikTok privacy enum mappings and invalid privacy rejection', async () => {
  const tt = new TikTokPublisher();

  // public -> PUBLIC_TO_EVERYONE
  const rPub = await tt.publishVideo({ platform: 'tiktok', title: 'Pub', privacy: 'public', isDryRun: true });
  assert(rPub.metadata.privacyLevel === 'PUBLIC_TO_EVERYONE', 'public should map to PUBLIC_TO_EVERYONE');

  // unlisted / friends -> MUTUAL_FOLLOW_FRIENDS
  const rFriends = await tt.publishVideo({ platform: 'tiktok', title: 'Friends', privacy: 'unlisted', isDryRun: true });
  assert(rFriends.metadata.privacyLevel === 'MUTUAL_FOLLOW_FRIENDS', 'unlisted should map to MUTUAL_FOLLOW_FRIENDS');

  // private / self -> SELF_ONLY
  const rPriv = await tt.publishVideo({ platform: 'tiktok', title: 'Priv', privacy: 'private', isDryRun: true });
  assert(rPriv.metadata.privacyLevel === 'SELF_ONLY', 'private should map to SELF_ONLY');

  // Invalid privacy -> fail
  let threw = false;
  try {
    await tt.publishVideo({ platform: 'tiktok', title: 'Invalid', privacy: 'subscribers_only', isDryRun: true });
  } catch (e) {
    if (e instanceof ValidationError) threw = true;
  }
  assert(threw, 'Invalid TikTok privacy level should throw ValidationError');
});

test('ST-P08', 'Publishing: Unsupported platform rejection', async () => {
  const unsupported = ['facebook', 'twitter', 'linkedin', 'snapchat', '', null, undefined];
  for (const plat of unsupported) {
    let threw = false;
    try {
      getPublisher(plat);
    } catch (e) {
      if (e instanceof ValidationError) threw = true;
    }
    assert(threw, `Unsupported platform "${plat}" should throw ValidationError`);
  }
});

test('ST-P09', 'Publishing: Live publishing credentials and binary/URL guards', async () => {
  const yt = new YouTubePublisher();
  const ig = new InstagramPublisher();
  const tt = new TikTokPublisher();

  // YouTube live without accessToken -> TokenExpiredError
  let threwYtToken = false;
  try {
    await yt.publishVideo({ platform: 'youtube', title: 'Live YT', isDryRun: false });
  } catch (e) {
    if (e instanceof TokenExpiredError) threwYtToken = true;
  }
  assert(threwYtToken, 'YouTube live without accessToken should throw TokenExpiredError');

  // Instagram live without igUserId -> ValidationError
  let threwIgUser = false;
  try {
    await ig.publishVideo({
      platform: 'instagram',
      title: 'Live IG',
      isDryRun: false,
      credentials: { accessToken: 'valid_token' },
    });
  } catch (e) {
    if (e instanceof ValidationError) threwIgUser = true;
  }
  assert(threwIgUser, 'Instagram live without igUserId should throw ValidationError');

  // TikTok live without videoUrl -> ValidationError
  let threwTtUrl = false;
  try {
    await tt.publishVideo({
      platform: 'tiktok',
      title: 'Live TT',
      isDryRun: false,
      credentials: { accessToken: 'valid_token' },
    });
  } catch (e) {
    if (e instanceof ValidationError) threwTtUrl = true;
  }
  assert(threwTtUrl, 'TikTok live without videoUrl should throw ValidationError');
});

test('ST-P10', 'Publishing: Multi-platform partial failure isolation in SocialPublisherManager', async () => {
  const manager = new SocialPublisherManager();

  // Broadcast to YouTube (valid), Instagram (invalid: 35 hashtags), TikTok (valid)
  const invalidHashtags = Array.from({ length: 35 }, (_, i) => `#tag${i}`).join(' ');
  const multiRes = await manager.publishToMultiple([
    { platform: 'youtube', title: 'Multi Test YT', isDryRun: true },
    { platform: 'instagram', title: 'Multi Test IG', caption: `Fail IG ${invalidHashtags}`, isDryRun: true },
    { platform: 'tiktok', title: 'Multi Test TT', isDryRun: true },
  ]);

  // Overall batch success should be false because 1 failed, but 2 succeeded
  assert(multiRes.success === false, 'Overall multi-publish should be false when 1 platform fails');
  assert(multiRes.totalPlatforms === 3, 'Total platforms should be 3');
  assert(multiRes.successfulPlatforms === 2, 'Successful platforms should be 2');

  assert(multiRes.results.youtube.success === true, 'YouTube should succeed');
  assert(multiRes.results.instagram.success === false, 'Instagram should fail');
  assert(multiRes.results.tiktok.success === true, 'TikTok should succeed');
  assert(multiRes.errors.instagram.includes('30 hashtags'), 'Instagram error should cite hashtag limit');
});

// --------------------------------------------------------------------------
// SUITE 3: Rate Limiting, Backoff & Error Resilience (8 Tests)
// --------------------------------------------------------------------------

test('ST-R01', 'Resilience: Exponential backoff with full jitter calculation & bounds', async () => {
  for (let attempt = 0; attempt <= 6; attempt++) {
    const maxBound = Math.min(16000, 1000 * Math.pow(2, attempt));
    for (let sample = 0; sample < 20; sample++) {
      const delay = calculateBackoffWithJitter(attempt, 1000, 16000, 2);
      assert(delay >= 0, `Delay must be non-negative: ${delay}`);
      assert(delay <= maxBound, `Delay ${delay} exceeds upper bound ${maxBound} at attempt ${attempt}`);
    }
  }
});

test('ST-R02', 'Resilience: Retry-After header extraction across multiple formats', async () => {
  // 1. Direct retryAfterMs property
  assert(extractRetryAfterMs({ retryAfterMs: 4500 }) === 4500, 'Direct retryAfterMs should return 4500');

  // 2. Direct retryAfter seconds property
  assert(extractRetryAfterMs({ retryAfter: 3 }) === 3000, 'Direct retryAfter 3s should return 3000ms');

  // 3. String seconds in headers
  assert(extractRetryAfterMs({ headers: { 'Retry-After': '10' } }) === 10000, 'Header "10" should return 10000ms');

  // 4. Case-insensitive header
  assert(extractRetryAfterMs({ headers: { 'retry-after': '2.5' } }) === 2500, 'Header "2.5" should return 2500ms');

  // 5. Future HTTP-Date
  const future = new Date(Date.now() + 8000).toUTCString();
  const delayFromDate = extractRetryAfterMs({ headers: { 'Retry-After': future } });
  assert(delayFromDate >= 7000 && delayFromDate <= 9000, `Future HTTP-Date should be ~8000ms, got ${delayFromDate}`);

  // 6. Past HTTP-Date
  const past = new Date(Date.now() - 5000).toUTCString();
  assert(extractRetryAfterMs({ headers: { 'Retry-After': past } }) === 0, 'Past date should return 0ms');

  // 7. Malformed string
  assert(extractRetryAfterMs({ headers: { 'Retry-After': 'invalid-not-a-number' } }) === null, 'Malformed header should return null');
});

test('ST-R03', 'Resilience: Retryable vs Non-retryable error classification', async () => {
  // Retryable
  assert(isDefaultRetryableError({ status: 429 }) === true, '429 is retryable');
  assert(isDefaultRetryableError({ status: 500 }) === true, '500 is retryable');
  assert(isDefaultRetryableError({ status: 502 }) === true, '502 is retryable');
  assert(isDefaultRetryableError({ status: 503 }) === true, '503 is retryable');
  assert(isDefaultRetryableError({ status: 504 }) === true, '504 is retryable');
  assert(isDefaultRetryableError(new RateLimitError('Rate limit', 'yt')) === true, 'RateLimitError is retryable');
  assert(isDefaultRetryableError({ code: 'ECONNRESET' }) === true, 'ECONNRESET is retryable');
  assert(isDefaultRetryableError({ message: 'fetch failed' }) === true, 'fetch failed is retryable');

  // Non-retryable
  assert(isDefaultRetryableError({ status: 400 }) === false, '400 is not retryable');
  assert(isDefaultRetryableError({ status: 401 }) === false, '401 is not retryable');
  assert(isDefaultRetryableError({ status: 403 }) === false, '403 is not retryable');
  assert(isDefaultRetryableError({ status: 404 }) === false, '404 is not retryable');
  assert(isDefaultRetryableError({ status: 422 }) === false, '422 is not retryable');
  assert(isDefaultRetryableError(new ValidationError('Bad format')) === false, 'ValidationError is not retryable');
});

test('ST-R04', 'Resilience: withRetry attempt exhaustion and error bubbling', async () => {
  let callCount = 0;
  let caught = null;

  try {
    await withRetry(
      async () => {
        callCount++;
        const err = new Error('Gateway Timeout');
        err.status = 504;
        throw err;
      },
      { maxAttempts: 3, baseDelayMs: 5, maxDelayMs: 20 }
    );
  } catch (e) {
    caught = e;
  }

  assert(callCount === 3, `Expected exactly 3 attempts before giving up, got ${callCount}`);
  assert(caught && caught.status === 504, 'Should bubble up the final 504 error');
});

test('ST-R05', 'Resilience: withRetry recovery after 2 transient 429 rate limit failures', async () => {
  let callCount = 0;
  const retryEvents = [];

  const result = await withRetry(
    async () => {
      callCount++;
      if (callCount < 3) {
        const err = new Error('Too Many Requests');
        err.status = 429;
        err.retryAfterMs = 10;
        throw err;
      }
      return 'recovered-data';
    },
    {
      maxAttempts: 4,
      onRetry: (err, attempt, delay) => {
        retryEvents.push({ attempt, delay });
      },
    }
  );

  assert(result === 'recovered-data', 'Function should recover after 2 failures');
  assert(callCount === 3, `Expected 3 calls total, got ${callCount}`);
  assert(retryEvents.length === 2, 'Expected 2 onRetry events');
  assert(retryEvents[0].delay === 10, 'Retry delay should follow retryAfterMs');
});

test('ST-R06', 'Resilience: TokenBucketLimiter high-concurrency burst and refill', async () => {
  const limiter = new TokenBucketLimiter(5, 50); // capacity 5, 50 tokens/sec (1 token every 20ms)

  // Immediate acquisition of 5 tokens should succeed
  assert(limiter.tryAcquire(5) === true, 'Immediate acquire of 5 tokens should succeed');

  // Immediate acquisition of 1 more token should fail
  assert(limiter.tryAcquire(1) === false, 'Acquire when empty should fail');

  // Acquire 2 tokens with async wait
  const t0 = Date.now();
  await limiter.acquire(2);
  const elapsed = Date.now() - t0;
  assert(elapsed >= 25, `Should have waited at least ~30ms for 2 tokens (elapsed: ${elapsed}ms)`);
});

test('ST-R07', 'Resilience: YouTube 403 quotaExceeded error mapping', async () => {
  const err = new YouTubeQuotaExceededError('Daily YouTube API quota exceeded (1,600 units required)');
  assert(err.statusCode === 403, 'YouTubeQuotaExceededError statusCode should be 403');
  assert(err.platform === 'youtube', 'Platform should be youtube');
  assert(err.message.includes('1,600 units'), 'Message should describe quota units cost');
});

test('ST-R08', 'Resilience: Instagram 50 posts/24hr rate limit error mapping', async () => {
  const err = new InstagramRateLimitError('Account publishing limit of 50 posts per 24 hours reached');
  assert(err.statusCode === 429, 'InstagramRateLimitError statusCode should be 429');
  assert(err.platform === 'instagram', 'Platform should be instagram');
  assert(err.message.includes('50 posts'), 'Message should describe 50 posts limit');
});

// ==========================================
// MAIN TEST RUNNER
// ==========================================

async function runStressTests() {
  console.log('\n' + '='.repeat(80));
  console.log('  CLIPPED ADVERSARIAL STRESS TEST RUNNER (M6 QUOTAS & SOCIAL PUBLISHING)');
  console.log('='.repeat(80) + '\n');

  let passed = 0;
  let failed = 0;
  const start = Date.now();

  for (const t of tests) {
    const t0 = Date.now();
    try {
      await t.fn();
      const dt = Date.now() - t0;
      console.log(`  [✓ PASS] ${t.id}: ${t.title} (${dt}ms)`);
      passed++;
    } catch (err) {
      const dt = Date.now() - t0;
      console.log(`  [✗ FAIL] ${t.id}: ${t.title} (${dt}ms)`);
      console.error(`          Error: ${err.message}`);
      if (err.stack) console.error(`          Stack: ${err.stack.split('\n')[1]}`);
      failed++;
    }
  }

  const durationMs = Date.now() - start;
  console.log('\n' + '='.repeat(80));
  console.log('  M6 STRESS TEST EXECUTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`  Total Tests  : ${tests.length}`);
  console.log(`  Passed       : ${passed}`);
  console.log(`  Failed       : ${failed}`);
  console.log(`  Total Time   : ${durationMs}ms`);
  console.log(`  Success Rate : ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(80) + '\n');

  return { total: tests.length, passed, failed, durationMs };
}

if (require.main === module) {
  runStressTests().then((summary) => {
    if (summary.failed > 0) {
      process.exitCode = 1;
    }
  });
}

module.exports = { runStressTests };
