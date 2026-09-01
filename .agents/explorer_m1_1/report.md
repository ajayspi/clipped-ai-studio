# Milestone 1 Architectural Analysis: Create Hub Workflow Cards & Status Logic

**Explorer**: Explorer M1-1  
**Target Area**: `app/(app)/create/page.tsx`, `components/create/*`, `app/api/settings/keys`  
**Date**: 2026-09-01  

---

## Executive Summary

This report establishes the complete structural design and logic specification for **Milestone 1: API Status Indicators, Cost Badges & Settings Links for the Create Hub**.

The Create Hub is the central launchpad for Clipped AI Studio. To eliminate user confusion regarding unconfigured API keys and unexpected render failures, each workflow card must dynamically communicate:
1. **Real-time API readiness status** (🟢 Ready / 🟡 Fallback Active / 🔴 Configuration Required) based on `/api/settings/keys`.
2. **Cost & Compute Tier** (`$` Free/Low-Cost, `$$` Standard AI, `$$$` High-Compute Generative Video).
3. **Seamless Settings shortcuts** allowing direct navigation or inline modal key entry for missing providers.
4. **Expansion to 10 distinct video generation workflows**, including the new **Avatar to Video** and **Whiteboard Animation** pipelines.

---

## 1. Component Architecture & Hierarchy

### 1.1 Directory & File Layout
```
app/(app)/create/
├── page.tsx                           # Main Create Hub page (Server/Client composition)
├── components/
│   ├── WorkflowGrid.tsx               # Responsive grid container with category tabs & search
│   ├── WorkflowCard.tsx               # Individual interactive card with status, cost, & settings
│   ├── StatusBadge.tsx                # Reusable status dot + badge + tooltip popover
│   ├── CostBadge.tsx                  # Reusable $, $$, $$$ badge with compute explanation
│   └── MissionPromptBar.tsx           # Auto-mission single prompt submission bar (Milestone 2 hook)
└── [workflow-slug]/
    └── page.tsx                       # Dedicated studio / wizard routes for each workflow
```

### 1.2 Data Flow & Component Tree
```
                         ┌─────────────────────────────┐
                         │   app/(app)/create/page.tsx  │
                         │ (Fetches /api/settings/keys)│
                         └──────────────┬──────────────┘
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
┌─────────────────────────────┐                       ┌─────────────────────────────┐
│    MissionPromptBar.tsx     │                       │      WorkflowGrid.tsx       │
│  (One-click prompt submit)  │                       │ (Filter by category/status) │
└─────────────────────────────┘                       └──────────────┬──────────────┘
                                                                     │
                                              ┌──────────────────────┴──────────────────────┐
                                              ▼                                             ▼
                               ┌─────────────────────────────┐               ┌─────────────────────────────┐
                               │     WorkflowCard.tsx (1)    │      ...      │    WorkflowCard.tsx (10)    │
                               │  - StatusBadge (🟢/🟡/🔴)    │               │  - StatusBadge (🟢/🟡/🔴)    │
                               │  - CostBadge ($, $$, $$$)   │               │  - CostBadge ($, $$, $$$)   │
                               │  - Settings Button (⚙️)      │               │  - Settings Button (⚙️)      │
                               │  - Start Workflow Link (↗)  │               │  - Start Workflow Link (↗)  │
                               └─────────────────────────────┘               └─────────────────────────────┘
```

### 1.3 Component Specifications & Props Interfaces

