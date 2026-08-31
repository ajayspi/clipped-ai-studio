/**
 * Rate Limiting and Resilience utilities for Social Publishing APIs.
 * Implements exponential backoff with full jitter, Retry-After header parsing,
 * and token bucket rate limiters.
 */

import { RateLimitConfig, RateLimitError } from './types';

/**
 * Calculates exponential backoff with full jitter.
 * Uniformly distributes random delay in [0, min(maxDelayMs, baseDelayMs * 2^attempt)].
 */
export function calculateBackoffWithJitter(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 16000,
  backoffFactor: number = 2
): number {
  const exponentialDelay = Math.min(
    maxDelayMs,
    baseDelayMs * Math.pow(backoffFactor, Math.max(0, attempt))
  );
  // Full jitter: uniformly distributed in [0, exponentialDelay]
  return Math.floor(Math.random() * exponentialDelay);
}

/**
 * Extracts Retry-After delay in milliseconds from an error object or response headers.
 */
export function extractRetryAfterMs(error: any): number | null {
  if (!error) return null;

  if (typeof error.retryAfterMs === 'number' && error.retryAfterMs > 0) {
    return error.retryAfterMs;
  }

  if (typeof error.retryAfter === 'number' && error.retryAfter > 0) {
    return error.retryAfter * 1000;
  }

  // Check headers from response or error details
  const headers = error.headers || error.response?.headers;
  if (headers) {
    let headerVal: string | null = null;
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

      // Check if it's an HTTP-Date string (RFC 7231)
      const parsedDate = Date.parse(headerVal);
      if (!isNaN(parsedDate)) {
        const delta = parsedDate - Date.now();
        return Math.max(0, delta);
      }
    }
  }

  return null;
}

/**
 * Default predicate to check if an error is transient and retryable.
 */
export function isDefaultRetryableError(error: any): boolean {
  if (!error) return false;

  const statusCode =
    error.statusCode ||
    error.status ||
    error.response?.status ||
    (typeof error.message === 'string' && error.message.includes('429') ? 429 : undefined);

  // Rate limits & standard server errors
  if (statusCode === 429 || (statusCode >= 500 && statusCode <= 504)) {
    return true;
  }

  if (error instanceof RateLimitError) {
    return true;
  }

  // Network / connection drop errors
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

/**
 * Executes an asynchronous function with full jitter exponential backoff retry.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RateLimitConfig = {}
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 16000;
  const backoffFactor = options.backoffFactor ?? 2;

  let lastError: any;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      const isLastAttempt = attempt >= maxAttempts - 1;
      if (isLastAttempt) {
        break;
      }

      const shouldRetry = options.shouldRetry
        ? options.shouldRetry(error, attempt)
        : isDefaultRetryableError(error);

      if (!shouldRetry) {
        throw error;
      }

      // Prioritize explicit Retry-After header delay if present
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

/**
 * Token Bucket algorithm implementation for controlling API request rates and bursts.
 */
export class TokenBucketLimiter {
  private tokens: number;
  private lastRefillTime: number;
  private readonly capacity: number;
  private readonly fillRatePerMs: number;

  /**
   * @param capacity Maximum burst capacity of tokens.
   * @param fillRatePerSecond Continuous refill rate in tokens per second.
   */
  constructor(capacity: number, fillRatePerSecond: number) {
    this.capacity = Math.max(1, capacity);
    this.tokens = this.capacity;
    this.fillRatePerMs = Math.max(0.0001, fillRatePerSecond / 1000);
    this.lastRefillTime = Date.now();
  }

  /**
   * Acquires the specified number of tokens, waiting asynchronously if necessary.
   */
  async acquire(tokens: number = 1): Promise<void> {
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

  /**
   * Attempts to acquire tokens immediately without blocking.
   * Returns true if acquired, false otherwise.
   */
  tryAcquire(tokens: number = 1): boolean {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  /**
   * Returns current available token balance.
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Refills tokens based on elapsed wall-clock time.
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    if (elapsed > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.fillRatePerMs);
      this.lastRefillTime = now;
    }
  }
}

// Platform rate limiter singletons
export const youtubeRateLimiter = new TokenBucketLimiter(10, 10);
export const instagramRateLimiter = new TokenBucketLimiter(5, 5);
export const tiktokRateLimiter = new TokenBucketLimiter(5, 5);
