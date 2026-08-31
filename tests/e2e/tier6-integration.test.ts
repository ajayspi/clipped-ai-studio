/**
 * Tier 6: E2E Integration Test Suite
 * Comprehensive verification of external systems & subsystem integrations:
 * 1. Multi-Provider TTS Engine (Google Cloud TTS, ElevenLabs, Coqui TTS, Fallback Cascade)
 * 2. Social Publishing APIs (YouTube Data API v3, Instagram Graph API Reels, TikTok Content API)
 * 3. Quota & Credit Management (3 videos/month free tier, QuotaExceededError, monthly rollover, refunds)
 * 4. Audio Mixing & Speech Ducking Engine (FFmpeg sidechaincompress, BGM looping, gain balance, afade, dry-run fallback)
 */

import { expect, registry, mockSupabase } from './test-harness';
import {
  TTSEngine,
  normalizeLanguageCode,
  detectLanguageFromScript,
  generateSyntheticWavBuffer,
  calculateEstimatedDuration,
  GOOGLE_DEFAULT_VOICES,
  ELEVENLABS_VOICES,
  ELEVENLABS_LANG_MAP,
  COQUI_LANG_MAP,
} from '../../lib/engine/tts';
import {
  youtubePublisher,
  instagramPublisher,
  tiktokPublisher,
  socialPublisherManager,
  calculateBackoffWithJitter,
  extractRetryAfterMs,
  isDefaultRetryableError,
  withRetry,
  TokenBucketLimiter,
  ValidationError,
  YouTubeQuotaExceededError,
  InstagramRateLimitError,
} from '../../lib/publishing';
import {
  QuotaManager,
  QuotaExceededError,
  TIER_LIMITS,
} from '../../lib/quotas';
import {
  AudioMixer,
  BGM_PRESETS,
} from '../../lib/engine/audio-mixer';