#### A. `WorkflowCardProps` (`app/(app)/create/components/WorkflowCard.tsx`)
```typescript
import { LucideIcon } from "lucide-react";

export type CostTier = "$" | "$$" | "$$$";
export type WorkflowStatusType = "ready" | "warning" | "error";

export interface WorkflowDefinition {
  id: string;                          // e.g. "footage", "avatar", "whiteboard"
  title: string;                       // e.g. "Avatar to Video"
  description: string;                 // Short description
  icon: LucideIcon;                    // Lucide icon component
  color: string;                       // Tailwind text color class e.g. "text-violet-500"
  bg: string;                          // Tailwind background class e.g. "bg-violet-500/10"
  borderHover: string;                 // Tailwind hover border class e.g. "hover:border-violet-500/50"
  href: string;                        // Destination URL e.g. "/create/avatar"
  category: "ai-video" | "stock" | "avatar-wb" | "automation";
  primaryProviders: string[];          // Required keys e.g. ["heygen", "did"]
  fallbackProviders?: string[];        // Fallback providers e.g. ["mock-avatar", "remotion-pip"]
  defaultCostTier: CostTier;           // Standard tier e.g. "$$$"
  isNew?: boolean;                     // "NEW" badge indicator
  isPopular?: boolean;
}

export interface ApiKeyStatusMap {
  [provider: string]: {
    isConfigured: boolean;
    isActive: boolean;
    maskedValue?: string;
    updatedAt?: string | null;
  };
}

export interface WorkflowCardProps {
  workflow: WorkflowDefinition;
  keyStatusMap: ApiKeyStatusMap;
  onOpenSettings?: (provider: string) => void;
}
```

#### B. `WorkflowGridProps` (`app/(app)/create/components/WorkflowGrid.tsx`)
```typescript
export interface WorkflowGridProps {
  workflows: WorkflowDefinition[];
  keyStatusMap: ApiKeyStatusMap;
  filterCategory?: string;
  searchQuery?: string;
}
```

---

## 2. The 10 Workflow Definitions & Provider Key Mappings

The system supports **10 distinct workflow types**. The table below establishes the canonical provider mapping, required keys, optional keys, fallback engines, and cost tiers:

| # | Workflow ID | Display Title | Route (`href`) | Primary Keys (OR / AND) | Optional Keys | Fallback Mechanism | Cost Tier |
|---|---|---|---|---|---|---|---|
| 1 | `footage` | **Footage Video** | `/create/footage` | `pexels` OR `pixabay` | `openai`, `gemini`, `elevenlabs` | Public Pixabay/Openverse scraper, free Google Translate TTS | `$` |
| 2 | `images` | **AI Images Video** | `/create/images` | `fal` (Flux) OR `openai` (DALL-E) | `gemini`, `elevenlabs` | Pollinations Image API (`image.pollinations.ai`), Free TTS | `$$` |
| 3 | `ai-videos` | **AI Videos** | `/create/ai-videos` | `kling` OR `luma` OR `fal` | `openai`, `gemini`, `elevenlabs` | Mixkit royalty-free video clips + Remotion dry-run renderer | `$$$` |
| 4 | `stories` | **Stories Generator** | `/create/stories` | `openai` OR `gemini` | `elevenlabs`, `pexels`, `fal` | Keyless Pollinations Text API, Free TTS | `$$` |
| 5 | `bulk` | **Bulk Planner** | `/create/bulk` | `openai` OR `gemini` | `elevenlabs`, `pexels` | In-memory procedural 30-day content template engine | `$` |
| 6 | `shorts` | **Extract Shorts** | `/create/shorts` | `openai` OR `gemini` | `elevenlabs` | Heuristic transcript parser, rule-based virality scoring | `$` |
| 7 | `drama` | **Micro-Drama** | `/create/drama` | `openai` OR `gemini` | `fal`, `kling`, `elevenlabs` | Deterministic episodic arc templates + Pollinations character avatars | `$$` |
| 8 | `auto` | **Auto Pilot** | `/create/auto` | (`openai` OR `gemini`) AND (`pexels` OR `fal` OR `kling`) | `elevenlabs` | Full keyless cascade (Pollinations + Mixkit + Free TTS) | `$$$` |
| 9 | `avatar` | **Avatar to Video** | `/create/avatar` | `heygen` OR `did` | `elevenlabs`, `openai`, `gemini` | Deterministic Remotion PiP layout compositing with audio visualizer | `$$$` |
| 10 | `whiteboard` | **Whiteboard Animation** | `/create/whiteboard` | `gemini` (9-pose character generation) | `openai`, `elevenlabs` | SVG monoline progressive sketch generator + Free TTS | `$$` |

