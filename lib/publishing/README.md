# publishing

## Overview
Multi-platform social video publishing framework, OAuth token management, exponential backoff with jitter rate limiters, and social publisher adapters for YouTube, Instagram, and TikTok.

## Interface
- [lib/publishing/index.ts:getPublisher] export function getPublisher(platform: SocialPlatform | string): ISocialPublisher
- [lib/publishing/index.ts:SocialPublisherManager] export class SocialPublisherManager
- [lib/publishing/index.ts:socialPublisherManager] export const socialPublisherManager: SocialPublisherManager
- [lib/publishing/index.ts:MultiPublishRequest] export interface MultiPublishRequest
- [lib/publishing/index.ts:MultiPublishResult] export interface MultiPublishResult
- [lib/publishing/types.ts:ISocialPublisher] export interface ISocialPublisher { platform: SocialPlatform; publishVideo(request: PublishRequest): Promise<PublishResponse>; ... }
- [lib/publishing/types.ts:PublishRequest] export interface PublishRequest
- [lib/publishing/types.ts:PublishResponse] export interface PublishResponse
- [lib/publishing/rate-limiter.ts:calculateBackoffWithJitter] export function calculateBackoffWithJitter(attempt: number, baseDelayMs?: number, maxDelayMs?: number, backoffFactor?: number): number
- [lib/publishing/rate-limiter.ts:extractRetryAfterMs] export function extractRetryAfterMs(error: unknown): number | null
- [lib/publishing/rate-limiter.ts:isDefaultRetryableError] export function isDefaultRetryableError(error: unknown): boolean
- [lib/publishing/rate-limiter.ts:withRetry] export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>
- [lib/publishing/rate-limiter.ts:TokenBucketLimiter] export class TokenBucketLimiter
- [lib/publishing/rate-limiter.ts:youtubeRateLimiter] export const youtubeRateLimiter: TokenBucketLimiter
- [lib/publishing/rate-limiter.ts:instagramRateLimiter] export const instagramRateLimiter: TokenBucketLimiter
- [lib/publishing/rate-limiter.ts:tiktokRateLimiter] export const tiktokRateLimiter: TokenBucketLimiter
- [lib/publishing/youtube.ts:youtubePublisher] export const youtubePublisher: YouTubePublisher
- [lib/publishing/instagram.ts:instagramPublisher] export const instagramPublisher: InstagramPublisher
- [lib/publishing/tiktok.ts:tiktokPublisher] export const tiktokPublisher: TikTokPublisher

## Invariants
- [lib/publishing/index.ts:SocialPublisherManager] Enforces strict dry-run default (isDryRun !== false), returning mock video IDs and platform URLs without calling external APIs.
- [lib/publishing/rate-limiter.ts:calculateBackoffWithJitter] Full jitter delay is bounded within [0, min(maxDelayMs, baseDelayMs * 2^attempt)].
- [lib/publishing/youtube.ts:YouTubePublisher] Tracks 1,600 units per upload against YouTube daily quota budget of 10,000 units.
- [lib/publishing/instagram.ts:InstagramPublisher] Enforces Instagram Graph API 50 posts per 24 hours rate limit.

## Side Effects
- [lib/publishing/index.ts:publish] Inserts publication record into Supabase published_videos table upon successful publish with valid videoId.
- External network calls to YouTube, Instagram Graph, and TikTok APIs when isDryRun: false.

## Verification
- Run: `pnpm test`
