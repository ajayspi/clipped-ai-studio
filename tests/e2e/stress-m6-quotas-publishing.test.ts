/**
 * Stress Test Suite: Quotas & Social Publishing Subsystems (M6 Empirical Adversarial Harness)
 * TypeScript suite with direct imports from lib/quotas and lib/publishing
 */

import { expect, registry } from './test-harness';
import {
  QuotaManager,
  QuotaExceededError,
  TIER_LIMITS,
} from '../../lib/quotas';
import {
  youtubePublisher,
  instagramPublisher,
  tiktokPublisher,
  socialPublisherManager,
  getPublisher,
  calculateBackoffWithJitter,
  extractRetryAfterMs,
  isDefaultRetryableError,
  withRetry,
  TokenBucketLimiter,
  ValidationError,
  RateLimitError,
  TokenExpiredError,
  YouTubeQuotaExceededError,
  InstagramRateLimitError,
} from '../../lib/publishing';

export async function registerM6StressTests() {
  const quotaManager = new QuotaManager();

  // =========================================================================
  // Suite 1: Quota Management Adversarial & Rollover Stress Tests (10 Tests)
  // =========================================================================

  registry.register({
    id: 'M6-ST-Q01',
    tier: 'tier6',
    workflow: 'quotas',
    title: 'Adversarial: Concurrent Quota Consumption Simulation on Limit Boundary',
    description: 'Fires 10 parallel consumption requests for a free tier user (quota 3) to verify exact boundary enforcement',
    fn: async () => {
      const userId = `concurrent-user-${Date.now()}`;
      quotaManager.setMockUser(userId, 'free', 0);

      const promises = Array.from({ length: 10 }, () =>
        quotaManager.consumeQuota(userId, 1).then(
          (res) => ({ success: true, res }),
          (err) => ({ success: false, err })
        )
      );

      const results = await Promise.all(promises);
      const successes = results.filter((r) => r.success);
      const failures = results.filter((r) => !r.success);

      expect(successes.length).toBe(3);
      expect(failures.length).toBe(7);
      for (const f of failures) {
        expect((f as any).err instanceof QuotaExceededError || (f as any).err?.code === 'QUOTA_EXCEEDED').toBe(true);
      }
    },
  });

  registry.register({
    id: 'M6-ST-Q02',
    tier: 'tier6',
    workflow: 'quotas',
    title: 'Adversarial: Interleaved Rapid Consume and Refund State Machine',
    description: 'Sequentially exercises state transitions between limit saturation, refunds, and re-consumption',
    fn: async () => {
      const userId = `interleave-user-${Date.now()}`;
      quotaManager.setMockUser(userId, 'free', 1);

      await quotaManager.consumeQuota(userId, 1); // used = 2
      await quotaManager.consumeQuota(userId, 1); // used = 3

      let blocked = false;
      try {
        await quotaManager.consumeQuota(userId, 1);
      } catch (e) {
        blocked = true;
      }
      expect(blocked).toBe(true);

      const r1 = await quotaManager.refundQuota(userId, 1);
      expect(r1.used).toBe(2);
      expect(r1.remaining).toBe(1);

      const c1 = await quotaManager.consumeQuota(userId, 1);
      expect(c1.used).toBe(3);
      expect(c1.remaining).toBe(0);
    },
  });

  registry.register({
    id: 'M6-ST-Q03',
    tier: 'tier6',
    workflow: 'quotas',
    title: 'Adversarial: Zero Consumption Invariant Verification',
    description: 'Verifies that zero unit consumption does not alter used or remaining counters',
    fn: async () => {
      const userId = `zero-user-${Date.now()}`;
      quotaManager.setMockUser(userId, 'free', 1);

      const resZero = await quotaManager.consumeQuota(userId, 0);
      expect(resZero.used).toBe(1);
      expect(resZero.remaining).toBe(2);
    },
  });

  registry.register({
    id: 'M6-ST-Q04',
    tier: 'tier6',
    workflow: 'quotas',
    title: 'Adversarial: Excessive Refund Clamping at Baseline (No Negative Usage)',
    description: 'Verifies that refunding more credits than used clamps used counter strictly to 0 and restores remaining to full limit',
    fn: async () => {
      const userId = `excess-refund-user-${Date.now()}`;
      quotaManager.setMockUser(userId, 'free', 2);

      const refundRes = await quotaManager.refundQuota(userId, 10);
      expect(refundRes.used).toBe(0);
      expect(refundRes.remaining).toBe(3);
      expect(refundRes.allowed).toBe(true);
    },
  });

  registry.register({
    id: 'M6-ST-Q05',
    tier: 'tier6',
    workflow: 'quotas',
    title: 'Adversarial: Leap Year Rollover Boundary (Feb 28 -> Feb 29 2024)',
    description: 'Verifies that transitioning across Feb 28 to Feb 29 within a leap year does NOT trigger monthly reset',
    fn: async () => {
      const feb28 = new Date(Date.UTC(2024, 1, 28, 23, 59, 59)).toISOString();
      const feb29 = new Date(Date.UTC(2024, 1, 29, 12, 0, 0));

      const isDue = quotaManager.isMonthlyResetDue(feb28, feb29);
      expect(isDue).toBe(false);
    },
  });

  registry.register({
    id: 'M6-ST-Q06',
    tier: 'tier6',
    workflow: 'quotas',
    title: 'Adversarial: Leap Year Month Rollover (Feb 29 -> Mar 1 2024)',
    description: 'Verifies that transitioning from Feb 29 to Mar 1 in a leap year triggers monthly reset and calculates next reset date',
    fn: async () => {
      const feb29 = new Date(Date.UTC(2024, 1, 29, 23, 59, 59)).toISOString();
      const mar1 = new Date(Date.UTC(2024, 2, 1, 0, 0, 1));

      const isDue = quotaManager.isMonthlyResetDue(feb29, mar1);
      expect(isDue).toBe(true);

      const resetDate = quotaManager.getNextMonthResetDate(new Date(Date.UTC(2024, 1, 29, 12, 0, 0)));
      const rDateObj = new Date(resetDate);
      expect(rDateObj.getUTCFullYear()).toBe(2024);
      expect(rDateObj.getUTCMonth()).toBe(2);
      expect(rDateObj.getUTCDate()).toBe(1);
    },
  });

  registry.register({
    id: 'M6-ST-Q07',
    tier: 'tier6',
    workflow: 'quotas',
    title: 'Adversarial: Non-Leap Year Month Rollover (Feb 28 -> Mar 1 2025)',
    description: 'Verifies that transitioning from Feb 28 to Mar 1 in a non-leap year triggers monthly reset',
    fn: async () => {
      const feb28 = new Date(Date.UTC(2025, 1, 28, 23, 59, 59)).toISOString();
      const mar1 = new Date(Date.UTC(2025, 2, 1, 0, 0, 1));

      const isDue = quotaManager.isMonthlyResetDue(feb28, mar1);
      expect(isDue).toBe(true);
    },
  });

  registry.register({
    id: 'M6-ST-Q08',
    tier: 'tier6',
    workflow: 'quotas',
    title: 'Adversarial: Year Transition Rollover (Dec 31 2025 -> Jan 1 2026)',
    description: 'Verifies that transitioning from Dec 31 to Jan 1 correctly triggers rollover and computes Jan 1 reset date',
    fn: async () => {
      const dec31 = new Date(Date.UTC(2025, 11, 31, 23, 59, 59)).toISOString();
      const jan1 = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));

      const isDue = quotaManager.isMonthlyResetDue(dec31, jan1);
      expect(isDue).toBe(true);

      const nextReset = quotaManager.getNextMonthResetDate(new Date(Date.UTC(2025, 11, 15)));
      const nextResetObj = new Date(nextReset);
      expect(nextResetObj.getUTCFullYear()).toBe(2026);
      expect(nextResetObj.getUTCMonth()).toBe(0);
      expect(nextResetObj.getUTCDate()).toBe(1);
    },
  });

  registry.register({
    id: 'M6-ST-Q09',
    tier: 'tier6',
    workflow: 'quotas',
    title: 'Adversarial: Malformed Date String and Future Timestamp Resilience',
    description: 'Verifies isMonthlyResetDue gracefully handles invalid strings, null, and future timestamps without throwing',
    fn: async () => {
      const now = new Date();
      expect(quotaManager.isMonthlyResetDue('invalid-date-string', now)).toBe(false);
      expect(quotaManager.isMonthlyResetDue('', now)).toBe(false);
      expect(quotaManager.isMonthlyResetDue(null as any, now)).toBe(false);

      const futureDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 15)).toISOString();
      expect(quotaManager.isMonthlyResetDue(futureDate, now)).toBe(false);
    },
  });

  registry.register({
    id: 'M6-ST-Q10',
    tier: 'tier6',
    workflow: 'quotas',
    title: 'Adversarial: Multi-Provider Isolation (TTS Chars vs Video) & Enterprise Uncapped',
    description: 'Verifies isolation of quota state across multiple providers and Enterprise unrestricted behavior',
    fn: async () => {
      const userId = `multi-provider-user-${Date.now()}`;
      quotaManager.setMockUser(userId, 'pro', 48, undefined, 'video_generation');
      quotaManager.setMockUser(userId, 'pro', 200000, undefined, 'tts_google');

      const videoStatus = await quotaManager.checkUserQuota(userId, 'video_generation');
      expect(videoStatus.totalQuota).toBe(50);
      expect(videoStatus.used).toBe(48);
      expect(videoStatus.remaining).toBe(2);

      const ttsStatus = await quotaManager.checkUserQuota(userId, 'tts_google');
      expect(ttsStatus.totalQuota).toBe(250000);
      expect(ttsStatus.used).toBe(200000);
      expect(ttsStatus.remaining).toBe(50000);

      const entUser = `ent-user-${Date.now()}`;
      quotaManager.setMockUser(entUser, 'enterprise', 5000);
      const entStatus = await quotaManager.checkUserQuota(entUser, 'video_generation');
      expect(entStatus.totalQuota).toBe(-1);
      expect(entStatus.allowed).toBe(true);
    },
  });

  // =========================================================================
  // Suite 2: Social Publishing Payload & Boundary Stress (10 Tests)
  // =========================================================================

  registry.register({
    id: 'M6-ST-P01',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: YouTube Title Length Boundaries (0, 100, 101 Chars)',
    description: 'Tests title validation boundaries for YouTube Data API v3',
    fn: async () => {
      let threwEmpty = false;
      try {
        await youtubePublisher.publishVideo({ platform: 'youtube', title: '   ', isDryRun: true });
      } catch (e) {
        if (e instanceof ValidationError) threwEmpty = true;
      }
      expect(threwEmpty).toBe(true);

      const res100 = await youtubePublisher.publishVideo({ platform: 'youtube', title: 'A'.repeat(100), isDryRun: true });
      expect(res100.success).toBe(true);

      let threw101 = false;
      try {
        await youtubePublisher.publishVideo({ platform: 'youtube', title: 'A'.repeat(101), isDryRun: true });
      } catch (e) {
        if (e instanceof ValidationError) threw101 = true;
      }
      expect(threw101).toBe(true);
    },
  });

  registry.register({
    id: 'M6-ST-P02',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: YouTube Description (5000/5001) & Tags (500/501) Limits',
    description: 'Tests upper boundary constraints on descriptions and tags for YouTube uploads',
    fn: async () => {
      const resDesc5000 = await youtubePublisher.publishVideo({
        platform: 'youtube',
        title: 'Valid Title',
        description: 'D'.repeat(5000),
        isDryRun: true,
      });
      expect(resDesc5000.success).toBe(true);

      let threwDesc5001 = false;
      try {
        await youtubePublisher.publishVideo({
          platform: 'youtube',
          title: 'Valid Title',
          description: 'D'.repeat(5001),
          isDryRun: true,
        });
      } catch (e) {
        if (e instanceof ValidationError) threwDesc5001 = true;
      }
      expect(threwDesc5001).toBe(true);

      const resTags = await youtubePublisher.publishVideo({
        platform: 'youtube',
        title: 'Valid Title',
        tags: ['tag1', 'tag2', 'T'.repeat(490)],
        isDryRun: true,
      });
      expect(resTags.success).toBe(true);

      let threwTags501 = false;
      try {
        await youtubePublisher.publishVideo({
          platform: 'youtube',
          title: 'Valid Title',
          tags: ['T'.repeat(260), 'T'.repeat(250)],
          isDryRun: true,
        });
      } catch (e) {
        if (e instanceof ValidationError) threwTags501 = true;
      }
      expect(threwTags501).toBe(true);
    },
  });

  registry.register({
    id: 'M6-ST-P03',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: YouTube Invalid Privacy Settings Rejection',
    description: 'Tests rejection of invalid privacy string values',
    fn: async () => {
      const invalidPrivacies = ['hidden', 'friends_only', 'archived', '123'];
      for (const priv of invalidPrivacies) {
        let threw = false;
        try {
          await youtubePublisher.publishVideo({
            platform: 'youtube',
            title: 'Valid Title',
            privacy: priv as any,
            isDryRun: true,
          });
        } catch (e) {
          if (e instanceof ValidationError) threw = true;
        }
        expect(threw).toBe(true);
      }
    },
  });

  registry.register({
    id: 'M6-ST-P04',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: Instagram Caption Length Boundaries (2200/2201 Chars)',
    description: 'Tests Instagram Reels caption maximum length limit of 2200 characters',
    fn: async () => {
      const res2200 = await instagramPublisher.publishVideo({
        platform: 'instagram',
        title: 'Title',
        caption: 'C'.repeat(2200),
        isDryRun: true,
      });
      expect(res2200.success).toBe(true);

      let threw2201 = false;
      try {
        await instagramPublisher.publishVideo({
          platform: 'instagram',
          title: 'Title',
          caption: 'C'.repeat(2201),
          isDryRun: true,
        });
      } catch (e) {
        if (e instanceof ValidationError) threw2201 = true;
      }
      expect(threw2201).toBe(true);
    },
  });

  registry.register({
    id: 'M6-ST-P05',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: Instagram Hashtag Limits (30 Pass, 31 Reject)',
    description: 'Tests Meta policy limit of 30 hashtags per Instagram Reel',
    fn: async () => {
      const tags30 = Array.from({ length: 30 }, (_, i) => `#tag${i}`).join(' ');
      const res30 = await instagramPublisher.publishVideo({
        platform: 'instagram',
        title: 'Title',
        caption: `Viral video ${tags30}`,
        isDryRun: true,
      });
      expect(res30.success).toBe(true);

      const tags31 = Array.from({ length: 31 }, (_, i) => `#tag${i}`).join(' ');
      let threw31 = false;
      try {
        await instagramPublisher.publishVideo({
          platform: 'instagram',
          title: 'Title',
          caption: `Viral video ${tags31}`,
          isDryRun: true,
        });
      } catch (e) {
        if (e instanceof ValidationError) threw31 = true;
      }
      expect(threw31).toBe(true);
    },
  });

  registry.register({
    id: 'M6-ST-P06',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: TikTok Title Length Boundaries (2200/2201 Chars, Empty)',
    description: 'Tests TikTok Content Posting API title constraints',
    fn: async () => {
      let threwEmpty = false;
      try {
        await tiktokPublisher.publishVideo({ platform: 'tiktok', title: '   ', isDryRun: true });
      } catch (e) {
        if (e instanceof ValidationError) threwEmpty = true;
      }
      expect(threwEmpty).toBe(true);

      const res2200 = await tiktokPublisher.publishVideo({
        platform: 'tiktok',
        title: 'T'.repeat(2200),
        isDryRun: true,
      });
      expect(res2200.success).toBe(true);

      let threw2201 = false;
      try {
        await tiktokPublisher.publishVideo({
          platform: 'tiktok',
          title: 'T'.repeat(2201),
          isDryRun: true,
        });
      } catch (e) {
        if (e instanceof ValidationError) threw2201 = true;
      }
      expect(threw2201).toBe(true);
    },
  });

  registry.register({
    id: 'M6-ST-P07',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: TikTok Privacy Enum Mappings and Invalid Rejection',
    description: 'Tests mapping of common privacy strings to TikTok creator privacy enums',
    fn: async () => {
      const rPub = await tiktokPublisher.publishVideo({ platform: 'tiktok', title: 'Pub', privacy: 'public', isDryRun: true });
      expect(rPub.metadata?.privacyLevel).toBe('PUBLIC_TO_EVERYONE');

      const rFriends = await tiktokPublisher.publishVideo({ platform: 'tiktok', title: 'Friends', privacy: 'unlisted', isDryRun: true });
      expect(rFriends.metadata?.privacyLevel).toBe('MUTUAL_FOLLOW_FRIENDS');

      const rPriv = await tiktokPublisher.publishVideo({ platform: 'tiktok', title: 'Priv', privacy: 'private', isDryRun: true });
      expect(rPriv.metadata?.privacyLevel).toBe('SELF_ONLY');

      let threw = false;
      try {
        await tiktokPublisher.publishVideo({ platform: 'tiktok', title: 'Invalid', privacy: 'subscribers_only' as any, isDryRun: true });
      } catch (e) {
        if (e instanceof ValidationError) threw = true;
      }
      expect(threw).toBe(true);
    },
  });

  registry.register({
    id: 'M6-ST-P08',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: Unsupported Platform Factory Rejection',
    description: 'Verifies getPublisher throws ValidationError on unknown platform strings',
    fn: async () => {
      const unsupported = ['facebook', 'twitter', 'linkedin', 'snapchat', '', null, undefined];
      for (const plat of unsupported) {
        let threw = false;
        try {
          getPublisher(plat as any);
        } catch (e) {
          if (e instanceof ValidationError) threw = true;
        }
        expect(threw).toBe(true);
      }
    },
  });

  registry.register({
    id: 'M6-ST-P09',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: Live Publishing Credentials and Binary/URL Guards',
    description: 'Verifies live publishing demands OAuth access tokens and video URLs or buffers',
    fn: async () => {
      let threwYtToken = false;
      try {
        await youtubePublisher.publishVideo({ platform: 'youtube', title: 'Live YT', isDryRun: false });
      } catch (e) {
        if (e instanceof TokenExpiredError) threwYtToken = true;
      }
      expect(threwYtToken).toBe(true);

      let threwIgUser = false;
      try {
        await instagramPublisher.publishVideo({
          platform: 'instagram',
          title: 'Live IG',
          isDryRun: false,
          credentials: { accessToken: 'valid_token' },
        });
      } catch (e) {
        if (e instanceof ValidationError) threwIgUser = true;
      }
      expect(threwIgUser).toBe(true);

      let threwTtUrl = false;
      try {
        await tiktokPublisher.publishVideo({
          platform: 'tiktok',
          title: 'Live TT',
          isDryRun: false,
          credentials: { accessToken: 'valid_token' },
        });
      } catch (e) {
        if (e instanceof ValidationError) threwTtUrl = true;
      }
      expect(threwTtUrl).toBe(true);
    },
  });

  registry.register({
    id: 'M6-ST-P10',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: Multi-Platform Partial Failure Isolation in SocialPublisherManager',
    description: 'Verifies that 1 failing platform in a multi-broadcast does not prevent other valid platforms from publishing',
    fn: async () => {
      const invalidHashtags = Array.from({ length: 35 }, (_, i) => `#tag${i}`).join(' ');
      const multiRes = await socialPublisherManager.publishToMultiple([
        { platform: 'youtube', title: 'Multi Test YT', isDryRun: true },
        { platform: 'instagram', title: 'Multi Test IG', caption: `Fail IG ${invalidHashtags}`, isDryRun: true },
        { platform: 'tiktok', title: 'Multi Test TT', isDryRun: true },
      ]);

      expect(multiRes.success).toBe(false);
      expect(multiRes.totalPlatforms).toBe(3);
      expect(multiRes.successfulPlatforms).toBe(2);

      expect(multiRes.results.youtube.success).toBe(true);
      expect(multiRes.results.instagram.success).toBe(false);
      expect(multiRes.results.tiktok.success).toBe(true);
      expect(multiRes.errors?.instagram).toContain('30 hashtags');
    },
  });

  // =========================================================================
  // Suite 3: Rate Limiting, Backoff & Error Resilience (8 Tests)
  // =========================================================================

  registry.register({
    id: 'M6-ST-R01',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: Exponential Backoff with Full Jitter Calculation & Bounds',
    description: 'Verifies backoff delays never exceed exponential envelope caps across attempts',
    fn: async () => {
      for (let attempt = 0; attempt <= 6; attempt++) {
        const maxBound = Math.min(16000, 1000 * Math.pow(2, attempt));
        for (let sample = 0; sample < 20; sample++) {
          const delay = calculateBackoffWithJitter(attempt, 1000, 16000, 2);
          expect(delay).toBeGreaterThanOrEqual(0);
          expect(delay).toBeLessThanOrEqual(maxBound);
        }
      }
    },
  });

  registry.register({
    id: 'M6-ST-R02',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: Retry-After Header Extraction Across Multiple Formats',
    description: 'Tests extraction of Retry-After delays from milliseconds, integer seconds, HTTP-Dates, and malformed strings',
    fn: async () => {
      expect(extractRetryAfterMs({ retryAfterMs: 4500 })).toBe(4500);
      expect(extractRetryAfterMs({ retryAfter: 3 })).toBe(3000);
      expect(extractRetryAfterMs({ headers: { 'Retry-After': '10' } })).toBe(10000);
      expect(extractRetryAfterMs({ headers: { 'retry-after': '2.5' } })).toBe(2500);

      const future = new Date(Date.now() + 8000).toUTCString();
      const delayFromDate = extractRetryAfterMs({ headers: { 'Retry-After': future } });
      expect(delayFromDate).toBeGreaterThanOrEqual(7000);
      expect(delayFromDate).toBeLessThanOrEqual(9000);

      const past = new Date(Date.now() - 5000).toUTCString();
      expect(extractRetryAfterMs({ headers: { 'Retry-After': past } })).toBe(0);

      expect(extractRetryAfterMs({ headers: { 'Retry-After': 'invalid-not-a-number' } })).toBe(null);
    },
  });

  registry.register({
    id: 'M6-ST-R03',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: Retryable vs Non-Retryable Error Classification Matrix',
    description: 'Tests classification of transient network/server errors vs permanent client errors',
    fn: async () => {
      expect(isDefaultRetryableError({ status: 429 })).toBe(true);
      expect(isDefaultRetryableError({ status: 500 })).toBe(true);
      expect(isDefaultRetryableError({ status: 502 })).toBe(true);
      expect(isDefaultRetryableError({ status: 503 })).toBe(true);
      expect(isDefaultRetryableError({ status: 504 })).toBe(true);
      expect(isDefaultRetryableError(new RateLimitError('Rate limit', 'yt'))).toBe(true);
      expect(isDefaultRetryableError({ code: 'ECONNRESET' })).toBe(true);
      expect(isDefaultRetryableError({ message: 'fetch failed' })).toBe(true);

      expect(isDefaultRetryableError({ status: 400 })).toBe(false);
      expect(isDefaultRetryableError({ status: 401 })).toBe(false);
      expect(isDefaultRetryableError({ status: 403 })).toBe(false);
      expect(isDefaultRetryableError({ status: 404 })).toBe(false);
      expect(isDefaultRetryableError({ status: 422 })).toBe(false);
      expect(isDefaultRetryableError(new ValidationError('Bad format'))).toBe(false);
    },
  });

  registry.register({
    id: 'M6-ST-R04',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: withRetry Attempt Exhaustion and Error Bubbling',
    description: 'Verifies withRetry stops at maxAttempts and bubbles up the final transient error',
    fn: async () => {
      let callCount = 0;
      let caught: any = null;

      try {
        await withRetry(
          async () => {
            callCount++;
            const err: any = new Error('Gateway Timeout');
            err.status = 504;
            throw err;
          },
          { maxAttempts: 3, baseDelayMs: 5, maxDelayMs: 20 }
        );
      } catch (e) {
        caught = e;
      }

      expect(callCount).toBe(3);
      expect(caught?.status).toBe(504);
    },
  });

  registry.register({
    id: 'M6-ST-R05',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: withRetry Recovery After Transient 429 Rate Limits',
    description: 'Verifies recovery and onRetry callback tracking during transient rate limit recovery',
    fn: async () => {
      let callCount = 0;
      const retryEvents: any[] = [];

      const result = await withRetry(
        async () => {
          callCount++;
          if (callCount < 3) {
            const err: any = new Error('Too Many Requests');
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

      expect(result).toBe('recovered-data');
      expect(callCount).toBe(3);
      expect(retryEvents.length).toBe(2);
      expect(retryEvents[0].delay).toBe(10);
    },
  });

  registry.register({
    id: 'M6-ST-R06',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: TokenBucketLimiter Burst and Refill Under Concurrency',
    description: 'Tests burst capacity deduction and asynchronous token refill delay',
    fn: async () => {
      const limiter = new TokenBucketLimiter(5, 50);

      expect(limiter.tryAcquire(5)).toBe(true);
      expect(limiter.tryAcquire(1)).toBe(false);

      const t0 = Date.now();
      await limiter.acquire(2);
      const elapsed = Date.now() - t0;
      expect(elapsed).toBeGreaterThanOrEqual(20);
    },
  });

  registry.register({
    id: 'M6-ST-R07',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: YouTube 403 quotaExceeded Error Class Mapping',
    description: 'Verifies YouTubeQuotaExceededError properties and status code',
    fn: async () => {
      const err = new YouTubeQuotaExceededError('Daily YouTube API quota exceeded (1,600 units required)');
      expect(err.statusCode).toBe(403);
      expect(err.platform).toBe('youtube');
      expect(err.message).toContain('1,600 units');
    },
  });

  registry.register({
    id: 'M6-ST-R08',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Adversarial: Instagram 50 Posts/24hr Rate Limit Error Class Mapping',
    description: 'Verifies InstagramRateLimitError properties and status code',
    fn: async () => {
      const err = new InstagramRateLimitError('Account publishing limit of 50 posts per 24 hours reached');
      expect(err.statusCode).toBe(429);
      expect(err.platform).toBe('instagram');
      expect(err.message).toContain('50 posts');
    },
  });
}
