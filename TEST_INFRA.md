# E2E Test Infrastructure & Methodology Specification

## 1. Executive Summary & Testing Philosophy

The Clipped E2E Testing Framework provides requirement-driven, opaque-box validation for all 6 AI video generation workflows:
1. **AI Videos** (`lib/engine/video-generator.ts` & `app/api/workflows/ai-videos/route.ts`)
2. **Stories** (`lib/engine/stories-orchestrator.ts` & `app/api/workflows/stories/route.ts`)
3. **Bulk Plan** (`lib/engine/bulk-planner.ts` & `app/api/workflows/bulk-plan/route.ts`)
4. **Extract Shorts** (`lib/engine/shorts-extractor.ts` & `app/api/workflows/extract-shorts/route.ts`)
5. **Micro-Drama** (`lib/engine/drama-orchestrator.ts` & `app/api/workflows/micro-drama/route.ts`)
6. **Auto Pilot** (`lib/engine/auto-pilot.ts` & `app/api/workflows/auto/route.ts`)

### Core Principles
- **Opaque-Box Verification**: Tests validate strict input/output contracts, schema conformance, side effects, and state transitions without reliance on internal private implementation details.
- **Requirement-Driven**: Every test case traces directly to specifications defined in `PROJECT.md` and `ORIGINAL_REQUEST.md`.
- **Cost-Safe Execution**: In non-production and testing environments without active premium API keys (Kling, Luma, Fal, OpenAI), engines must gracefully fallback to deterministic, high-fidelity mock generators without incurring external cloud fees or blocking test flows.
- **Dual-Layer Validation**: Every workflow is verified at two layers:
  1. **Engine Orchestrator Layer**: Direct verification of computational logic, scene breakdown, prompt generation, asset assembly, and structured return types.
  2. **API Route Layer**: Verification of Next.js Route Handlers, payload parsing, HTTP status codes, input validation error responses (400/500), and immediate Supabase `render_jobs` `pending` state persistence.

---

## 2. Test Design Methodologies

### 2.1 Category-Partition Method
Input spaces for each workflow are decomposed into orthogonal categories and partitioned into discrete equivalence classes:
- **Script/Topic Content**: Standard text, unicode/multilingual, minimum length, maximum length, empty/whitespace.
- **Visual Styles & Models**: `kling-v1`, `luma-dream`, `fal-flux`, `photorealistic`, `anime`, `cyberpunk`, `watercolor`, `3d-animation`.
- **Aspect Ratios**: `9:16` (Vertical Reels/TikTok/Shorts), `16:9` (Horizontal YouTube), `1:1` (Square Instagram/Feed).
- **Target Quantities**: Story parts ($1 \le N \le 10$), Bulk calendar days ($1 \le N \le 30$), Drama episodes ($1 \le N \le 12$), Shorts clip counts ($1 \le N \le 10$).
- **Distribution Channels**: `youtube`, `tiktok`, `instagram`, `linkedin`, `twitter`.

### 2.2 Boundary Value Analysis (BVA)
Boundary values are targeted systematically across all numerical and structural parameters:
- Boundary conditions tested: $N_{\text{min}}-1$, $N_{\text{min}}$, $N_{\text{nominal}}$, $N_{\text{max}}$, $N_{\text{max}}+1$.
- Empty payloads (`{}`), null/undefined fields, empty arrays, single-item arrays, maximum allowed batches.
- Transcript timecode boundaries: 0s start times, clip intervals exceeding video duration, overlapping timestamps.

### 2.3 Pairwise (Combinatorial) Testing
Combinatorial interactions between orthogonal configuration options are covered using pairwise reduction:
- `Model` $\times$ `AspectRatio` $\times$ `Voice` $\times$ `Platform`
- `StoryType` $\times$ `PartsCount` $\times$ `IncludeHooks`
- `SourceStrategy` $\times$ `VisualPipeline` $\times$ `AutoPublish`