*Note on Key Aliases*: Provider keys may be stored in Supabase with or without the `api_` prefix (e.g. `gemini` or `api_gemini`, `openai` or `api_openai`, `pexels` or `api_pexels`, `fal` or `api_fal`). The status resolver must normalize provider keys: `providerKey.replace(/^api_/, '')`.

---

## 3. Precise Status Calculation Logic (🟢 Green, 🟡 Orange, 🔴 Red)

### 3.1 Status Evaluation Algorithm

```typescript
export interface StatusEvaluation {
  status: 'ready' | 'warning' | 'error';
  label: string;
  badgeClass: string;
  dotClass: string;
  tooltipText: string;
  configuredPrimary: string[];
  missingPrimary: string[];
  activeFallback: string | null;
}

export function evaluateWorkflowStatus(
  workflow: WorkflowDefinition,
  keyStatusMap: ApiKeyStatusMap
): StatusEvaluation {
  // Helper to check if a provider is configured and active
  const isKeyConfigured = (providerName: string): boolean => {
    const raw = providerName.toLowerCase().trim();
    const clean = raw.replace(/^api_/, '');
    const entry = keyStatusMap[clean] || keyStatusMap[`api_${clean}`] || keyStatusMap[raw];
    return Boolean(entry?.isConfigured && entry?.isActive !== false);
  };

  const configuredPrimary = workflow.primaryProviders.filter(isKeyConfigured);
  const missingPrimary = workflow.primaryProviders.filter((p) => !isKeyConfigured(p));
  const hasAtLeastOnePrimary = configuredPrimary.length > 0;
  const hasFallback = Boolean(workflow.fallbackProviders && workflow.fallbackProviders.length > 0);

  // 1. GREEN (Ready): At least one primary provider configured
  if (hasAtLeastOnePrimary) {
    return {
      status: 'ready',
      label: 'Ready',
      badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      dotClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
      tooltipText: `All primary APIs ready: ${configuredPrimary.join(', ').toUpperCase()}`,
      configuredPrimary,
      missingPrimary,
      activeFallback: null,
    };
  }

  // 2. ORANGE (Warning / Fallback Active): Primary missing, but built-in fallback active
  if (hasFallback) {
    const fallbackDesc = workflow.fallbackProviders?.[0] || 'Built-in Engine';
    return {
      status: 'warning',
      label: 'Fallback Active',
      badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      dotClass: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
      tooltipText: `Missing ${missingPrimary.join('/')?.toUpperCase()} key. Operating with zero-cost fallback (${fallbackDesc}).`,
      configuredPrimary,
      missingPrimary,
      activeFallback: fallbackDesc,
    };
  }

  // 3. RED (Error / Config Required): No primary key and no fallback possible
  return {
    status: 'error',
    label: 'Config Required',
    badgeClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    dotClass: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
    tooltipText: `Requires ${missingPrimary.join('/')?.toUpperCase()} API key to run. Click settings to configure.`,
    configuredPrimary,
    missingPrimary,
    activeFallback: null,
  };
}
```

---

## 4. Cost Tier Determination (`$`, `$$`, `$$$`)

### 4.1 Cost Tier Definitions

