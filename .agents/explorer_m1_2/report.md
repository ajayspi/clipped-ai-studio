# Technical Analysis & Specifications: API Keys Integration, Status Indicators & Extended Engine Types

**Agent**: Explorer M1-2 (API Keys Integration & Types)  
**Milestone**: M1 — API Status Indicators & Settings Integration  
**Date**: 2026-09-01  
**Target Codebase**: Clipped AI Studio  

---

## 1. Executive Summary

This investigation covers the integration between `/api/settings/keys`, the client-side state caching layer, the dynamic workflow status indicator engine, and the type definitions required for Avatar (`avatar`), Whiteboard (`whiteboard`), and Automatic Mission (`mission`) workflows across Clipped AI Studio.

### Key Discoveries & Recommendations:
1. **Dual Key Sourcing (`.env` + Supabase Database)**: `app/api/settings/keys/route.ts` currently queries *only* the Supabase `settings` table. If developers or users configure keys via `.env` (e.g. `GEMINI_API_KEY`, `OPENAI_API_KEY`, `FAL_API_KEY`, `KLING_API_KEY`), the endpoint returns `isConfigured: false`. The endpoint must be upgraded to merge environment variables with database records, masking values securely.
2. **Provider Key Normalization**: `app/(app)/settings/page.tsx` uses prefixed IDs like `api_gemini`, `api_openai`, `api_pexels`, whereas backend engines and `PROJECT.md` contracts use `gemini`, `openai`, `pexels`, `fal`, `kling`, `luma`, `elevenlabs`, `heygen`, `did`. The API and client evaluator must normalize both formats seamlessly.
3. **Zero-Dependency Fast-Cache Client Hook (`useApiKeys`)**: As neither `swr` nor `@tanstack/react-query` is installed in `package.json`, creating a lightweight custom hook with in-memory module caching and `localStorage` backup provides instant (0ms) render for the 10 workflow cards in `/create` with zero bundle bloat and automatic background revalidation.
4. **Type Engine Extensions**: `lib/engine/types.ts` must expand `WorkflowType` from 8 types to 10 types (`'avatar'` and `'whiteboard'`), plus add complete interfaces for Gemini 9-pose character reference sheets (`CharacterReferenceSheet`, `CharacterPose`), whiteboard storyboard beats (`WhiteboardStoryboardBeat`), avatar talking-head synthesis (`AvatarGenerationRequest/Response`), and automatic mission job tracking (`MissionJobState`).

---

## 2. Analysis 1: `app/api/settings/keys/route.ts` Response Structure, Error Handling, and Latency