### 2.4 Real-World Workload Scenarios
Multi-step, stateful user journeys simulating end-to-end production use cases:
- **Scenario A: 30-Day Omnichannel Growth Campaign**: Generating a month of scheduled content across multiple platforms with unique daily hooks.
- **Scenario B: 5-Episode Character-Consistent Micro-Drama**: Maintaining visual anchor continuity across multi-scene narrative arcs.
- **Scenario C: Viral Podcast Slicing & Auto-Repurposing**: Ingesting long-form transcripts, identifying top virality hooks, and slicing vertical clips.
- **Scenario D: Multi-Part Historical Documentary Series**: Multi-part storytelling with cliffhangers and thematic scene breakdowns.
- **Scenario E: Autonomous Niche Aggregator Pipeline**: Hands-off schedule triggering with automated generation and publishing queues.

---

## 3. Test Tier Architecture

```
tests/e2e/
├── types.ts                          # Test definitions, interfaces, and assertions
├── test-harness.ts                   # Lightweight test runner, assertions & mock Supabase adapter
├── tier1-feature-coverage.test.ts    # Tier 1: Feature Coverage (>=5 tests per workflow, 30+ total)
├── tier2-boundary-corner.test.ts     # Tier 2: Boundary & Corner Cases (>=5 tests per workflow, 30+ total)
├── tier3-pairwise-interactions.test.ts # Tier 3: Pairwise Combinatorial & Cross-Workflow Pipelines
├── tier4-workload-scenarios.test.ts  # Tier 4: Real-World Multi-Step Production Scenarios
├── api-routes.test.ts                # API Route Layer (Supabase pending logging & HTTP contracts)
└── runner.ts                         # Master Test Suite Orchestrator & CLI Matrix Reporter
```

### Tier Matrix Breakdown
| Tier | Description | Minimum Target | Verification Scope |
|------|-------------|----------------|-------------------|
| **Tier 1: Feature Coverage** | Primary happy paths & feature variants | $\ge 5$ per workflow (30 total) | Core generation, models, aspect ratios, character anchors, clip extraction, scheduling |
| **Tier 2: Boundary & Corner Cases** | Edge values, extremes, malformed inputs | $\ge 5$ per workflow (30 total) | Empty inputs, extreme lengths, invalid models, boundary clip ranges, error handling |
| **Tier 3: Pairwise & Cross-Feature** | Combinatorial parameter interaction | Pairwise combinations | Cross-parameter matrices, multi-stage pipelines (Story $\to$ Bulk $\to$ Video) |
| **Tier 4: Real-World Workloads** | End-to-end user workflows | $\ge 5$ scenarios | Production-grade campaigns, drama series, podcast repurposing, viral autopilot |
| **API Route Integration** | HTTP route endpoints & DB logging | All 6 workflow endpoints | Status 200/400/500, JSON schema, Supabase `pending` insert validation |

---

## 4. Supabase & Cost-Safe Mock Interception Protocol

1. **Supabase Database Contract**:
   - Every API route invocation must perform an immediate synchronous insert into `render_jobs`:
     ```json
     {
       "id": "<jobId>",
       "status": "pending",
       "progress": 0,
       "started_at": "<ISO-timestamp>"
     }
     ```
   - In test execution, the test harness intercepts `supabase.from('render_jobs').insert(...)` to verify exact record payload schema without requiring external network access.

2. **Cost-Safe Engine Fallback**:
   - When API keys (`KLING_API_KEY`, `LUMA_API_KEY`, `FAL_API_KEY`, `OPENAI_API_KEY`) are omitted in test mode:
     - The video generator returns valid deterministic video URLs (e.g. mock pollination/storage assets).
     - The stories orchestrator decomposes narrative arcs with structured cliffhangers and scenes.
     - The bulk planner builds calendar items with structured daily hooks.
     - The drama orchestrator generates character anchors and episodic scenes.
     - The shorts extractor scores virality and returns boundary-checked clip intervals.
     - The auto pilot computes scheduled cron execution windows and queued jobs.

---

## 5. Execution Instructions

The test runner can be executed directly with Node / tsx or through package scripts:

```bash
# Run complete E2E Test Suite (All Tiers 1-4 + API Routes)
npx tsx tests/e2e/runner.ts

# Or run via Node module loader
node --loader ts-node/esm tests/e2e/runner.ts
```
