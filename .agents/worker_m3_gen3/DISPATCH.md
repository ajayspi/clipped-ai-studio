## 2026-09-01T19:43:10+05:30

You are the Milestone 3 Implementation Worker (Gen 3) for Clipped AI Studio.
Working directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m3_gen3
Authoritative User Request: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md
Scope Document: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\PROJECT.md
Test Infrastructure: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\TEST_INFRA.md

Mission:
Implement and verify all components for Milestone 3 (Avatar & Whiteboard Pipelines with Gemini Character References):
1. Create/Implement `lib/ai/gemini-character-generator.ts`:
   - Generate consistent 9-pose character reference sheets (poses: neutral, pointing, eureka, explaining, reading, confused, sitting, writing, blessing) with normalized [0,0,1000,1000] bounding boxes for archetypes: `stickman`, `saint`, `old man`, `founder`, `doctor`, `teacher`, `scientist`, and `custom`.
   - Implement Google Gemini integration (`@google/genai` or REST) with deterministic zero-cost SVG vector mock fallbacks when API keys are unconfigured.
2. Create/Implement `lib/engine/whiteboard-orchestrator.ts`:
   - Two-stage whiteboard generator (Stage 1: Gemini character reference generation; Stage 2: Storyboard beat breakdown, sentiment-to-pose mapping, progressive sketch animations, hand marker overlays, and Remotion composition bundle).
   - In-memory store and Supabase `render_jobs` persistence.
3. Create/Implement `lib/engine/avatar-orchestrator.ts`:
   - Photo/presenter talking-head video generation supporting preset avatars (Sarah, Marcus, Alex, Emma, David, Elena) and custom photo avatars (`customImageUrl`).
   - PiP layouts (`pip_bottom_right`, `pip_bottom_left`, `circular_bubble`), `fullscreen`, and `side_by_side` compositing with background B-roll and TTS audio sync.
   - Deterministic Remotion compositing fallback for offline/zero-key environments.
4. Create/Implement API Routes:
   - `app/api/workflows/whiteboard/route.ts` (POST generate whiteboard, GET poll job)
   - `app/api/workflows/whiteboard/character-sheet/route.ts` (POST generate 9-pose reference sheet)
   - `app/api/workflows/avatar/route.ts` (POST generate avatar video, GET poll job)
5. Create/Implement Studio UI Pages:
   - `app/(app)/create/whiteboard/page.tsx` (Interactive Whiteboard studio with archetype selector, 9-pose grid preview, linework style, marker colors)
   - `app/(app)/create/avatar/page.tsx` (Interactive Avatar studio with avatar roster, custom photo upload, voice selector, PiP/fullscreen layout toggle)
6. Create/Implement and Run E2E Test Suite:
   - `tests/e2e/test-whiteboard-avatar-pipelines.js` (40 test cases covering Gemini character sheets, whiteboard pipeline, avatar pipeline, boundary edge cases, pairwise interactions, real-world scenarios, and zero-key resilience).
   - Run `node tests/e2e/test-whiteboard-avatar-pipelines.js` and verify all tests pass 100%.
