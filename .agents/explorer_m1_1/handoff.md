# Milestone 1 Handoff Report: Workflow Cards & Status Logic

**Agent**: Explorer M1-1  
**Recipient**: Orchestrator / Implementer M1  
**Scope**: Milestone 1 (API Status Indicators, Cost Badges & Settings Links for Create Hub)  
**Status**: Hard Handoff (Analysis Complete)  

---

## 1. Observation

Direct observations from codebase inspection:

1. **Current `app/(app)/create/page.tsx`**:
   - Lines 4-77: Static array of only 8 workflows (`footage`, `images`, `ai-videos`, `stories`, `bulk`, `shorts`, `drama`, `auto`).
   - Missing the 2 new requested workflows: `avatar` ("Avatar to Video" - `/create/avatar`) and `whiteboard` ("Whiteboard Animation" - `/create/whiteboard`).
   - Lines 80-113: Renders static `<Link>` components without any API key state, status pills (🟢/🟡/🔴), cost indicators (`$`/`$$`/`$$$`), or settings shortcuts.

2. **Keys API (`app/api/settings/keys/route.ts`)**:
   - `GET /api/settings/keys`: Queries the Supabase `settings` table and returns:
     ```json
     { "keys": { "<provider>": { "isConfigured": boolean, "isActive": boolean, "maskedValue": string, "updatedAt": string } } }
     ```
   - Provider keys may be named with or without `api_` prefix (`api_gemini`, `gemini`, `api_openai`, `openai`, `api_pexels`, `pexels`, `api_fal`, `fal`, `api_kling`, `kling`, `api_luma`, `luma`, `api_elevenlabs`, `elevenlabs`, `api_heygen`, `heygen`, `api_did`, `did`).

3. **Fallback Capabilities in Engine (`lib/engine/*`)**:
   - `llm.ts`: Falls back from OpenAI/Gemini to `text.pollinations.ai` (zero-cost keyless text generation).
   - `image-generator.ts`: Falls back from Fal.ai Flux to `image.pollinations.ai` (zero-cost keyless image generation).
   - `video-generator.ts`: Generates cost-safe dry-run mock videos when `KLING_API_KEY`, `LUMA_API_KEY`, or `FAL_API_KEY` are missing.
   - `tts.ts`: Falls back from ElevenLabs / Google Cloud TTS to free Google Translate TTS (`tw-ob`) or deterministic RIFF/WAVE PCM synthesizer.
   - `video-sourcer.ts`: Sources from Pixabay / Openverse when Pexels is missing.

4. **Settings Page (`app/(app)/settings/page.tsx`)**:
   - Categorizes providers into `AI Models`, `Stock Media`, `Voice & Audio`, `Brand Kits`, and `Usage & Quotas`.
   - Deep linking can target specific providers using query parameters e.g. `?provider=api_gemini&tab=AI%20Models`.

---

## 2. Logic Chain

1. **From Observation 1 & 2 to Component Architecture**:
   - Because `app/(app)/create/page.tsx` must display real-time API configuration status and trigger instant background checks, it should be structured as a client-side component (or use a client child component `WorkflowGrid.tsx`) fetching `/api/settings/keys` on mount.
   - Modularity is achieved by separating `WorkflowGrid.tsx`, `WorkflowCard.tsx`, `StatusBadge.tsx`, `CostBadge.tsx`, and `MissionPromptBar.tsx`.

2. **From Observation 2 & 3 to Status Calculation**:
   - A workflow is **🟢 Ready (`ready`)** if any of its primary provider keys (`isConfigured === true && isActive !== false`) are satisfied.
   - A workflow is **🟡 Fallback Active (`warning`)** if primary keys are missing, but its built-in engine provides an active fallback (e.g. Pollinations, Pixabay, Free Google TTS, or deterministic dry-run).
   - A workflow is **🔴 Config Required (`error`)** only if critical keys are missing with no available fallback (e.g., proprietary external avatar synthesis if mock is disabled).

3. **From Engine Workloads to Cost Tiers**:
   - `$` (Free / Cheap / Fallback): `footage` (stock), `shorts` (clipping), `bulk` (text plan), or any workflow in fallback mode.
   - `$$` (Standard AI): `images` (Flux), `stories` (LLM + voice), `drama` (episodic script + character anchor), `whiteboard` (Gemini 9-pose character sheet + SVG sketch).
   - `$$$` (High Compute): `ai-videos` (Kling/Luma video diffusion), `avatar` (HeyGen / D-ID talking head), `auto` (auto-pilot video generation).

4. **From Observation 4 to Settings Routing**:
   - The settings gear on each card must use `e.stopPropagation()` and `e.preventDefault()` to prevent card click navigation.
   - Clicking gear navigates to `/settings?provider=<primaryProvider>&tab=<category>`.

---

## 3. Caveats

- **Network Availability**: In environments where live external endpoints (e.g., api.openai.com, fal.run) are unreachable or unconfigured, the status calculation correctly evaluates to 🟡 (Fallback Active), allowing full functional testing and demonstration without real API costs.
- **Provider Key Normalization**: The database may contain keys stored with `api_` prefix or bare names. The resolver utility in `report.md` handles both formats to ensure zero breaking changes.
- **No Direct Source Changes**: As an Explorer agent, no source files were modified. All detailed designs and code snippets are provided in `report.md`.

---

## 4. Conclusion

Milestone 1 design is fully specified and ready for implementation.
1. The Create Hub requires expanding to **10 workflow cards** (adding Avatar to Video and Whiteboard Animation).
2. The card component must feature 3 visual indicators:
   - Dynamic Status Dot/Pill (🟢 Ready, 🟡 Fallback, 🔴 Error) with informative tooltip.
   - Cost Badge (`$`, `$$`, `$$$`).
   - Settings Gear with deep-link navigation to `/settings`.
3. All specifications, interfaces, and algorithms are documented in `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m1_1\report.md`.

---

## 5. Verification Method

To verify the Milestone 1 implementation:
1. **Component Rendering**:
   - Inspect `app/(app)/create/page.tsx` to verify all 10 cards are rendered.
   - Inspect the presence of status dots, cost tier badges, and settings gear buttons.
2. **API Status Resolution**:
   - Create and run `tests/e2e/test-api-status.js` or run `npm run test` to verify that `evaluateWorkflowStatus()` correctly classifies keys:
     - With `gemini` configured -> Whiteboard card is 🟢 Green.
     - With no keys configured -> Cards with fallbacks show 🟡 Orange ("Fallback Active").
3. **Settings Navigation**:
   - Click the gear icon on any card -> Verify navigation to `/settings?provider=...` without navigating to the workflow route.
