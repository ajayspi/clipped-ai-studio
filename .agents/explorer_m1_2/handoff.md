# Handoff Report — Explorer M1-2: API Keys Integration & Types

**Agent**: Explorer M1-2  
**Recipient**: Project Orchestrator (Parent Agent `03f78250-d842-4db7-98fe-c05b039c28c7`)  
**Scope**: Milestone 1 — API Status Indicators & Settings Integration  
**Date**: 2026-09-01  

---

## 1. Observation

1. **`app/api/settings/keys/route.ts` (lines 8-24)**:
   ```typescript
   const { data: keys, error } = await supabase
     .from('settings')
     .select('provider, api_key, is_active, updated_at')
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
   ```
   *Direct Observation*: The endpoint only fetches from the Supabase `settings` table. It does not check `process.env`. If a key is present in `.env.local` (e.g. `GEMINI_API_KEY`, `OPENAI_API_KEY`, `PEXELS_API_KEY`), `isConfigured` is returned as `false` or omitted completely. Furthermore, any Supabase error directly yields a 500 response without graceful fallback.

2. **`app/(app)/settings/page.tsx` (lines 15-26)**:
   ```typescript
   const PROVIDERS = [
     { id: "api_openai", name: "OpenAI", category: "AI Models" },
     { id: "api_gemini", name: "Google Gemini", category: "AI Models" },
     { id: "api_anthropic", name: "Anthropic Claude", category: "AI Models" },
     { id: "api_openrouter", name: "OpenRouter", category: "AI Models" },
     { id: "api_pexels", name: "Pexels", category: "Stock Media" },
     { id: "api_pixabay", name: "Pixabay", category: "Stock Media" },
     { id: "api_kling", name: "Kling Video", category: "Stock Media" },
     { id: "api_luma", name: "Luma Dream Machine", category: "Stock Media" },
     { id: "api_huggingface", name: "Hugging Face (Free AI Video)", category: "Stock Media" },
     { id: "api_deepgram", name: "Deepgram", category: "Voice & Audio" },
   ];
   ```
   *Direct Observation*: `settings/page.tsx` writes providers with an `api_` prefix (`api_gemini`, `api_openai`), while engine workflows (e.g. `lib/keys.ts`, `lib/engine/video-sourcer.ts`) and `PROJECT.md` contracts use un-prefixed keys (`gemini`, `openai`, `pexels`).

3. **`package.json` (lines 18-42)**:
   *Direct Observation*: Neither `swr` nor `@tanstack/react-query` is installed in `dependencies`. `react` is `19.2.8`, `next` is `16.3.3`, and `zustand` is `^5.0.15`.

4. **`lib/engine/types.ts` (lines 276-284)**:
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
   *Direct Observation*: `WorkflowType` contains only 8 types. `'avatar'`, `'whiteboard'`, and `'mission'` are not declared. Additionally, interfaces for `CharacterReferenceSheet`, `CharacterPose`, `WhiteboardStoryboardBeat`, `AvatarGenerationRequest/Response`, and `MissionJobState` are absent from `lib/engine/types.ts`.

---

## 2. Logic Chain

1. **Premise 1**: Workflow cards on `/create` must dynamically reflect live API statuses (🟢 Ready, 🟡 Fallback, 🔴 Unconfigured) per R1 of `ORIGINAL_REQUEST.md`.
2. **Premise 2**: Since developers and automated runners commonly supply API keys via `.env` files, querying only the Supabase database produces false "Unconfigured" (🔴) states unless `.env` values are merged into the `/api/settings/keys` response.
3. **Premise 3**: To eliminate UI layout flicker when navigating to `/create`, client components require an instantaneous 0ms initial render. Since `swr` is not installed, a module-level cached React hook with `localStorage` persistence and background revalidation fulfills this requirement without adding external dependencies.
4. **Premise 4**: Milestones 1, 2, and 3 introduce 10 total workflow cards, including Avatar to Video, Whiteboard Animation, and One-Click Mission Mode.
5. **Deduction**: Extending `lib/engine/types.ts` with union members (`'avatar'`, `'whiteboard'`, `'mission'`) and providing exhaustive contracts for character reference sheets, whiteboard storyboard beats, and avatar generation guarantees end-to-end type safety across the UI, API routes, and backend orchestrator engines.

---

## 3. Caveats

1. **Auth Scoping**: The current `app/api/settings/keys/route.ts` is operating in single-tenant local/development mode (`eq('user_id', 'default_user')`). In a multi-tenant production environment, user session IDs should filter settings rows.
2. **Key Validation vs Key Configuration**: `/api/settings/keys` checks if a key string exists and is non-empty (`isConfigured`). Active health ping validation is performed separately via `POST /api/settings/keys/check`.
3. **No Code Modified Directly**: In accordance with the Explorer archetype rules, no source files were mutated. All proposed replacements and specifications are documented in `report.md`.

---

## 4. Conclusion

1. **Enhance `/api/settings/keys`**:
   - Merge `process.env` keys with Supabase `settings` table rows.
   - Dual-index keys under canonical names (`gemini`) and aliased names (`api_gemini`).
   - Wrap DB calls in try/catch to maintain 100% uptime even if database is unreachable.
2. **Implement `useApiKeys` Hook & Workflow Definitions**:
   - Create `lib/hooks/use-api-keys.ts` with module cache + `localStorage` and request deduplication.
   - Create `lib/engine/workflow-definitions.ts` defining all 10 workflows with cost tiers (`$`, `$$`, `$$$`) and provider mappings.
3. **Upgrade `lib/engine/types.ts`**:
   - Add `'avatar'`, `'whiteboard'`, `'mission'` to `WorkflowType`.
   - Add `ApiKeyStatus`, `WorkflowStatusResult`, `CharacterReferenceSheet`, `CharacterPose`, `WhiteboardStoryboardBeat`, `AvatarGenerationRequest`, `AvatarGenerationResponse`, and `MissionJobState`.

---

## 5. Verification Method

To independently verify the findings and proposed types:

1. **Inspect Target Files**:
   - `view_file` on `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\app\api\settings\keys\route.ts` to confirm absence of `process.env` fallback.
   - `view_file` on `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\lib\engine\types.ts` lines 276-284 to confirm missing `'avatar'` and `'whiteboard'`.
   - `view_file` on `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\package.json` to confirm lack of `swr` or `@tanstack/react-query`.
2. **Full Technical Report**:
   - Review `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m1_2\report.md` for exact interface signatures, proposed code blocks, and the 10-workflow cost/provider matrix.
3. **Post-Implementation Test**:
   - When implementers update the files, verify via `npm test` or `node tests/e2e/test-api-status.js` that `GET /api/settings/keys` returns properly masked provider statuses and `/create` renders 10 workflow cards with correct status badges.
