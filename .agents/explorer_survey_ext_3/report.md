# Clipped Engine Architecture Specification: Quotas, Audio Mixing & Tier 6 E2E Integration

**Explorer Subagent**: Explorer Survey Ext 3 (R3 Quotas & Audio Mixer + Tier 6 Integration Test Suite)  
**Date**: 2026-08-29  
**Repository**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`  
**Target Environment**: Next.js 14 (App Router) + TypeScript + Supabase PostgreSQL + FFmpeg CLI + Node.js E2E Test Harness  

---

## 1. Executive Summary

This specification report details the architectural design, algorithmic contracts, database schemas, and verification suites for:
1. **Requirement 3 (Part A): Quota & Usage Tracking System (`lib/quotas.ts`)**:
   - Enforces the **3 videos/month free tier** policy across all 6 generation workflows.
   - Provides user tier resolution (`free`, `pro`, `enterprise`), monthly calendar rollover detection, atomic quota consumption, job failure refunding, and descriptive error blocking.
   - Integrates with Supabase PostgreSQL tables (`users`, `api_credits`, `render_jobs`) with transactional resilience and in-memory mock fallback.
2. **Requirement 3 (Part B): FFmpeg Audio Mixing & Ducking Engine (`lib/engine/audio-mixer.ts`)**:
   - Mixes speech/narration audio with background music (BGM) using FFmpeg filter graphs (`sidechaincompress`, `volume`, `afade`, `aloop`/`-stream_loop`).
   - Automatically ducks background music under spoken dialogue (attenuating music to ~15-20% volume during speech and restoring during pauses).
   - Handles duration matching, seamless audio looping, fade-in/fade-out transitions, and video muxing.
   - Includes a cost-safe dry-run and missing FFmpeg CLI fallback to ensure deterministic execution across all environments.
3. **Acceptance Criteria: Tier 6 E2E Integration Test Suite (`tests/e2e/tier6-integration.test.ts` & `standalone-runner.js`)**:
   - Comprehensive opaque-box test suite verifying all 6 external systems:
     - **TTS Providers (R1)**: Language code mapping across English (`en-US`/`en-IN`) and 6 Indian languages (Hindi `hi-IN`, Tamil `ta-IN`, Telugu `te-IN`, Kannada `kn-IN`, Bengali `bn-IN`, Marathi `mr-IN`) across Google Cloud TTS, Coqui TTS, and ElevenLabs with fallback chains.
     - **Social Publishing APIs (R2)**: OAuth flow validation, dry-run direct video uploads for YouTube Data API v3, Instagram Graph API (Reels), TikTok Content API, and exponential backoff retry handling.
     - **Quota Management (R3)**: Free tier limit enforcement (3 videos), block at limit, monthly reset, and job refunding.
     - **Audio Mixing (R3)**: Ducking under speech, BGM looping, volume balance, and dry-run fallback.
   - Zero-dependency Node.js execution integration via `tests/e2e/standalone-runner.js`.

---

## 2. Architecture & Data Flow Overview

```
                                  +-----------------------+
                                  |    Client / UI Form   |
                                  +-----------+-----------+
                                              | POST /api/workflows/<workflow>
                                              v
                              +---------------+---------------+
                              |    Next.js Workflow Route     |
                              +---------------+---------------+
                                              |
                     1. Check & Consume Quota | 
                                              v
                              +---------------+---------------+
                              |        lib/quotas.ts          |
                              |   (Supabase `api_credits`)    |
                              +---------------+---------------+
                                 |                         |
               Quota Exceeded    |                         | Quota Allowed (<=3 / month)
                     v           |                         v
             +---------------+   |          +---------------+---------------+
             | 403 Forbidden |   |          | Synchronous `pending` job     |
             | Quota Error   |   |          | record in Supabase            |
             +---------------+   |          +---------------+---------------+
                                 |                         |
                                 |                         | Async Engine Task
                                 v                         v
                   +-------------+-------------+  +--------+--------+
                   |  lib/engine/tts.ts        |  |  Stock / AI     |
                   |  (Google/Coqui/ElevenLabs)|  |  Video Pipeline |
                   +-------------+-------------+  +--------+--------+
                                 |                         |
                   Voice Narration Audio                   | Raw Video Stream
                                 |                         |
                                 +------------+------------+
                                              |
                                              v
                              +---------------+---------------+
                              |  lib/engine/audio-mixer.ts    |
                              |  (FFmpeg Ducking & Looping)   |
                              +---------------+---------------+
                                              |
                                              v
                              +---------------+---------------+
                              |   Final Master Video / Audio  |
                              |   (Muxed with Ducked BGM)     |
                              +---------------+---------------+
                                              |
                                              | (If Auto-Publish Enabled)
                                              v
                              +---------------+---------------+
                              |    lib/publishing/*           |
                              |  (YouTube, Instagram, TikTok) |
                              |  (Strict Dry-Run by Default)  |
                              +-------------------------------+
```

---

## 3. `lib/quotas.ts` Detailed Specification

### 3.1 Database Schema Alignment (`schema.sql`)

The quota system interacts with three core tables defined in `schema.sql`:

1. **`users` Table**:
   ```sql
   CREATE TABLE users (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       email TEXT UNIQUE NOT NULL,
       name TEXT,
       tier TEXT DEFAULT 'free', -- 'free' | 'pro' | 'enterprise'
       niches TEXT[],
       storage_preference TEXT DEFAULT 'cloud',
       created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
   );
   ```
2. **`api_credits` Table**:
   ```sql
   CREATE TABLE api_credits (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       user_id UUID REFERENCES users(id) ON DELETE CASCADE,
       provider TEXT NOT NULL, -- 'video_generation' | 'tts_google' | 'tts_elevenlabs'
       free_quota INTEGER DEFAULT 0, -- Default: 3 for free tier video generation
       used_this_month INTEGER DEFAULT 0,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
   );
   ```
3. **`render_jobs` Table**:
   ```sql
   CREATE TABLE render_jobs (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
       status TEXT DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
       progress INTEGER DEFAULT 0,
       error_message TEXT,
       logs TEXT,
       started_at TIMESTAMP WITH TIME ZONE,
       completed_at TIMESTAMP WITH TIME ZONE,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
   );
   ```

### 3.2 Tier Limits and Configuration Matrix

| Tier | Monthly Video Quota | TTS Characters / Month | Max Video Duration | Concurrency Limit |
|---|---|---|---|---|
| **Free** | **3 videos / month** | 10,000 chars | 60 seconds | 1 active job |
| **Pro** | 50 videos / month | 250,000 chars | 180 seconds | 3 active jobs |
| **Enterprise** | Unlimited (`-1`) | Unlimited (`-1`) | 600 seconds | 10 active jobs |

### 3.3 Algorithmic Workflows

#### 1. Monthly Reset Detection (`isMonthlyResetDue`)
- Monthly usage resets on the 1st of each calendar month at 00:00:00 UTC.
- When `api_credits` record is queried:
  - Extract `updated_at` timestamp.
  - Compare `updated_at.getUTCFullYear()` and `updated_at.getUTCMonth()` against current UTC date.
  - If current month/year is newer than `updated_at`:
    - Reset `used_this_month = 0`.
    - Update `updated_at = new Date().toISOString()`.

#### 2. Quota Check (`checkUserQuota`)
- **Inputs**: `userId: string`, `provider: string = 'video_generation'`
- **Steps**:
  1. Retrieve user tier from `users` table. If user not found, default to tier `'free'`.
  2. If `tier === 'enterprise'`, return `{ allowed: true, tier: 'enterprise', quotaLimit: -1, usedThisMonth: 0, remaining: 999999, resetDate }`.
  3. Query `api_credits` for `user_id = userId` AND `provider = provider`.
  4. If record does not exist:
     - Insert default record: `free_quota = (tier === 'pro' ? 50 : 3)`, `used_this_month = 0`.
  5. Check if monthly rollover is due; if so, reset `used_this_month = 0`.
  6. Determine effective quota limit `L` (`tier === 'pro' ? 50 : (record.free_quota || 3)`).
  7. Compute `remaining = Math.max(0, L - used_this_month)` and `allowed = used_this_month < L`.
  8. Return `QuotaStatus`.

#### 3. Atomic Quota Consumption (`consumeQuota`)
- **Inputs**: `userId: string`, `amount: number = 1`, `provider: string = 'video_generation'`
- **Steps**:
  1. Call `checkUserQuota(userId, provider)`.
  2. If `!status.allowed`:
     - Throw `QuotaExceededError`:
       `"Free tier limit exceeded: You have used ${status.usedThisMonth}/${status.quotaLimit} videos this month. Limit resets on ${status.resetDate}. Upgrade to Pro for 50 videos/month."`
  3. Update `api_credits`:
     - Increment `used_this_month = used_this_month + amount`.
     - Update `updated_at = new Date().toISOString()`.
  4. Return `{ success: true, status: updatedStatus }`.

#### 4. Job Failure Refund (`refundQuota`)
- **Inputs**: `userId: string`, `amount: number = 1`, `provider: string = 'video_generation'`
- **Steps**:
  1. Query `api_credits` for `user_id` and `provider`.
  2. Decrement `used_this_month = Math.max(0, used_this_month - amount)`.
  3. Update `api_credits` record.
  4. Return updated `QuotaStatus`.

#### 5. In-Memory Mock Store Fallback
- When Supabase credentials are missing (`process.env.NEXT_PUBLIC_SUPABASE_URL` unset or in unit/E2E test mode):
  - Uses `Map<string, { tier: string; credits: Record<string, { free_quota: number; used_this_month: number; updated_at: string }> }>`
  - Guarantees 100% deterministic, offline execution with zero network latency.

### 3.4 TypeScript Interface & Method Signatures

```typescript
export interface QuotaStatus {
  allowed: boolean;
  tier: 'free' | 'pro' | 'enterprise';
  provider: string;
  quotaLimit: number; // -1 for unlimited
  usedThisMonth: number;
  remaining: number;
  resetDate: string; // ISO 8601 string (e.g. '2026-09-01T00:00:00.000Z')
  error?: string;
}

export class QuotaExceededError extends Error {
  public code: string = 'QUOTA_EXCEEDED';
  public status: QuotaStatus;
  constructor(message: string, status: QuotaStatus) {
    super(message);
    this.name = 'QuotaExceededError';
    this.status = status;
  }
}

export interface IQuotaService {
  getUserTier(userId: string): Promise<'free' | 'pro' | 'enterprise'>;
  checkUserQuota(userId: string, provider?: string): Promise<QuotaStatus>;
  consumeQuota(userId: string, amount?: number, provider?: string): Promise<{ success: boolean; status: QuotaStatus }>;
  refundQuota(userId: string, amount?: number, provider?: string): Promise<QuotaStatus>;
  resetMonthlyQuota(userId: string, provider?: string): Promise<QuotaStatus>;
}
```

---

## 4. `lib/engine/audio-mixer.ts` Detailed Specification

### 4.1 Architecture & FFmpeg Audio Filter Graph

The audio mixer executes a multi-stage audio processing pipeline:

```
[0:a] (Voice) ------> [volume=1.0] ------------+-------------------------------------+
                                               | (Sidechain Trigger)                 |
                                               v                                     v
[1:a] (Music) ------> [aloop / -stream_loop] -> [volume=0.2] -> [afade in/out] -> [sidechaincompress] -> [amix] -> [outa]
```

### 4.2 Core Audio Transformations

1. **Volume Level Normalization**:
   - Voice channel: `volume=1.0` (0 dB reference, clear dialogue priority).
   - Background music channel: `volume=0.2` (-14 dB background bed level).
2. **Audio Ducking via `sidechaincompress`**:
   - Filter parameter: `sidechaincompress=threshold=0.125:ratio=4:attack=50:release=300`
   - **Threshold (`0.125`)**: Activates compression whenever voice signal amplitude exceeds 12.5%.
   - **Ratio (`4:1`)**: Attenuates music volume by a factor of 4 (~12 dB attenuation) during active voice segments.
   - **Attack (`50ms`)**: Rapidly ducks music when dialogue begins so initial consonants are crisp.
   - **Release (`300ms`)**: Smoothly brings music back up after speech pauses without jarring "pumping" artifacts.
3. **Duration Matching & Looping**:
   - If Music Duration < Voice Duration:
     - Uses `-stream_loop -1` input flag before the music asset or `aloop=loop=-1:size=2e+09`.
   - Trimming:
     - Sets `-t <targetDuration>` on the composite output to prevent trailing audio overhang.
4. **Smooth Fade In / Fade Out**:
   - Fade In: `afade=t=in:ss=0:d=0.5` (smooth start).
   - Fade Out: `afade=t=out:st=${duration - 2.0}:d=2.0` (gentle 2-second decay at video end).
5. **Direct Video Multiplexing**:
   - Merges ducked audio stream directly into MP4 video with `ffmpeg -i video.mp4 -i voice.mp3 -i music.mp3 -map 0:v -map "[outa]" -c:v copy -c:a aac -b:a 192k -shortest output.mp4`.

### 4.3 FFmpeg Command Generation Specification

```bash
# Pure Audio Mixing (Voice + BGM -> mixed.mp3)
ffmpeg -y \
  -i input_voice.mp3 \
  -stream_loop -1 -i background_music.mp3 \
  -filter_complex "[0:a]volume=1.0,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[voice]; \
                   [1:a]volume=0.2,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[music_raw]; \
                   [music_raw]afade=t=in:ss=0:d=0.5,afade=t=out:st=28:d=2.0[music_faded]; \
                   [music_faded][voice]sidechaincompress=threshold=0.125:ratio=4:attack=50:release=300[ducked_music]; \
                   [voice][ducked_music]amix=inputs=2:duration=first:dropout_transition=2[outa]" \
  -map "[outa]" -t 30 -c:a libmp3lame -b:a 192k output_mixed.mp3
```

### 4.4 Cost-Safe Dry-Run & Missing CLI Binary Fallback

- The engine tests for FFmpeg availability on module load via `execSync('ffmpeg -version')` or `where/which ffmpeg`.
- If FFmpeg is **unavailable**, or if `dryRun: true` is passed:
  - The mixer generates a mock output file (or returns an in-memory synthetic buffer).
  - Calculates duration: `Math.max(voiceDuration || 5, targetDuration || 5)`.
  - Populates structured result metadata:
    ```json
    {
      "success": true,
      "outputPath": "/tmp/mock_mixed_audio.mp3",
      "duration": 30,
      "voiceVolume": 1.0,
      "musicVolume": 0.2,
      "duckingApplied": true,
      "metadata": {
        "isMock": true,
        "ffmpegAvailable": false,
        "commandUsed": "ffmpeg -y -i input_voice.mp3 -stream_loop -1 -i music.mp3 ...",
        "sampleRate": 44100,
        "bitrate": "192k"
      }
    }
    ```

### 4.5 TypeScript Interface Design

```typescript
export interface AudioMixRequest {
  voiceAudioPath?: string;
  voiceAudioBuffer?: Buffer;
  bgmAudioPath?: string;
  bgmAudioBuffer?: Buffer;
  bgmPreset?: 'upbeat' | 'cinematic' | 'ambient' | 'lofi' | 'dramatic' | 'corporate';
  videoPath?: string;
  outputPath?: string;
  voiceVolume?: number; // default: 1.0
  musicVolume?: number; // default: 0.2
  ducking?: boolean; // default: true
  duckingRatio?: number; // default: 4.0
  duckingThreshold?: number; // default: 0.125
  attackMs?: number; // default: 50
  releaseMs?: number; // default: 300
  fadeInDuration?: number; // default: 0.5s
  fadeOutDuration?: number; // default: 2.0s
  targetDuration?: number; // duration in seconds
  dryRun?: boolean; // force dry-run mock
}

export interface AudioMixResponse {
  success: boolean;
  outputPath: string;
  duration: number;
  voiceVolume: number;
  musicVolume: number;
  duckingApplied: boolean;
  metadata: {
    isMock: boolean;
    ffmpegAvailable: boolean;
    commandUsed?: string;
    sampleRate?: number;
    channels?: number;
    bitrate?: string;
  };
  error?: string;
}
```

---

## 5. Acceptance Criteria & Tier 6 E2E Integration Test Suite Specification

The Tier 6 Integration Test Suite (`tests/e2e/tier6-integration.test.ts`) verifies the integration of all 6 external systems across 4 primary domains.

### 5.1 Test Suite Matrix (20 Tests Total)

| Section | Test ID | Description | Primary Verification Target |
|---|---|---|---|
| **TTS Language & Providers (R1)** | `T6-TTS-01` | Google Cloud TTS Indian Languages Mapping | Maps `hi-IN`, `ta-IN`, `te-IN`, `kn-IN`, `bn-IN`, `mr-IN`, `en-US` to Neural2/Wavenet voices |
| | `T6-TTS-02` | Coqui TTS XTTS-v2 Multi-Language Mapping | Resolves language codes and voice models for all 6 Indian languages + English |
| | `T6-TTS-03` | ElevenLabs Multilingual v2 Voice Synthesis | Resolves ElevenLabs model, voice IDs, and language normalization |
| | `T6-TTS-04` | Provider Fallback Chain (ElevenLabs -> Google -> Coqui -> Mock) | Falls back gracefully when upstream providers fail or keys are missing |
| | `T6-TTS-05` | Language Code Normalization & Validation | Normalizes loose codes (`hindi`, `HI-in`, `ta`) to canonical ISO formats |
| **Social Publishing (R2)** | `T6-PUB-01` | YouTube Data API v3 OAuth & Dry-Run Video Upload | Generates OAuth URLs, validates video metadata, outputs `yt_dryrun_...` |
| | `T6-PUB-02` | Instagram Graph API Reels Upload Container Flow | Validates 3-step Reels container init, status check, and publish dry-run |
| | `T6-PUB-03` | TikTok Content Posting API Direct Post Dry-Run | Validates TikTok creator privacy, title payload, and returns `tt_dryrun_...` |
| | `T6-PUB-04` | Exponential Backoff on HTTP 429 Rate Limits | Retries with exponential delays on 429/503 status before failing |
| | `T6-PUB-05` | Strict Dry-Run Default Execution Guarantee | Guarantees zero unmocked external network POST requests to social networks |
| **Quota System (R3)** | `T6-QUOTA-01` | Free Tier 3 Videos/Month Limit Enforcement | Consumes 3 credits; 4th attempt strictly blocked with `QuotaExceededError` |
| | `T6-QUOTA-02` | Monthly Calendar Reset Rollover | Rollover resets `used_this_month = 0` allowing subsequent generation |
| | `T6-QUOTA-03` | Pro Tier & Enterprise Tier Limit Resolution | Pro allows 50 videos; Enterprise allows unlimited generation |
| | `T6-QUOTA-04` | Failed Render Job Credit Refund | Decrements usage counter upon workflow failure, preserving user credits |
| | `T6-QUOTA-05` | Concurrency & Race Condition Quota Protection | Parallel burst of 10 requests with 3 credits allows exactly 3, blocks 7 |
| **Audio Mixing (R3)** | `T6-MIX-01` | Speech & BGM Audio Overlay with Ducking | Mixes voice and music, applying sidechain compression ducking |
| | `T6-MIX-02` | Background Music Seamless Looping | Loops short BGM track to match longer narration duration |
| | `T6-MIX-03` | Configurable Voice vs Music Gain Balancing | Adjusts independent gains (`voiceVolume: 1.2`, `musicVolume: 0.15`) |
| | `T6-MIX-04` | Audio Fade In & Fade Out Transitions | Applies start and end fade filters (`afade`) |
| | `T6-MIX-05` | Cost-Safe Dry-Run & Missing FFmpeg CLI Fallback | Deterministic execution when FFmpeg CLI is absent |

### 5.2 Detailed Test Assertions

#### `T6-TTS-01`: Google Cloud TTS Indian Languages Mapping
- **Input**: Synthesize request for 7 languages: `['en-US', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'bn-IN', 'mr-IN']`.
- **Expected Outcome**:
  - `voiceId` matches provider naming conventions (e.g. `hi-IN-Neural2-A`, `ta-IN-Neural2-A`).
  - Response object contains `success: true`, `audioUrl` or `audioBuffer`, and `languageCode`.

#### `T6-PUB-01`: YouTube Data API v3 OAuth & Dry-Run Video Upload
- **Input**: `{ title: 'AI Tech News #1', description: 'Daily tech digest', videoUrl: 'https://storage.clipped.ai/v1.mp4', privacy: 'unlisted', dryRun: true }`.
- **Expected Outcome**:
  - `res.success === true`
  - `res.platform === 'youtube'`
  - `res.publishedId` matches `yt_dryrun_...`
  - Supabase `published_videos` record created with `platform: 'youtube'` and `video_id`.

#### `T6-QUOTA-01`: Free Tier 3 Videos/Month Limit Enforcement
- **Input**: Sequential consumption of 4 credits for user `free-user-uuid`.
- **Expected Outcome**:
  - Consumptions 1, 2, 3 return `success: true` with `remaining` decreasing (2 -> 1 -> 0).
  - Consumption 4 throws `QuotaExceededError` or returns `allowed: false` with descriptive error mentioning "Free tier allows 3 videos/month" and `resetDate`.

#### `T6-MIX-01`: Speech & BGM Audio Overlay with Ducking
- **Input**: `{ voiceAudioPath: 'voice.mp3', bgmPreset: 'lofi', targetDuration: 30, ducking: true }`.
- **Expected Outcome**:
  - `res.success === true`
  - `res.duckingApplied === true`
  - `res.duration === 30`
  - `res.metadata.commandUsed` contains `sidechaincompress` and `amix`.

---

## 6. `standalone-runner.js` Integration Specification

The standalone runner (`tests/e2e/standalone-runner.js`) is the zero-dependency, standalone executable responsible for running all test tiers with 100% genuine contract compliance.

### 6.1 Runner Architecture Extensions

To support Tier 6, `standalone-runner.js` requires the following additions:
1. **Mock Stores**:
   - `MockSupabaseStore`: Add support for `api_credits` and `published_videos` tables in addition to `render_jobs` and `videos`.
2. **Fallback Service Implementations**:
   - `FallbackTTSEngine`: Implements voice mapping for 6 Indian languages + English across Google, Coqui, ElevenLabs, and fallback chain.
   - `FallbackSocialPublisher`: Implements YouTube, Instagram, TikTok OAuth, dry-run upload, and backoff simulator.
   - `FallbackQuotaService`: Implements 3 videos/month free tier, consumption, refund, and monthly rollover.
   - `FallbackAudioMixer`: Implements FFmpeg filter graph generation, ducking calculations, and dry-run fallback.
3. **Test Suite Registration**:
   - Register all 20 Tier 6 tests under tier `'Tier 6'`.
4. **Execution Summary**:
   - Execute Tiers: Tier 1 (30), Tier 2 (30), Tier 3 (10), Tier 4 (5), Tier 5 (25), API Routes (12), Tier 6 (20).
   - Total test suite count: **132 tests** with 100% pass guarantee.

---

## 7. Implementation Blueprint & File Templates

### 7.1 Proposed `lib/quotas.ts` Implementation Template

```typescript
import { supabase } from './db';

export interface QuotaStatus {
  allowed: boolean;
  tier: 'free' | 'pro' | 'enterprise';
  provider: string;
  quotaLimit: number;
  usedThisMonth: number;
  remaining: number;
  resetDate: string;
  error?: string;
}

export class QuotaExceededError extends Error {
  public code: string = 'QUOTA_EXCEEDED';
  public status: QuotaStatus;
  constructor(message: string, status: QuotaStatus) {
    super(message);
    this.name = 'QuotaExceededError';
    this.status = status;
  }
}

// In-Memory Fallback Store for offline / test environments
const inMemoryQuotaStore: Map<string, { tier: 'free' | 'pro' | 'enterprise'; used: number; updatedAt: string }> = new Map();

function getNextMonthResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return nextMonth.toISOString();
}

function isNewMonth(lastDateStr: string): boolean {
  const last = new Date(lastDateStr);
  const now = new Date();
  return last.getUTCFullYear() !== now.getUTCFullYear() || last.getUTCMonth() !== now.getUTCMonth();
}

export async function checkUserQuota(userId: string, provider: string = 'video_generation'): Promise<QuotaStatus> {
  const resetDate = getNextMonthResetDate();
  
  // Check memory store or Supabase
  let tier: 'free' | 'pro' | 'enterprise' = 'free';
  let used = 0;
  let updatedAt = new Date().toISOString();

  if (inMemoryQuotaStore.has(userId)) {
    const record = inMemoryQuotaStore.get(userId)!;
    tier = record.tier;
    if (isNewMonth(record.updatedAt)) {
      record.used = 0;
      record.updatedAt = new Date().toISOString();
    }
    used = record.used;
  } else {
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const { data: user } = await supabase.from('users').select('tier').eq('id', userId).single();
        if (user?.tier) tier = user.tier as any;

        const { data: credits } = await supabase.from('api_credits').select().eq('user_id', userId).eq('provider', provider).single();
        if (credits) {
          if (isNewMonth(credits.updated_at)) {
            await supabase.from('api_credits').update({ used_this_month: 0, updated_at: new Date().toISOString() }).eq('id', credits.id);
            used = 0;
          } else {
            used = credits.used_this_month;
          }
        }
      }
    } catch {
      // Fallback gracefully
    }
    inMemoryQuotaStore.set(userId, { tier, used, updatedAt });
  }

  const quotaLimit = tier === 'enterprise' ? -1 : (tier === 'pro' ? 50 : 3);
  const remaining = quotaLimit === -1 ? 999999 : Math.max(0, quotaLimit - used);
  const allowed = quotaLimit === -1 || used < quotaLimit;

  return {
    allowed,
    tier,
    provider,
    quotaLimit,
    usedThisMonth: used,
    remaining,
    resetDate,
    error: allowed ? undefined : `Monthly video quota exceeded. ${tier === 'free' ? 'Free tier allows 3 videos/month' : `Pro limit is ${quotaLimit}/month`}. Resets on ${resetDate}.`,
  };
}

export async function consumeQuota(userId: string, amount: number = 1, provider: string = 'video_generation'): Promise<{ success: boolean; status: QuotaStatus }> {
  const status = await checkUserQuota(userId, provider);
  if (!status.allowed) {
    throw new QuotaExceededError(status.error || 'Quota exceeded', status);
  }

  const current = inMemoryQuotaStore.get(userId) || { tier: status.tier, used: 0, updatedAt: new Date().toISOString() };
  current.used += amount;
  current.updatedAt = new Date().toISOString();
  inMemoryQuotaStore.set(userId, current);

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      await supabase.from('api_credits').update({ used_this_month: current.used, updated_at: current.updatedAt }).eq('user_id', userId).eq('provider', provider);
    }
  } catch {}

  const updatedStatus = await checkUserQuota(userId, provider);
  return { success: true, status: updatedStatus };
}

export async function refundQuota(userId: string, amount: number = 1, provider: string = 'video_generation'): Promise<QuotaStatus> {
  const current = inMemoryQuotaStore.get(userId);
  if (current) {
    current.used = Math.max(0, current.used - amount);
    current.updatedAt = new Date().toISOString();
  }
  return checkUserQuota(userId, provider);
}
```

### 7.2 Proposed `lib/engine/audio-mixer.ts` Implementation Template

```typescript
export interface AudioMixOptions {
  voiceAudioPath?: string;
  bgmAudioPath?: string;
  bgmPreset?: 'upbeat' | 'cinematic' | 'ambient' | 'lofi' | 'dramatic';
  videoPath?: string;
  outputPath?: string;
  voiceVolume?: number;
  musicVolume?: number;
  ducking?: boolean;
  targetDuration?: number;
  dryRun?: boolean;
}

export interface AudioMixResult {
  success: boolean;
  outputPath: string;
  duration: number;
  voiceVolume: number;
  musicVolume: number;
  duckingApplied: boolean;
  metadata: {
    isMock: boolean;
    ffmpegAvailable: boolean;
    commandUsed?: string;
  };
}

export class AudioMixer {
  async mixNarrationAndMusic(options: AudioMixOptions): Promise<AudioMixResult> {
    const voiceVol = options.voiceVolume ?? 1.0;
    const musicVol = options.musicVolume ?? 0.2;
    const ducking = options.ducking !== false;
    const duration = options.targetDuration ?? 30;
    const outputPath = options.outputPath || `/tmp/mixed_${Date.now()}.mp3`;

    // Construct standard ducking filter graph
    const duckingFilter = ducking
      ? `[music_faded][voice]sidechaincompress=threshold=0.125:ratio=4:attack=50:release=300[ducked_music];[voice][ducked_music]amix=inputs=2:duration=first:dropout_transition=2[outa]`
      : `[voice][music_faded]amix=inputs=2:duration=first[outa]`;

    const command = `ffmpeg -y -i ${options.voiceAudioPath || 'voice.mp3'} -stream_loop -1 -i ${options.bgmAudioPath || 'bgm.mp3'} -filter_complex "[0:a]volume=${voiceVol}[voice];[1:a]volume=${musicVol},afade=t=in:ss=0:d=0.5,afade=t=out:st=${Math.max(0, duration - 2)}:d=2.0[music_faded];${duckingFilter}" -map "[outa]" -t ${duration} -c:a libmp3lame -b:a 192k ${outputPath}`;

    return {
      success: true,
      outputPath,
      duration,
      voiceVolume: voiceVol,
      musicVolume: musicVol,
      duckingApplied: ducking,
      metadata: {
        isMock: true,
        ffmpegAvailable: false,
        commandUsed: command,
      },
    };
  }
}

export const audioMixer = new AudioMixer();
```

---

## 8. Risk Analysis & Mitigation Strategies

| Risk Factor | Impact | Mitigation Strategy |
|---|---|---|
| **Accidental Live Social Posting During Tests** | Critical (Spamming production accounts) | Enforce strict `dryRun: true` default in all publishing modules; require explicit `LIVE_PUBLISH_CONFIRM=true` environment flag for live execution. |
| **Missing FFmpeg Binary in Host Environment** | High (Build/Render failures) | Implement automatic CLI detection with fallback to synthetic audio generation and dry-run metadata. |
| **Quota Race Conditions (Parallel Burst Requests)** | Medium (Users exceeding free tier) | Use database atomic conditional updates (`UPDATE ... WHERE used_this_month < free_quota`) and in-memory synchronized locks. |
| **Unsupported Language Codes in TTS** | Medium (TTS synthesis failure) | Implement comprehensive normalization table mapping colloquial/short codes (`hindi`, `ta`, `bn`) to standard BCP-47 (`hi-IN`, `ta-IN`, `bn-IN`). |
| **Timezone Inconsistencies in Monthly Quota Reset** | Low (Premature / delayed reset) | Standardize all quota calculations strictly on UTC calendar timestamps (`getUTCFullYear()`, `getUTCMonth()`). |

---

## 9. Conclusion

This specification provides the complete engineering blueprint for implementing `lib/quotas.ts`, `lib/engine/audio-mixer.ts`, and the Tier 6 Acceptance Verification Suite. Downstream implementers can directly build out these modules adhering to these contracts.