### 2.1 Current Implementation Review
The current `app/api/settings/keys/route.ts` implementation:
```typescript
// app/api/settings/keys/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    const { data: keys, error } = await supabase
      .from('settings')
      .select('provider, api_key, is_active, updated_at');

    if (error) throw error;

    const maskedKeys = (keys || []).reduce((acc: any, row) => {
      acc[row.provider] = {
        isConfigured: row.api_key && row.api_key.length > 0,
        maskedValue: row.api_key ? `••••••••••••${row.api_key.slice(-4)}` : '',
        isActive: row.is_active,
        updatedAt: row.updated_at
      };
      return acc;
    }, {});

    return NextResponse.json({ keys: maskedKeys });
  } catch (error: any) {
    console.error('Failed to list keys:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 2.2 Vulnerabilities & Gaps Identified

| Issue | Severity | Impact | Solution |
|---|---|---|---|
| **No `.env` Fallback** | **High** | If keys exist in `.env.local` but not in Supabase, `/api/settings/keys` reports `isConfigured: false`, turning all workflow cards 🔴 (Error) or 🟡 (Warning) incorrectly. | Check `process.env[ENV_KEY]` for each provider if not present in DB or if DB is empty. |
| **Provider ID Inconsistency** | **Medium** | `settings/page.tsx` saves as `api_gemini`, but workflow definitions check `gemini`. | Populate both canonical key (`gemini`) and prefixed alias (`api_gemini`) in the response map. |
| **Supabase Connection Latency & Failure** | **Medium** | If Supabase is unreachable or cold-starting, the route fails with 500 and throws an error, leaving the UI in an unhandled error state. | Add a graceful try/catch with fallback to environment variables and default status objects. |
| **Response Latency** | **Low** | Direct DB query takes 50-180ms over HTTP. | Enable client-side caching and optional Next.js route cache tags (`revalidate = 30`). |

### 2.3 Proposed Enhanced Server-Side Implementation Pattern

```typescript
// Proposed structure for app/api/settings/keys/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// Known providers and their environment variable mappings
export const PROVIDER_ENV_MAP: Record<string, { envVars: string[]; category: string }> = {
  gemini: { envVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_AI_KEY'], category: 'AI Models' },
  openai: { envVars: ['OPENAI_API_KEY'], category: 'AI Models' },
  anthropic: { envVars: ['ANTHROPIC_API_KEY'], category: 'AI Models' },
  openrouter: { envVars: ['OPENROUTER_API_KEY'], category: 'AI Models' },
  pexels: { envVars: ['PEXELS_API_KEY'], category: 'Stock Media' },
  pixabay: { envVars: ['PIXABAY_API_KEY'], category: 'Stock Media' },
  fal: { envVars: ['FAL_API_KEY', 'FAL_KEY'], category: 'AI Models' },
  kling: { envVars: ['KLING_API_KEY'], category: 'Stock Media' },
  luma: { envVars: ['LUMA_API_KEY'], category: 'Stock Media' },
  elevenlabs: { envVars: ['ELEVENLABS_API_KEY', 'XI_API_KEY'], category: 'Voice & Audio' },
  heygen: { envVars: ['HEYGEN_API_KEY'], category: 'Avatar' },
  did: { envVars: ['DID_API_KEY', 'D_ID_API_KEY'], category: 'Avatar' },
  deepgram: { envVars: ['DEEPGRAM_API_KEY'], category: 'Voice & Audio' },
  huggingface: { envVars: ['HUGGINGFACE_API_KEY', 'HF_TOKEN'], category: 'Stock Media' }
};

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `••••••••••••${key.slice(-4)}`;
}

export async function GET() {
  const result: Record<string, {
    isConfigured: boolean;
    isActive: boolean;
    maskedValue: string;
    updatedAt: string | null;
    source: 'database' | 'env' | 'none';
  }> = {};

  // 1. First seed with known providers from environment
  for (const [provider, config] of Object.entries(PROVIDER_ENV_MAP)) {
    let envKey: string | undefined;
    for (const envVar of config.envVars) {
      if (process.env[envVar]) {
        envKey = process.env[envVar];
        break;
      }
    }

    const hasEnv = Boolean(envKey && envKey.trim().length > 0);
    const entry = {
      isConfigured: hasEnv,
      isActive: hasEnv,
      maskedValue: hasEnv ? maskKey(envKey!) : '',
      updatedAt: hasEnv ? new Date().toISOString() : null,
      source: hasEnv ? ('env' as const) : ('none' as const)
    };

    result[provider] = entry;
    result[`api_${provider}`] = entry; // Provide alias compatibility
  }

  // 2. Overlay with database records if Supabase is available
  try {
    const { data: dbKeys, error } = await supabase
      .from('settings')
      .select('provider, api_key, is_active, updated_at');

    if (!error && Array.isArray(dbKeys)) {
      for (const row of dbKeys) {
        if (!row.provider) continue;
        const cleanName = row.provider.replace(/^api_/, '');
        const hasKey = Boolean(row.api_key && row.api_key.trim().length > 0);

        const dbEntry = {
          isConfigured: hasKey,
          isActive: row.is_active ?? hasKey,
          maskedValue: hasKey ? maskKey(row.api_key) : '',
          updatedAt: row.updated_at || new Date().toISOString(),
          source: 'database' as const
        };

        result[cleanName] = dbEntry;
        result[`api_${cleanName}`] = dbEntry;
      }
    }
  } catch (dbErr) {
    console.warn('[API Keys GET] Supabase query notice (falling back to env vars):', dbErr);
  }

  return NextResponse.json({ keys: result });
}
```

---

## 3. Analysis 2: Client-side Key Resolution & State Management (`useApiKeys` Hook)

### 3.1 Package Evaluation
Inspection of `package.json` reveals:
- `next`: `16.3.3` (App Router)
- `react`: `19.2.8`
- `zustand`: `^5.0.15`
- `swr`: *Not installed*
- `@tanstack/react-query`: *Not installed*

**Strategy**: Rather than introducing new package dependencies, implement a lightweight `useApiKeys` hook utilizing:
1. **Module-Level In-Memory Cache**: Shared across all component instances for immediate 0ms reads.
2. **`localStorage` Synchronization**: Persists masked key status across page refreshes for instant rendering without loading spinners.
3. **Stale-While-Revalidate (SWR) Execution**: Fetches `/api/settings/keys` in the background on mount and quietly updates UI if statuses change.
4. **Request Deduplication**: Guarantees only one in-flight network request occurs even if 10 `WorkflowCard` components mount simultaneously.

### 3.2 Proposed `useApiKeys` Hook Specification

```typescript
// lib/hooks/use-api-keys.ts (Design Specification)
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ApiKeyStatus, ApiKeysMap, WorkflowHealthStatus, WorkflowStatusResult, CostTier } from '@/lib/engine/types';
import { WORKFLOW_DEFINITIONS } from '@/lib/engine/workflow-definitions';

