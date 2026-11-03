---
trigger: always_on
description: Core architectural and environmental guidelines for the Clipped AI codebase.
---

# Clipped AI Development Guidelines

## 1. Development Environment (Local-First)
- **Constraint**: ALWAYS develop, port features, and edit code in the local Windows workspace (`C:\Users\vigilare\.gemini\antigravity\scratch\clipped`).
- **Restriction**: DO NOT develop or edit code directly on the Oracle VM over SSH. The VM is reserved exclusively for production testing and final deployment. Develop and test offline first.

## 2. LLM JSON Parsing
- **Constraint**: NEVER use standard `JSON.parse()` for parsing LLM (Claude, OpenAI, Gemini) responses.
- **Requirement**: Always use the robust `parseJson` helper utility (located at `lib/ai/llm.ts`) to safely handle markdown fences (```json), unescaped newlines, and trailing conversational text inherent to LLM outputs.

## 3. UI/UX Generation Patterns
- **Constraint**: When building new generation workflows in the `/create` section, strictly maintain the Shadcn UI and Tailwind design system established in the codebase.
- **Auto-Pilot Requirement**: Generation flows must support a hybrid "Auto-Pilot mode." Auto mode should orchestrate the steps automatically without blocking, BUT the UI must remain accessible so the user can inspect or intervene at any time (e.g., pausing to swap out AI-selected clips or modifying the script) during the process.

## 4. Local PM2 Worker Execution (Windows)
- **Constraint**: The `ecosystem.config.js` uses `bun` to run workers natively. If `bun` is not installed globally on the Windows host, `pnpm workers` will fail with an interpreter error.
- **Requirement**: Either install `bun` globally via npm (`npm i -g bun`) if compatible, or modify `ecosystem.config.js` locally to use Node with tsx instead:
  ```javascript
  interpreter: 'node',
  interpreter_args: '--import tsx',
  ```

## 5. Supabase claim_render_job Locking
**Trigger:** When writing background sweepers or recovery workers that revert stuck jobs.
**Behavior to Learn:** Never just set status: 'queued'. The claim_render_job RPC strictly locks based on orchestration_state. You MUST set orchestration_state: 'retryable' or 'queued', otherwise the job becomes permanently unclaimable by the render worker.

## 6. FFmpeg hstack Pixel Format Crashes
**Trigger:** When using hstack or stack to combine multiple video streams (e.g., side-by-side volumetric exports).
**Behavior to Learn:** FFmpeg's hstack strictly requires all inputs to share the exact same pixel format. If combining an RGB video with a grayscale depth map, you MUST explicitly normalize the formats (e.g., ,format=yuv420p) on both streams immediately before the hstack filter, or FFmpeg will crash.

## 7. Zustand + Zundo Timeline Initialization
**Trigger:** When initializing a Timeline or NLE editor state that uses zundo for Undo/Redo time travel.
**Behavior to Learn:** Ensure the initial data load from the database is NOT recorded in the zundo history stack. If the initial hydration is pushed to the stack, the user's first Cmd+Z will revert the timeline to an empty array []. Also, custom Cmd+Z keyboard handlers MUST call e.preventDefault() to stop native browser input collisions.


## 8. PowerShell Parentheses Route Escaping
**Trigger:** Running CLI commands (`eslint`, `git`, `tsc`, `cat`) on Next.js App Router paths containing Route Groups with parentheses like `(app)`, `(auth)`.
**Behavior to Learn:** In PowerShell, unquoted parentheses in file paths (e.g., `app/(app)/create/page.tsx`) are aggressively intercepted as subexpressions, crashing commands with `app : The term 'app' is not recognized as the name of a cmdlet...`. Always wrap route group file paths in single quotes: `'app/(app)/create/page.tsx'`.

## 9. React Derived State: `useMemo` over `useEffect + setState`
**Trigger:** When parsing stateful markup, ASTs, or props into structured document trees (such as VisoTalk `doc.tsx`, WaveDrom WaveJSON, or Lanshu specs).
**Behavior to Learn:** Calling `setState` synchronously within a `useEffect` body to mirror state changes causes cascading re-renders, hurting UI responsiveness and failing ESLint with `react-hooks/set-state-in-effect`. Always compute derived data synchronously using `useMemo`.

## 10. VisoTalk Word-Anchored Narration Timeline Invariant
**Trigger:** When building explainer videos, dynamic visual callouts, badge pop-ins, or subtitle highlights.
**Behavior to Learn:** Frame-based or second-based timestamps drift whenever voiceovers are re-recorded, speech rate changes, or audio is translated into other languages. Always anchor on-screen visual triggers directly to word tokens or indices (`targetWordIndex`). When speech timestamps adjust, visual triggers must automatically track the spoken word rather than relying on absolute timecodes.

## 11. Standalone E2E Runner Tier Registration & Source Assertions
**Trigger:** Adding verification tiers to `tests/e2e/standalone-runner.js`.
**Behavior to Learn:** The runner executes in plain Node without TypeScript path alias loaders (`@/`). Cross-file assertions must inspect module sources (`fs.readFileSync`) to verify exported signatures, functions, types, and markup contracts. Adding tests with `tests.push({ tier: 'Tier X', ... })` without updating the `const tiers = [...]` array causes tests to silently never execute. Always register the tier name in `const tiers = [...]`.

## 12. Zero-Asset Procedural Foley Synthesis Invariant
**Trigger:** When adding cinematic whooshes, word pops, button clicks, risers, and victory dings to video rendering pipelines.
**Behavior to Learn:** Avoid external audio files or downloads that introduce 404s, latency, and copyright issues. Synthesize sound mathematically via FFmpeg filter expressions (`anoisesrc` + bandpass for whooshes, `sine` + frequency decay for pops) and preview them client-side via the Web Audio API at $0 compute.

## 13. Continuous Rank Interpolation for Racing Charts
**Trigger:** Implementing animated rank-swapping bar charts or leaderboards.
**Behavior to Learn:** Snapping integer ranks on discrete time steps creates jarring visual popping. Always compute fractional rank positions and bar widths via smooth continuous interpolation or sigmoid transitions so overtaking bars glide past each other seamlessly.

## 14. XIAS Anti-AI-Slop Visual Hierarchy
**Trigger:** Designing or styling UI pages, studio cards, badges, and modals.
**Behavior to Learn:** Avoid generic "AI template" aesthetics (opaque muddy purple gradients, low-contrast text, unpadded borders). Strictly enforce the Dark-Tech Studio palette: Canvas Base (`bg-background` #09090b) -> Panels (`bg-card/80` #18181b with `border-border/40`) -> Popovers (`bg-popover` #27272a). Primary violet/purple is reserved exclusively for primary CTAs and active states, never full-card background fills. Always pair glassmorphic blurs with subtle luminous borders (`border-white/5` or `border-border/40`).

## 15. 8-State Interactive Component Model & Keyboard Accessibility
**Trigger:** Building or styling interactive buttons, cards, sliders, dropdown items, or timeline clips.
**Behavior to Learn:** Never use `disabled:opacity-50` as a catch-all for loading or active states. All interactive elements must define 8 discrete states: (1) default, (2) hover (`hover:border-primary/50`), (3) focus-visible (`focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`), (4) active (`active:scale-[0.98]`), (5) disabled (`disabled:opacity-50 disabled:pointer-events-none`), (6) loading (`Loader2` + action text), (7) error (`border-rose-500/50 text-rose-400`), and (8) selected (`ring-1 ring-primary bg-primary/10`). All icon-only buttons must provide `aria-label` or `title`, and mobile touch targets must meet the 44x44px minimum.

## 16. Actionable UX Microcopy & Error Formulas
**Trigger:** Writing error banners, toasts, confirmation dialogs, and empty states.
**Behavior to Learn:** Never display raw technical error codes (`Error 500: Failed to fetch`) or vague empty notices. All error messages must strictly follow the three-part formula: `[What happened] -> [Why it occurred] -> [How to fix]`. All empty states must combine a muted 25% opacity icon, a direct heading, a 1-sentence value proposition, and a prominent primary action CTA.