| Tier | Symbol | Classification | Estimated Cost Range | Description & Models |
|---|---|---|---|---|
| **Tier 1** | `$` | Free / Fallback / Low Cost | $0.00 – $0.02 / video | Public Stock (Pexels, Pixabay), Keyless Pollinations AI, Keyless Google TTS, Remotion local layout rendering. |
| **Tier 2** | `$$` | Standard AI | $0.03 – $0.15 / video | GPT-4o-mini / Gemini 1.5 Flash scriptwriting, Fal.ai Flux Schnell/Dev image generation, ElevenLabs Multilingual v2 TTS. |
| **Tier 3** | `$$$` | High-Compute Video Models | $0.20 – $0.80 / video | Synthetic video diffusion (Kling AI v1, Luma Dream Machine, Fal Video), AI Talking Head synthesis (HeyGen, D-ID). |

### 4.2 Dynamic Cost Adjustment for Fallbacks
When a high-compute workflow (such as `ai-videos` or `avatar`) is operating without live keys (in Fallback mode), the card visually displays:
- **Cost Badge**: `$` (or `$$$` with a strikethrough / sub-badge `(Free Mock)`)
- **Tooltip**: `Fallback active: $0.00 compute cost (Dry run mock mode)`

### 4.3 Visual Styling Tokens
- **Tier 1 (`$`)**: `text-emerald-400 bg-emerald-500/10 border-emerald-500/20`
- **Tier 2 (`$$`)**: `text-cyan-400 bg-cyan-500/10 border-cyan-500/20`
- **Tier 3 (`$$$`)**: `text-purple-400 bg-purple-500/10 border-purple-500/20`

---

## 5. Settings Link & Shortcut Behavior

### 5.1 Click Event Separation
A common UX bug is clicking a sub-button inside a card triggering the card's parent navigation link.
**Implementation Guard**:
```tsx
const handleSettingsClick = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  
  const primaryProvider = workflow.primaryProviders[0] || 'general';
  router.push(`/settings?provider=${primaryProvider}&category=${encodeURIComponent(workflow.category)}`);
};
```

### 5.2 Deep Linking to Settings
`app/(app)/settings/page.tsx` supports tabs: `AI Models`, `Stock Media`, `Voice & Audio`, `Brand Kits`, `Usage & Quotas`.
- Clicking Settings on `images` (`fal`) -> `/settings?provider=api_fal&tab=AI%20Models`
- Clicking Settings on `footage` (`pexels`) -> `/settings?provider=api_pexels&tab=Stock%20Media`
- Clicking Settings on `avatar` (`heygen`) -> `/settings?provider=api_heygen&tab=Voice%20%26%20Audio`
- Clicking Settings on `whiteboard` (`gemini`) -> `/settings?provider=api_gemini&tab=AI%20Models`

### 5.3 Inline Quick-Key Modal (Optional Enhancement)
To maximize user velocity, the gear icon can open a lightweight modal (`QuickKeyModal.tsx`) directly within `/create`:
- User inputs key -> Hits "Save & Test" -> API verifies key -> State updates in real time -> Card status flips from 🟡/🔴 to 🟢 instantly without a page reload.

---

## 6. Implementation Checklist for Specialist

- [ ] **Create Component Files**:
  - `app/(app)/create/components/WorkflowCard.tsx`
  - `app/(app)/create/components/WorkflowGrid.tsx`
  - `app/(app)/create/components/StatusBadge.tsx`
  - `app/(app)/create/components/CostBadge.tsx`
  - `app/(app)/create/components/MissionPromptBar.tsx`
- [ ] **Update `app/(app)/create/page.tsx`**:
  - Fetch key status on mount via `GET /api/settings/keys`.
  - Render `MissionPromptBar` and `WorkflowGrid` with all 10 cards.
  - Display summary stats (e.g. "8/10 Workflows Ready").
- [ ] **Verify Key Normalization**: Ensure `gemini` / `api_gemini` and all other providers match reliably.
- [ ] **Verify Route Links**: Ensure `/create/avatar` and `/create/whiteboard` stub pages exist or route correctly.
- [ ] **Run E2E Test**: Execute `tests/e2e/test-api-status.js` or equivalent test harness to verify status calculations.

---
*Report prepared for orchestrator review and implementer dispatch.*