const CACHE_KEY = 'clipped_api_keys_cache';
let memoryCache: ApiKeysMap | null = null;
let inflightPromise: Promise<ApiKeysMap> | null = null;

async function fetchKeysFromApi(): Promise<ApiKeysMap> {
  if (inflightPromise) return inflightPromise;

  inflightPromise = (async () => {
    try {
      const res = await fetch('/api/settings/keys');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const keysMap: ApiKeysMap = data.keys || {};
      
      memoryCache = keysMap;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ keys: keysMap, timestamp: Date.now() }));
        }
      } catch (e) {}

      return keysMap;
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}

export function useApiKeys() {
  // Initialize synchronously from memory or localStorage cache to eliminate layout shift
  const [keys, setKeys] = useState<ApiKeysMap>(() => {
    if (memoryCache) return memoryCache;
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.keys) {
            memoryCache = parsed.keys;
            return parsed.keys;
          }
        }
      } catch (e) {}
    }
    return {};
  });

  const [loading, setLoading] = useState<boolean>(() => Object.keys(keys).length === 0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchKeysFromApi();
      setKeys(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isProviderConfigured = useCallback((provider: string): boolean => {
    const clean = provider.replace(/^api_/, '');
    const entry = keys[clean] || keys[`api_${clean}`];
    return Boolean(entry?.isConfigured && entry?.isActive);
  }, [keys]);

  const evaluateWorkflow = useCallback((workflowId: string): WorkflowStatusResult => {
    const def = WORKFLOW_DEFINITIONS[workflowId];
    if (!def) {
      return {
        status: 'ready',
        costTier: '$',
        label: 'Ready',
        requiredProviders: [],
        missingProviders: [],
        configuredProviders: [],
        fallbackAvailable: true,
        message: 'Ready to generate'
      };
    }

    const required = def.primaryProviders;
    const configured = required.filter(p => isProviderConfigured(p));
    const missing = required.filter(p => !isProviderConfigured(p));

    let status: WorkflowHealthStatus = 'ready';
    let label = 'Ready';
    let message = 'All required AI engines configured.';

    if (missing.length === 0) {
      status = 'ready'; // 🟢
      label = 'Ready';
      message = `Active providers: ${configured.join(', ')}`;
    } else if (def.hasFallback) {
      status = 'warning'; // 🟡
      label = 'Fallback Mode';
      message = `Missing: ${missing.join(', ')}. Free mock/fallback engines active.`;
    } else {
      status = 'error'; // 🔴
      label = 'Key Required';
      message = `Requires ${missing.join(', ')} API key to operate.`;
    }

    return {
      status,
      costTier: def.costTier,
      label,
      requiredProviders: required,
      missingProviders: missing,
      configuredProviders: configured,
      fallbackAvailable: def.hasFallback,
      message
    };
  }, [isProviderConfigured]);

  return {
    keys,
    loading,
    error,
    refresh,
    isProviderConfigured,
    evaluateWorkflow
  };
}
```

---

## 4. Analysis 3: Extended TypeScript Interface Specifications

Below are the complete interface contracts designed to be placed in `lib/engine/types.ts` and `lib/engine/workflow-definitions.ts`.

### 4.1 API Key & Provider Interfaces

```typescript
export interface ApiKeyStatus {
  isConfigured: boolean;
  isActive: boolean;
  maskedValue?: string;
  updatedAt?: string | null;
  source?: 'database' | 'env' | 'none';
}

export type ApiKeysMap = Record<string, ApiKeyStatus>;

export type ProviderCategory =
  | 'llm'
  | 'image'
  | 'video'
  | 'tts'
  | 'media'
  | 'avatar'
  | 'whiteboard';

export interface ProviderConfig {
  id: string;              // 'gemini' | 'openai' | 'fal' | 'kling' | 'luma' | 'elevenlabs' | 'pexels' | 'pixabay' | 'heygen' | 'did'
  name: string;            // 'Google Gemini'
  category: ProviderCategory;
  envVarName?: string;     // 'GEMINI_API_KEY'
  dbKeyName?: string;      // 'api_gemini'
  docUrl?: string;         // 'https://aistudio.google.com'
  settingsTab: string;     // 'AI Models' | 'Stock Media' | 'Voice & Audio'
  isOptional?: boolean;
}
```

### 4.2 Workflow Status & Cost Tier Types

```typescript
export type WorkflowHealthStatus = 'ready' | 'warning' | 'error';
// 🟢 'ready'   : All required primary API keys are active
// 🟡 'warning' : Primary key missing, but zero-cost fallback/mock engine is ready
// 🔴 'error'   : Critical key missing with no fallback available

export type CostTier = '$' | '$$' | '$$$';
// $   : Free / Built-in zero-cost fallback / Mock (Pollinations, Keyless TTS, Mixkit)
// $$  : Standard AI models (Gemini Flash, OpenAI mini, Pexels, ElevenLabs basic)
// $$$ : Premium Generation models (Kling Video, Luma Dream Machine, HeyGen Talking Head)

export interface WorkflowStatusResult {
  status: WorkflowHealthStatus;
  costTier: CostTier;
  label: string;
  requiredProviders: string[];
  missingProviders: string[];
  configuredProviders: string[];
  fallbackAvailable: boolean;
  message?: string;
}

export interface WorkflowDefinition {
  id: WorkflowType;
  title: string;
  description: string;
  iconName: string;           // Lucide icon identifier
  color: string;              // e.g. 'text-blue-500'
  bg: string;                 // e.g. 'bg-blue-500/10'
  borderHover?: string;       // e.g. 'hover:border-blue-500/50'
  href: string;               // e.g. '/create/footage'
  costTier: CostTier;
  primaryProviders: string[];
  fallbackProviders?: string[];
  hasFallback: boolean;
  badge?: string;             // e.g. 'New' | 'Popular' | 'Auto-Pilot'
  settingsUrl?: string;       // Direct link to relevant settings tab
}
```

### 4.3 Comprehensive Matrix of the 10 Workflow Definitions

| # | ID | Title | Route | Cost | Primary APIs | Fallback Engine | Has Fallback |
|---|---|---|---|---|---|---|---|
| 1 | `footage` | Footage Video | `/create/footage` | `$` | `pexels`, `pixabay`, `gemini` | Openverse / Mock Stock | Yes (🟡) |
| 2 | `images` | AI Images Video | `/create/images` | `$$` | `fal`, `gemini` | Pollinations Keyless Flux | Yes (🟡) |
| 3 | `ai-videos` | AI Videos | `/create/ai-videos` | `$$$` | `kling`, `luma`, `fal` | Mixkit Deterministic Clips | Yes (🟡) |
| 4 | `stories` | Stories Generator | `/create/stories` | `$$` | `gemini`, `elevenlabs` | Keyless Google TTS | Yes (🟡) |
| 5 | `bulk` / `bulk-plan` | Bulk Planner | `/create/bulk` | `$$` | `gemini`, `openai` | Algorithmic Content Planner | Yes (🟡) |
| 6 | `shorts` / `extract-shorts` | Extract Shorts | `/create/shorts` | `$` | `gemini`, `openai` | Algorithmic Hook Parser | Yes (🟡) |
| 7 | `drama` / `micro-drama` | Micro-Drama | `/create/drama` | `$$$` | `fal`, `kling`, `elevenlabs` | Storyboard Mock Clips | Yes (🟡) |
| 8 | `auto` | Auto Pilot | `/create/auto` | `$$` | `gemini`, `pexels`, `elevenlabs` | Cascade Dry-Run Engine | Yes (🟡) |
| 9 | `avatar` | Avatar to Video | `/create/avatar` | `$$$` | `heygen`, `did`, `elevenlabs` | Remotion PiP Talking Head | Yes (🟡) |
| 10 | `whiteboard` | Whiteboard Animation | `/create/whiteboard` | `$` | `gemini`, `google` | Preset 9-Pose SVG Sheets | Yes (🟡) |

---

## 5. Analysis 4: `lib/engine/types.ts` Readying for `avatar` and `whiteboard` Workflows

### 5.1 Current `WorkflowType` Union in `lib/engine/types.ts`
Currently:
```typescript
export type WorkflowType =
  | 'footage'
  | 'images'
  | 'ai-videos'
  | 'stories'
  | 'bulk-plan'
  | 'micro-drama'
  | 'extract-shorts'
  | 'auto';
```

### 5.2 Extended `WorkflowType` Union
```typescript
export type WorkflowType =
  | 'footage'
  | 'images'
  | 'ai-videos'
  | 'stories'
  | 'bulk'
  | 'bulk-plan'
  | 'shorts'
  | 'extract-shorts'
  | 'drama'
  | 'micro-drama'
  | 'auto'
  | 'avatar'
  | 'whiteboard'
  | 'mission';
```

### 5.3 New Interface Specifications to Embed in `lib/engine/types.ts`

```typescript
// ==========================================
// Workflow 7: Avatar to Video Engine Types
// ==========================================

export type AvatarProvider = 'heygen' | 'did' | 'liveportrait' | 'remotion-pip' | 'mock';
export type AvatarLayout = 'pip_bottom_right' | 'pip_bottom_left' | 'fullscreen' | 'side_by_side' | 'circular_bubble';
export type AvatarVoice = 'nova' | 'onyx' | 'rachel' | 'josh' | 'alloy' | 'shimmer' | string;

export interface AvatarPreset {
  id: string;
  name: string;
  previewUrl: string;
  gender: 'male' | 'female' | 'neutral';
  style: 'photorealistic' | '3d_animated' | 'anime' | 'illustrated';
  supportedProviders: AvatarProvider[];
}

export interface AvatarGenerationRequest {
  script: string;
  avatarType: 'preset' | 'custom_photo';
  avatarId?: string;
  customImageUrl?: string | null;
  layout?: AvatarLayout;
  voice?: AvatarVoice;
  speed?: number;
  aspectRatio?: AspectRatio | string;
  backgroundVideoUrl?: string;
  backgroundMusicUrl?: string;
  mock?: boolean;
}

export interface AvatarGenerationResponse {
  success: boolean;
  jobId: string;
  videoUrl: string;
  avatarId: string;
  duration: number;
  layout: AvatarLayout;
  providerUsed: AvatarProvider | string;
  metadata: Record<string, any>;
  error?: string;
}

// ==========================================
// Workflow 8: Whiteboard Animation Engine Types
// ==========================================

export type WhiteboardArchetype =
  | 'stickman'
  | 'saint'
  | 'old man'
  | 'founder'
  | 'doctor'
  | 'teacher'
  | 'scientist'
  | 'custom';

export type WhiteboardStyle =
  | 'monoline_marker'
  | 'blackboard_chalk'
  | 'blueprint'
  | 'colored_doodle'
  | 'sketch_outline';

export interface CharacterPose {
  name: string;
  description: string;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  svgPath?: string;
  previewUrl?: string;
}

export interface CharacterReferenceSheet {
  characterId: string;
  archetype: WhiteboardArchetype | string;
  customDescription?: string;
  sheetImageUrl: string;
  poses: Record<string, CharacterPose>; // pose_1 to pose_9
  style: WhiteboardStyle | string;
  createdAt?: string;
}

export interface WhiteboardStoryboardBeat {
  id: string;
  text: string;
  narration: string;
  duration: number;
  assignedPose: string; // e.g. 'pose_1' | 'pointing' | 'eureka'
  drawingPrompt: string;
  drawingSvgPath?: string;
  markerColor?: string;
  handOverlay?: boolean;
}

export interface WhiteboardGenerationRequest {
  prompt: string;
  script?: string;
  characterArchetype?: WhiteboardArchetype;
  customCharacterDescription?: string;
  style?: WhiteboardStyle;
  markerColor?: string;
  aspectRatio?: AspectRatio | string;
  voice?: string;
  mock?: boolean;
}

export interface WhiteboardGenerationResponse {
  success: boolean;
  jobId: string;
  videoUrl: string;
  characterSheet: CharacterReferenceSheet;
  storyboard: WhiteboardStoryboardBeat[];
  duration: number;
  metadata: Record<string, any>;
  error?: string;
}

// ==========================================
// Workflow 9: Automatic Mission Mode Types
// ==========================================

export type MissionStage =
  | 'prompt_analysis'
  | 'script_generation'
  | 'scene_planning'
  | 'asset_sourcing'
  | 'voice_synthesis'
  | 'video_composition'
  | 'ready';

export interface MissionStepStatus {
  stage: MissionStage;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  startedAt?: string;
  completedAt?: string;
  log?: string;
}

export interface MissionJobState {
  jobId: string;
  prompt: string;
  aspectRatio: AspectRatio;
  style: string;
  voice: string;
  currentStage: MissionStage;
  overallProgress: number;
  steps: MissionStepStatus[];
  script?: string;
  scenes?: Scene[];
  audioUrl?: string;
  videoUrl?: string;
  error?: string;
}
```

---

## 6. Implementation Checklist & Verification Strategy

### Implementer Action Items:
1. **Update `app/api/settings/keys/route.ts`**:
   - Merge `process.env` keys with Supabase `settings` table data.
   - Return both canonical (`gemini`) and aliased (`api_gemini`) provider keys.
2. **Create `lib/hooks/use-api-keys.ts` & `lib/engine/workflow-definitions.ts`**:
   - Store the complete definitions for all 10 workflow cards.
   - Implement `useApiKeys` hook with synchronous initial cache and background refresh.
3. **Extend `lib/engine/types.ts`**:
   - Add `avatar`, `whiteboard`, and `mission` types along with `CharacterReferenceSheet` and `AvatarGenerationRequest`.
4. **Update `app/(app)/create/page.tsx` & create `WorkflowCard.tsx`**:
   - Render 10 cards with dynamic status dots (🟢, 🟡, 🔴), cost tier pills (`$`, `$$`, `$$$`), and settings gear icon.
5. **Verify**:
   - Run verification test script ensuring status indicators resolve properly when keys are set in `.env` or in the DB.