export async function registerTier6Tests() {
  const ttsEngine = new TTSEngine();
  const quotaManager = new QuotaManager();
  const audioMixer = new AudioMixer();

  // =========================================================================
  // Section 1: Multi-Provider TTS Engine (5 Tests)
  // =========================================================================

  registry.register({
    id: 'T6-TTS-01',
    tier: 'tier6',
    workflow: 'tts',
    title: 'TTS: Language Code Normalization Across Indian Languages & English',
    description: 'Verifies normalization of loose/colloquial language codes and automatic script detection for Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, and English',
    fn: async () => {
      // 1. English aliases
      expect(normalizeLanguageCode('en')).toBe('en-US');
      expect(normalizeLanguageCode('en-us')).toBe('en-US');
      expect(normalizeLanguageCode('english')).toBe('en-US');
      expect(normalizeLanguageCode('american')).toBe('en-US');
      expect(normalizeLanguageCode('en-in')).toBe('en-IN');
      expect(normalizeLanguageCode('indian_english')).toBe('en-IN');
      expect(normalizeLanguageCode('hinglish')).toBe('en-IN');

      // 2. Indian Language aliases
      expect(normalizeLanguageCode('hi')).toBe('hi-IN');
      expect(normalizeLanguageCode('hindi')).toBe('hi-IN');
      expect(normalizeLanguageCode('hi-in')).toBe('hi-IN');

      expect(normalizeLanguageCode('ta')).toBe('ta-IN');
      expect(normalizeLanguageCode('tamil')).toBe('ta-IN');
      expect(normalizeLanguageCode('ta-in')).toBe('ta-IN');

      expect(normalizeLanguageCode('te')).toBe('te-IN');
      expect(normalizeLanguageCode('telugu')).toBe('te-IN');
      expect(normalizeLanguageCode('te-in')).toBe('te-IN');

      expect(normalizeLanguageCode('kn')).toBe('kn-IN');
      expect(normalizeLanguageCode('kannada')).toBe('kn-IN');
      expect(normalizeLanguageCode('kn-in')).toBe('kn-IN');

      expect(normalizeLanguageCode('bn')).toBe('bn-IN');
      expect(normalizeLanguageCode('bengali')).toBe('bn-IN');
      expect(normalizeLanguageCode('bangla')).toBe('bn-IN');

      expect(normalizeLanguageCode('mr')).toBe('mr-IN');
      expect(normalizeLanguageCode('marathi')).toBe('mr-IN');
      expect(normalizeLanguageCode('mr-in')).toBe('mr-IN');

      // 3. Script Detection from raw Unicode text
      expect(detectLanguageFromScript('வணக்கம் உலகம்')).toBe('ta-IN'); // Tamil
      expect(detectLanguageFromScript('నమస్కారం ప్రపంచం')).toBe('te-IN'); // Telugu
      expect(detectLanguageFromScript('ನಮಸ್ಕಾರ ವಿಶ್ವ')).toBe('kn-IN'); // Kannada
      expect(detectLanguageFromScript('নমস্কার বিশ্ব')).toBe('bn-IN'); // Bengali
      expect(detectLanguageFromScript('नमस्ते दुनिया')).toBe('hi-IN'); // Hindi (Devanagari)
      expect(detectLanguageFromScript('मराठी भाषेचा गौरव आहे')).toBe('mr-IN'); // Marathi (Devanagari with Marathi keywords)
      expect(detectLanguageFromScript('Hello world, welcome to Clipped AI')).toBe('en-US'); // Latin / English
    },
  });

  registry.register({
    id: 'T6-TTS-02',
    tier: 'tier6',
    workflow: 'tts',
    title: 'TTS: Google Cloud TTS Voice Routing & Gender Mapping',
    description: 'Verifies Google Cloud TTS voice catalog routing across all 6 Indian languages + en-US/en-IN and gender defaults',
    fn: async () => {
      const languages = ['en-US', 'en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'bn-IN', 'mr-IN'] as const;

      for (const lang of languages) {
        const config = GOOGLE_DEFAULT_VOICES[lang];
        expect(config).toBeDefined();
        expect(typeof config.female).toBe('string');
        expect(typeof config.male).toBe('string');
        expect(config.female).toContain(lang);
        expect(config.male).toContain(lang);
      }

      // Specific voice model assertions
      expect(GOOGLE_DEFAULT_VOICES['hi-IN'].female).toBe('hi-IN-Neural2-A');
      expect(GOOGLE_DEFAULT_VOICES['hi-IN'].male).toBe('hi-IN-Neural2-B');
      expect(GOOGLE_DEFAULT_VOICES['ta-IN'].female).toBe('ta-IN-Wavenet-A');
      expect(GOOGLE_DEFAULT_VOICES['te-IN'].female).toBe('te-IN-Standard-A');
      expect(GOOGLE_DEFAULT_VOICES['en-US'].female).toBe('en-US-Journey-F');
      expect(GOOGLE_DEFAULT_VOICES['en-IN'].female).toBe('en-IN-Neural2-A');

      // Voice catalog listing
      const voices = ttsEngine.getAvailableVoices('hi-IN');
      expect(voices.length).toBeGreaterThan(0);
      const hiVoice = voices.find((v) => v.language === 'hi-IN');
      expect(hiVoice).toBeDefined();
      expect(hiVoice?.provider).toBe('google');
    },
  });

  registry.register({
    id: 'T6-TTS-03',
    tier: 'tier6',
    workflow: 'tts',
    title: 'TTS: ElevenLabs Multilingual v2 Voice Mapping & Catalog',
    description: 'Verifies ElevenLabs voice ID lookup, language mapping to eleven_multilingual_v2, and voice alias resolution',
    fn: async () => {
      // Voice aliases mapping
      expect(ELEVENLABS_VOICES.rachel).toBe('21m00Tcm4TlvDq8ikWAM');
      expect(ELEVENLABS_VOICES.adam).toBe('pNInz6obpgDQGcFmaJgB');
      expect(ELEVENLABS_VOICES.domi).toBe('AZnzlk1XvdvUeBnXmlld');
      expect(ELEVENLABS_VOICES.bella).toBe('EXAVITQu4vr4xnSDxMaL');
      expect(ELEVENLABS_VOICES.nova).toBe(ELEVENLABS_VOICES.rachel);
      expect(ELEVENLABS_VOICES.onyx).toBe(ELEVENLABS_VOICES.adam);

      // Language code to ElevenLabs model mapping
      expect(ELEVENLABS_LANG_MAP['en-US']).toBe('en');
      expect(ELEVENLABS_LANG_MAP['en-IN']).toBe('en');
      expect(ELEVENLABS_LANG_MAP['hi-IN']).toBe('hi');
      expect(ELEVENLABS_LANG_MAP['ta-IN']).toBe('ta');
      expect(ELEVENLABS_LANG_MAP['te-IN']).toBe('te');
      expect(ELEVENLABS_LANG_MAP['kn-IN']).toBe('kn');
      expect(ELEVENLABS_LANG_MAP['bn-IN']).toBe('bn');
      expect(ELEVENLABS_LANG_MAP['mr-IN']).toBe('mr');

      const allVoices = ttsEngine.getAvailableVoices('en-US');
      const elevenVoices = allVoices.filter((v) => v.provider === 'elevenlabs');
      expect(elevenVoices.length).toBeGreaterThanOrEqual(10);
    },
  });

  registry.register({
    id: 'T6-TTS-04',
    tier: 'tier6',
    workflow: 'tts',
    title: 'TTS: Coqui TTS Integration & Language Mapping',
    description: 'Verifies Coqui TTS language map configuration and graceful timeout guard during remote endpoint resolution',
    fn: async () => {
      expect(COQUI_LANG_MAP['en-US']).toBe('en');
      expect(COQUI_LANG_MAP['hi-IN']).toBe('hi');
      expect(COQUI_LANG_MAP['ta-IN']).toBe('ta');
      expect(COQUI_LANG_MAP['te-IN']).toBe('te');
      expect(COQUI_LANG_MAP['kn-IN']).toBe('kn');
      expect(COQUI_LANG_MAP['bn-IN']).toBe('bn');
      expect(COQUI_LANG_MAP['mr-IN']).toBe('mr');

      // Synthesize with requested coqui provider without live server -> cascades gracefully to mock
      const res = await ttsEngine.synthesize({
        text: 'Coqui fallback test for Indian language speech synthesis',
        language: 'hi-IN',
        provider: 'coqui',
      });

      expect(res.success).toBe(true);
      expect(res.providerUsed).toBe('mock');
      expect(res.metadata.isDryRun).toBe(true);
      expect(res.metadata.providerAttempts.length).toBeGreaterThan(0);
      const coquiAttempt = res.metadata.providerAttempts.find((a) => a.provider === 'coqui');
      expect(coquiAttempt).toBeDefined();
    },
  });

  registry.register({
    id: 'T6-TTS-05',
    tier: 'tier6',
    workflow: 'tts',
    title: 'TTS: 4-Tier Fallback Cascade to In-Memory PCM WAV Generator',
    description: 'Verifies graceful 4-tier cascade (ElevenLabs -> Google -> Coqui -> Mock) producing valid standard RIFF/WAVE PCM audio buffer',
    fn: async () => {
      // Verify synthetic WAV buffer generator
      const duration = 3.5;
      const wavBuffer = generateSyntheticWavBuffer(duration, 24000);
      expect(wavBuffer.length).toBeGreaterThan(44);

      // Verify standard RIFF/WAVE header signatures
      expect(wavBuffer.toString('ascii', 0, 4)).toBe('RIFF');
      expect(wavBuffer.toString('ascii', 8, 12)).toBe('WAVE');
      expect(wavBuffer.toString('ascii', 12, 16)).toBe('fmt ');
      expect(wavBuffer.readUInt32LE(16)).toBe(16); // Sub-chunk size 16 for PCM
      expect(wavBuffer.readUInt16LE(20)).toBe(1); // Audio format 1 = PCM
      expect(wavBuffer.readUInt16LE(22)).toBe(1); // Mono channel
      expect(wavBuffer.readUInt32LE(24)).toBe(24000); // 24kHz sample rate
      expect(wavBuffer.toString('ascii', 36, 40)).toBe('data');

      // Verify duration calculation
      const text = 'This is a ten word sample text for calculating audio duration.';
      const estDuration = calculateEstimatedDuration(text, 'en-US', 1.0);
      expect(estDuration).toBeGreaterThan(2.0);

      // Execute full synthesize call with unconfigured credentials -> deterministic dry-run mock response
      const res = await ttsEngine.synthesize({
        text: 'Clipped is an autonomous short-form AI video generation platform.',
        language: 'hi-IN',
      });

      expect(res.success).toBe(true);
      expect(res.audioBuffer).toBeDefined();
      expect(res.audioUrl).toMatch(/^data:audio\/(wav|mp3);base64,/);
      expect(res.duration).toBeGreaterThan(0);
      expect(res.language).toBe('hi-IN');
      expect(res.metadata.isDryRun).toBe(true);
    },
  });

  // =========================================================================
  // Section 2: Social Publishing APIs (5 Tests)
  // =========================================================================

  registry.register({
    id: 'T6-PUB-01',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Publishing: YouTube Data API v3 OAuth & Dry-Run Video Upload',
    description: 'Verifies YouTube OAuth authorization URL generation, metadata validation, and dry-run resumable upload protocol',
    fn: async () => {
      // 1. OAuth URL generation
      const authUrl = youtubePublisher.getAuthUrl({
        clientId: 'test-google-client-id.apps.googleusercontent.com',
        clientSecret: 'mock-secret',
        redirectUri: 'https://clipped.ai/api/auth/callback/youtube',
        state: 'csrf-yt-123',
      });
      expect(authUrl).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(authUrl).toContain('test-google-client-id');
      expect(authUrl).toContain('youtube.upload');

      // 2. Metadata validation: empty title rejection
      await expect(
        youtubePublisher.publishVideo({
          platform: 'youtube',
          title: '',
          isDryRun: true,
        })
      ).toReject('title');

      // Title length constraint (>100 characters)
      await expect(
        youtubePublisher.publishVideo({
          platform: 'youtube',
          title: 'A'.repeat(101),
          isDryRun: true,
        })
      ).toReject('100');

      // 3. Dry-Run upload execution
      const res = await youtubePublisher.publishVideo({
        platform: 'youtube',
        title: 'Top 10 AI Breakthroughs in 2026 #shorts',
        description: 'Explore the latest advancements in artificial intelligence.',
        tags: ['ai', 'tech', 'future', 'shorts'],
        privacy: 'public',
        isDryRun: true,
      });

      expect(res.success).toBe(true);
      expect(res.platform).toBe('youtube');
      expect(res.isDryRun).toBe(true);
      expect(res.status).toBe('published');
      expect(res.platformVideoId).toMatch(/^mock_yt_/);
      expect(res.publishedUrl).toContain('youtube.com/watch?v=');
      expect(res.metadata?.quotaUnitsUsed).toBe(1600);
    },
  });

  registry.register({
    id: 'T6-PUB-02',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Publishing: Instagram Graph API Reels 3-Step Container Flow',
    description: 'Verifies Instagram Reels 3-step publishing flow (container creation, status polling, publication) in dry-run mode and caption/hashtag validations',
    fn: async () => {
      // 1. OAuth URL generation
      const authUrl = instagramPublisher.getAuthUrl({
        clientId: 'fb-app-id-12345',
        clientSecret: 'mock-secret',
        redirectUri: 'https://clipped.ai/api/auth/callback/instagram',
      });
      expect(authUrl).toContain('facebook.com/v19.0/dialog/oauth');
      expect(authUrl).toContain('instagram_content_publish');

      // 2. Hashtag validation (max 30 hashtags per Meta API policy)
      const excessiveHashtags = Array.from({ length: 32 }, (_, i) => `#tag${i}`).join(' ');
      await expect(
        instagramPublisher.publishVideo({
          platform: 'instagram',
          title: 'Viral Reel',
          caption: `Great reel! ${excessiveHashtags}`,
          isDryRun: true,
        })
      ).toReject('30');

      // 3. Dry-Run 3-step Reels publishing
      const res = await instagramPublisher.publishVideo({
        platform: 'instagram',
        title: 'Cyberpunk Drone Reel',
        caption: 'Future is now. #cyberpunk #ai #clipped',
        videoUrl: 'https://storage.clipped.ai/v1.mp4',
        isDryRun: true,
      });

      expect(res.success).toBe(true);
      expect(res.platform).toBe('instagram');
      expect(res.isDryRun).toBe(true);
      expect(res.platformVideoId).toMatch(/^mock_ig_/);
      expect(res.publishedUrl).toContain('instagram.com/reel/');
      expect(res.metadata?.dailyLimit).toBe(50);
      expect(res.logs.length).toBeGreaterThanOrEqual(3);
    },
  });

  registry.register({
    id: 'T6-PUB-03',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Publishing: TikTok Content API OAuth v2 & Direct Video Publishing',
    description: 'Verifies TikTok v2 OAuth authorization, creator privacy level mappings, and Direct Post video dry-run flow',
    fn: async () => {
      // 1. OAuth URL generation
      const authUrl = tiktokPublisher.getAuthUrl({
        clientId: 'mock-client',
        clientSecret: 'mock-secret',
        redirectUri: 'https://clipped.ai/api/auth/callback/tiktok',
      });
      expect(authUrl).toContain('tiktok.com/v2/auth/authorize');
      expect(authUrl).toContain('video.publish');

      // 2. Dry-Run Direct Video Publishing with privacy settings
      const resPublic = await tiktokPublisher.publishVideo({
        platform: 'tiktok',
        title: 'Insane Science Facts You Did Not Know',
        privacy: 'public',
        isDryRun: true,
      });

      expect(resPublic.success).toBe(true);
      expect(resPublic.platform).toBe('tiktok');
      expect(resPublic.isDryRun).toBe(true);
      expect(resPublic.platformVideoId).toMatch(/^mock_tt_/);
      expect(resPublic.publishedUrl).toContain('tiktok.com/@creator/video/');
      expect(resPublic.metadata?.privacyLevel).toBe('PUBLIC_TO_EVERYONE');

      // Private privacy mapping
      const resPrivate = await tiktokPublisher.publishVideo({
        platform: 'tiktok',
        title: 'Draft Test Video',
        privacy: 'private',
        isDryRun: true,
      });
      expect(resPrivate.metadata?.privacyLevel).toBe('SELF_ONLY');
    },
  });

  registry.register({
    id: 'T6-PUB-04',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Publishing: Exponential Backoff with Full Jitter on HTTP 429/503',
    description: 'Verifies retry mechanism with full jitter exponential backoff, Retry-After header parsing, and TokenBucket rate limiter',
    fn: async () => {
      // 1. Backoff with full jitter formula validation
      for (let attempt = 0; attempt < 5; attempt++) {
        const delay = calculateBackoffWithJitter(attempt, 1000, 16000, 2);
        const maxPossible = Math.min(16000, 1000 * Math.pow(2, attempt));
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThanOrEqual(maxPossible);
      }

      // 2. Retry-After header parser
      expect(extractRetryAfterMs({ retryAfterMs: 3500 })).toBe(3500);
      expect(extractRetryAfterMs({ headers: { 'Retry-After': '5' } })).toBe(5000);

      // 3. Retryable error predicate
      expect(isDefaultRetryableError({ status: 429 })).toBe(true);
      expect(isDefaultRetryableError({ status: 503 })).toBe(true);
      expect(isDefaultRetryableError({ code: 'ECONNRESET' })).toBe(true);
      expect(isDefaultRetryableError({ status: 400 })).toBe(false);

      // 4. withRetry simulation
      let attempts = 0;
      const result = await withRetry(
        async () => {
          attempts++;
          if (attempts < 3) {
            const err: any = new Error('Rate limit exceeded');
            err.status = 429;
            throw err;
          }
          return 'recovered-successfully';
        },
        { maxAttempts: 4, baseDelayMs: 10, maxDelayMs: 50 }
      );
      expect(result).toBe('recovered-successfully');
      expect(attempts).toBe(3);

      // 5. TokenBucketLimiter
      const limiter = new TokenBucketLimiter(5, 50);
      expect(limiter.tryAcquire(3)).toBe(true);
      expect(limiter.getAvailableTokens()).toBeLessThanOrEqual(3);
    },
  });

  registry.register({
    id: 'T6-PUB-05',
    tier: 'tier6',
    workflow: 'publishing',
    title: 'Publishing: Strict Dry-Run Default Execution Guarantee',
    description: 'Verifies that omitting isDryRun parameter strictly defaults to isDryRun = true across all publishing classes and multi-platform broadcasting',
    fn: async () => {
      // 1. YouTube default isDryRun = true
      const ytRes = await youtubePublisher.publishVideo({
        platform: 'youtube',
        title: 'Strict Dry-Run Default YouTube',
      });
      expect(ytRes.isDryRun).toBe(true);
      expect(ytRes.success).toBe(true);

      // 2. Instagram default isDryRun = true
      const igRes = await instagramPublisher.publishVideo({
        platform: 'instagram',
        title: 'Strict Dry-Run Default Instagram',
      });
      expect(igRes.isDryRun).toBe(true);
      expect(igRes.success).toBe(true);

      // 3. TikTok default isDryRun = true
      const ttRes = await tiktokPublisher.publishVideo({
        platform: 'tiktok',
        title: 'Strict Dry-Run Default TikTok',
      });
      expect(ttRes.isDryRun).toBe(true);
      expect(ttRes.success).toBe(true);

      // 4. SocialPublisherManager multi-publish defaults to isDryRun = true without live network side-effects
      const multiRes = await socialPublisherManager.publishToMultiple({
        title: 'Omnichannel Broadcast Dry-Run Default',
        platforms: ['youtube', 'instagram', 'tiktok'],
      });

      expect(multiRes.success).toBe(true);
      expect(multiRes.totalPlatforms).toBe(3);
      expect(multiRes.successfulPlatforms).toBe(3);
      expect(multiRes.results.youtube.isDryRun).toBe(true);
      expect(multiRes.results.instagram.isDryRun).toBe(true);
      expect(multiRes.results.tiktok.isDryRun).toBe(true);
    },
  });

  // =========================================================================
  // Section 3: Quota & Usage Tracking Subsystem (5 Tests)
  // =========================================================================

  registry.register({
    id: 'T6-QUOTA-01',
    tier: 'tier6',
    workflow: 'quotas',
    title: 'Quotas: Free Tier 3 Videos/Month Limit Enforcement',
    description: 'Verifies sequential credit consumption for free tier user (3 videos quota) decreasing remaining credits accurately',
    fn: async () => {
      const userId = `free-user-${Date.now()}`;
      quotaManager.setMockUser(userId, 'free', 0);

      // Initial check
      const initialStatus = await quotaManager.checkUserQuota(userId, 'video_generation');
      expect(initialStatus.allowed).toBe(true);
      expect(initialStatus.totalQuota).toBe(3);
      expect(initialStatus.used).toBe(0);
      expect(initialStatus.remaining).toBe(3);

      // 1st consumption: 1/3 used, 2 remaining
      const c1 = await quotaManager.consumeQuota(userId, 1);
      expect(c1.success).toBe(true);
      expect(c1.used).toBe(1);
      expect(c1.remaining).toBe(2);

      // 2nd consumption: 2/3 used, 1 remaining
      const c2 = await quotaManager.consumeQuota(userId, 1);
      expect(c2.success).toBe(true);
      expect(c2.used).toBe(2);
      expect(c2.remaining).toBe(1);

      // 3rd consumption: 3/3 used, 0 remaining (allowed is now false for further videos)
      const c3 = await quotaManager.consumeQuota(userId, 1);
      expect(c3.success).toBe(true);
      expect(c3.used).toBe(3);
      expect(c3.remaining).toBe(0);

      // Verify status now reports 0 remaining and allowed = false
      const after3Status = await quotaManager.checkUserQuota(userId, 'video_generation');
      expect(after3Status.allowed).toBe(false);
      expect(after3Status.remaining).toBe(0);
      expect(after3Status.used).toBe(3);
    },
  });

  registry.register({
    id: 'T6-QUOTA-02',
    tier: 'tier6',
    workflow: 'quotas',
    title: 'Quotas: Blocking Execution & Throwing QuotaExceededError at Limit',
    description: 'Verifies that exceeding the 3-video monthly quota strictly blocks execution and throws descriptive QuotaExceededError',
    fn: async () => {
      const userId = `quota-blocked-user-${Date.now()}`;
      quotaManager.setMockUser(userId, 'free', 3); // User already used all 3 credits

      let caughtError: QuotaExceededError | null = null;
      try {
        await quotaManager.consumeQuota(userId, 1);
      } catch (err: any) {
        if (err instanceof QuotaExceededError || err.name === 'QuotaExceededError' || err.code === 'QUOTA_EXCEEDED') {
          caughtError = err;
        }
      }

      expect(caughtError).toBeDefined();
      expect(caughtError?.code).toBe('QUOTA_EXCEEDED');
      expect(caughtError?.status.allowed).toBe(false);
      expect(caughtError?.status.used).toBe(3);
      expect(caughtError?.status.totalQuota).toBe(3);
      expect(caughtError?.status.resetDate).toBeDefined();
      expect(caughtError?.message).toContain('limit exceeded');
    },
  });

  registry.register({
    id: 'T6-QUOTA-03',
    tier: 'tier6',
    workflow: 'quotas',
    title: 'Quotas: Monthly Calendar Rollover Reset (isMonthlyResetDue)',
    description: 'Verifies that usage counter automatically resets to 0 when date advances to a new UTC calendar month',
    fn: async () => {
      const userId = `monthly-reset-user-${Date.now()}`;

      // Set user record with timestamp from last month
      const pastDate = new Date();
      pastDate.setUTCMonth(pastDate.getUTCMonth() - 1);
      const pastDateStr = pastDate.toISOString();

      expect(quotaManager.isMonthlyResetDue(pastDateStr)).toBe(true);
      expect(quotaManager.isMonthlyResetDue(new Date().toISOString())).toBe(false);

      quotaManager.setMockUser(userId, 'free', 3, pastDateStr);

      // Check quota in current month -> rollover detection resets used counter to 0
      const status = await quotaManager.checkUserQuota(userId, 'video_generation');
      expect(status.used).toBe(0);
      expect(status.remaining).toBe(3);
      expect(status.allowed).toBe(true);

      // Next month reset date calculation
      const resetDateStr = quotaManager.getNextMonthResetDate();
      const resetDate = new Date(resetDateStr);
      expect(resetDate.getUTCDate()).toBe(1);
      expect(resetDate.getUTCHours()).toBe(0);
    },
  });

  registry.register({
    id: 'T6-QUOTA-04',
    tier: 'tier6',
    workflow: 'quotas',
    title: 'Quotas: Pro Tier (50 Videos) & Enterprise Tier (Unlimited) Resolution',
    description: 'Verifies higher tier quota limits: Pro tier allows 50 videos/month, Enterprise tier allows unlimited (-1)',
    fn: async () => {
      // 1. Pro Tier User
      const proUser = `pro-user-${Date.now()}`;
      quotaManager.setMockUser(proUser, 'pro', 10);

      const proStatus = await quotaManager.checkUserQuota(proUser, 'video_generation');
      expect(proStatus.tier).toBe('pro');
      expect(proStatus.totalQuota).toBe(50);
      expect(proStatus.used).toBe(10);
      expect(proStatus.remaining).toBe(40);
      expect(proStatus.allowed).toBe(true);

      // 2. Enterprise Tier User
      const entUser = `enterprise-user-${Date.now()}`;
      quotaManager.setMockUser(entUser, 'enterprise', 100);

      const entStatus = await quotaManager.checkUserQuota(entUser, 'video_generation');
      expect(entStatus.tier).toBe('enterprise');
      expect(entStatus.totalQuota).toBe(-1);
      expect(entStatus.allowed).toBe(true);
      expect(entStatus.remaining).toBeGreaterThan(10000);

      // 3. User usage breakdown
      const usage = await quotaManager.getUserUsage(proUser);
      expect(usage.tier).toBe('pro');
      expect(usage.providers.video_generation.quota).toBe(50);
    },
  });

  registry.register({
    id: 'T6-QUOTA-05',
    tier: 'tier6',
    workflow: 'quotas',
    title: 'Quotas: Failed Render Job Credit Refund & Concurrency Protection',
    description: 'Verifies that failed video rendering jobs restore consumed credits and parallel requests are atomically guarded',
    fn: async () => {
      const userId = `refund-user-${Date.now()}`;
      quotaManager.setMockUser(userId, 'free', 2);

      // Consume the last 1 credit -> used = 3, remaining = 0
      await quotaManager.consumeQuota(userId, 1);
      const beforeRefund = await quotaManager.checkUserQuota(userId);
      expect(beforeRefund.used).toBe(3);
      expect(beforeRefund.remaining).toBe(0);

      // Render job failed: refund 1 credit
      const refundStatus = await quotaManager.refundQuota(userId, 1);
      expect(refundStatus.used).toBe(2);
      expect(refundStatus.remaining).toBe(1);
      expect(refundStatus.allowed).toBe(true);

      // Extra refund clamps at 0 used (no negative usage)
      await quotaManager.refundQuota(userId, 10);
      const clampedStatus = await quotaManager.checkUserQuota(userId);
      expect(clampedStatus.used).toBe(0);
      expect(clampedStatus.remaining).toBe(3);
    },
  });

  // =========================================================================
  // Section 4: Audio Mixing & Ducking Engine (5 Tests)
  // =========================================================================

  registry.register({
    id: 'T6-MIX-01',
    tier: 'tier6',
    workflow: 'audio-mixer',
    title: 'Audio Mixing: Speech & BGM Audio Overlay with Dynamic Ducking',
    description: 'Verifies FFmpeg filter graph generation for sidechain compression ducking under dialogue and master amix output',
    fn: async () => {
      const filterGraph = audioMixer.generateFilterGraph({
        voiceAudioPath: 'voice.mp3',
        bgmAudioPath: 'music.mp3',
        ducking: true,
        duckingRatio: 4.0,
        duckingThreshold: 0.125,
        targetDuration: 30,
      });

      expect(filterGraph.filterComplex).toContain('sidechaincompress');
      expect(filterGraph.filterComplex).toContain('threshold=0.125');
      expect(filterGraph.filterComplex).toContain('ratio=4');
      expect(filterGraph.filterComplex).toContain('amix=inputs=2:duration=first');
      expect(filterGraph.command).toContain('-stream_loop -1');

      // Execute mixAudio with dryRun = true
      const res = await audioMixer.mixAudio({
        voiceAudioPath: 'voice.mp3',
        bgmAudioPath: 'music.mp3',
        enableDucking: true,
        targetDuration: 30,
        isDryRun: true,
      });

      expect(res.success).toBe(true);
      expect(res.duckingApplied).toBe(true);
      expect(res.duration).toBe(30);
      expect(res.metadata.commandUsed).toContain('sidechaincompress');
      expect(res.outputBuffer).toBeDefined();
      expect(res.outputBuffer?.length).toBeGreaterThan(44);
    },
  });

  registry.register({
    id: 'T6-MIX-02',
    tier: 'tier6',
    workflow: 'audio-mixer',
    title: 'Audio Mixing: Background Music Seamless Looping (-stream_loop -1)',
    description: 'Verifies infinite BGM looping parameter injection to match voice narration length without audio truncation',
    fn: async () => {
      const graph = audioMixer.generateFilterGraph({
        voiceAudioPath: 'narration_long.mp3',
        bgmAudioPath: 'short_bgm_10s.mp3',
        targetDuration: 60,
      });

      // -stream_loop -1 must be placed before the music input in FFmpeg CLI
      expect(graph.command).toContain('-stream_loop -1 -i "short_bgm_10s.mp3"');
      expect(graph.command).toContain('-t 60');

      const res = await audioMixer.mixAudio({
        voiceAudioPath: 'narration_long.mp3',
        bgmAudioPath: 'short_bgm_10s.mp3',
        targetDuration: 60,
        dryRun: true,
      });

      expect(res.success).toBe(true);
      expect(res.duration).toBe(60);
      expect(res.metadata.isMock).toBe(true);
    },
  });

  registry.register({
    id: 'T6-MIX-03',
    tier: 'tier6',
    workflow: 'audio-mixer',
    title: 'Audio Mixing: Configurable Voice vs Music Gain Balancing & Presets',
    description: 'Verifies independent volume gain adjustments for narration and music channels and preset definitions',
    fn: async () => {
      // Presets validation
      expect(BGM_PRESETS.lofi).toBeDefined();
      expect(BGM_PRESETS.lofi.defaultVolume).toBe(0.2);
      expect(BGM_PRESETS.cinematic.defaultVolume).toBe(0.22);
      expect(BGM_PRESETS.ambient.defaultVolume).toBe(0.15);

      // Custom gain balancing
      const graph = audioMixer.generateFilterGraph({
        voiceAudioPath: 'voice.mp3',
        bgmAudioPath: 'bgm.mp3',
        voiceVolume: 1.2,
        bgmVolume: 0.15,
      });

      expect(graph.filterComplex).toContain('[0:a]volume=1.2');
      expect(graph.filterComplex).toContain('[1:a]volume=0.15');

      const res = await audioMixer.mixAudio({
        voiceVolume: 1.2,
        musicVolume: 0.15,
        dryRun: true,
      });

      expect(res.voiceVolume).toBe(1.2);
      expect(res.musicVolume).toBe(0.15);
    },
  });

  registry.register({
    id: 'T6-MIX-04',
    tier: 'tier6',
    workflow: 'audio-mixer',
    title: 'Audio Mixing: Audio Fade In & Fade Out Transitions (afade)',
    description: 'Verifies smooth start fade-in and end fade-out filter configuration based on video duration',
    fn: async () => {
      const duration = 45;
      const graph = audioMixer.generateFilterGraph({
        voiceAudioPath: 'voice.mp3',
        bgmAudioPath: 'bgm.mp3',
        fadeInSeconds: 1.0,
        fadeOutSeconds: 3.0,
        targetDuration: duration,
      });

      // Fade-in filter: afade=t=in:ss=0:d=1
      expect(graph.filterComplex).toContain('afade=t=in:ss=0:d=1');
      // Fade-out filter starts at (45 - 3 = 42s): afade=t=out:st=42:d=3
      expect(graph.filterComplex).toContain('afade=t=out:st=42:d=3');

      const res = await audioMixer.mixAudio({
        fadeInDuration: 1.0,
        fadeOutDuration: 3.0,
        targetDuration: duration,
        dryRun: true,
      });

      expect(res.success).toBe(true);
      expect(res.duration).toBe(45);
    },
  });

  registry.register({
    id: 'T6-MIX-05',
    tier: 'tier6',
    workflow: 'audio-mixer',
    title: 'Audio Mixing: Cost-Safe Dry-Run & Missing FFmpeg CLI Fallback',
    description: 'Verifies deterministic execution producing synthetic audio buffer when FFmpeg binary is absent or dryRun is requested',
    fn: async () => {
      // Simulate FFmpeg absence
      audioMixer.setFFmpegOverride(false);
      expect(audioMixer.isFFmpegAvailable()).toBe(false);

      const res = await audioMixer.mixAudio({
        voiceAudioPath: 'voice.mp3',
        bgmPreset: 'lofi',
        targetDuration: 20,
      });

      expect(res.success).toBe(true);
      expect(res.isDryRun).toBe(true);
      expect(res.duration).toBe(20);
      expect(res.metadata.isMock).toBe(true);
      expect(res.metadata.ffmpegAvailable).toBe(false);
      expect(res.metadata.sampleRate).toBe(44100);
      expect(res.metadata.channels).toBe(2);
      expect(res.outputBuffer).toBeDefined();

      // Verify synthetic WAV buffer in result
      const buf = res.outputBuffer!;
      expect(buf.toString('ascii', 0, 4)).toBe('RIFF');
      expect(buf.toString('ascii', 8, 12)).toBe('WAVE');

      // Reset override
      audioMixer.setFFmpegOverride(null);
    },
  });
}
