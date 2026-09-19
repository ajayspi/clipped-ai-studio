## 2026-09-17T00:15:49Z

You are Worker M2 (Core Routes Headless Tests Implementation) for the Clipped project.
Working directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m2_core_gen2
Workspace directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped

MANDATORY FIRST STEP: Read the authoritative user request, project plan, and Explorer findings:
1. C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md (specifically the section "## Follow-up — 2026-09-16T21:22:28Z")
2. C:\Users\vigilare\.gemini\antigravity\scratch\clipped\PROJECT.md
3. C:\Users\vigilare\.gemini\antigravity\scratch\clipped\test\setup.ts
4. Explorer reports:
   - C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m2_1\handoff.md
   - C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m2_2\handoff.md
   - C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m2_3\handoff.md

Your exclusive write ownership covers:
- `app/(app)/queue/page.tsx`
- `app/(app)/planner/page.tsx`
- `test/setup.ts`
- `test/pages/core/dashboard.test.tsx`
- `test/pages/core/settings.test.tsx`
- `test/pages/core/library.test.tsx`
- `test/pages/core/queue.test.tsx`
- `test/pages/core/planner.test.tsx`
- `test/pages/core/auth.test.tsx`
- `test/supabase-mock-adversarial.test.tsx`

Your implementation tasks:
1. Create `app/(app)/queue/page.tsx`:
   - Standalone client component route rendering queue jobs with `/api/jobs` and `QueueCard` (see Explorer M2-1 handoff for blueprint).
2. Apply defensive date validation to `app/(app)/planner/page.tsx`:
   - Guard `new Date(p.scheduled_for)` at line 36 and line 64 so invalid/missing timestamps do not crash `date-fns` v4 with `RangeError: Invalid time value`.
3. Enhance `test/setup.ts`:
   - Add mock fallback for `/api/settings/health` returning `{ success: true, providers: [], summary: { total: 0, healthy: 0, offline: 0, byCategory: {} } }`.
   - Add mock fallback for `/api/tts/preview` returning `{ success: true, audioUrl: "mock-audio-url" }`.
   - Add `signInWithOAuth` stub in Supabase auth mocks.
4. Implement the complete Core test suite in `test/pages/core/`:
   - `dashboard.test.tsx`: async RSC pattern (`const page = await DashboardPage(); render(page);`), testing empty and populated states.
   - `settings.test.tsx`: Client component render with `useSupabase`, tab switching, keys, and modals.
   - `library.test.tsx`: Client component render testing loading, empty, populated video cards, workspace tabs, queue panel.
   - `queue.test.tsx`: Client component render testing standalone queue route.
   - `planner.test.tsx`: async RSC pattern (`const page = await PlannerPage(); render(page);`), testing calendar days and scheduled post cards with defensive handling.
   - `auth.test.tsx`: Testing Login and Register pages, form inputs, submit buttons, and redirects.
5. If `test/supabase-mock-adversarial.test.tsx` line 400 has the button query mismatch ("create account" vs "Sign Up"), fix the label query so it passes.
6. Execute test commands using `run_command`:
   `npx vitest run test/pages/core/` (or `npm test -- test/pages/core/`)
   Verify 100% of tests pass!
7. Document test commands, pass/fail counts, and changes made in your handoff report:
   `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m2_core_gen2\handoff.md`
