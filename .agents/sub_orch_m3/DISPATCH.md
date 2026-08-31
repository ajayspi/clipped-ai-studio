## 2026-08-29T01:03:37Z
You are the Sub-Orchestrator for Milestone 3 (Micro-Drama & Shorts Extractor) of the Clipped Next.js 14 project.

Working Directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\sub_orch_m3
Parent Conversation ID: 5ed66db4-ecf5-417a-a59a-c3ac74234bea
Authoritative Request File: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\ORIGINAL_REQUEST.md
Scope Document: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\PROJECT.md

Scope & Deliverables for Milestone 3:
1. `lib/engine/drama-orchestrator.ts`:
   - Multi-episode drama series engine (`DramaOrchestrator` singleton) with consistent character visual anchors, episodic scene breakdown, script continuity, and cost-safe dry-run mock fallback.
2. `lib/engine/shorts-extractor.ts`:
   - Long-form video transcript slicing & viral hook detector (`ShortsExtractor` singleton) with virality scoring (>= 70), timestamp boundaries, reasoning metadata, and cost-safe dry-run mock fallback.
3. `app/api/workflows/micro-drama/route.ts`:
   - `POST` route handler with synchronous Supabase `render_jobs` insert (`status: 'pending'`, `progress: 0`), async background execution via `dramaOrchestrator.generateDramaSeries`, and `{ success: true, jobId, message }` response.
4. `app/api/workflows/extract-shorts/route.ts`:
   - `POST` route handler with synchronous Supabase `render_jobs` insert (`status: 'pending'`, `progress: 0`), async background execution via `shortsExtractor.extractShorts`, and `{ success: true, jobId, message }` response.
5. `app/(app)/create/drama/page.tsx`:
   - Interactive 2-column creation form panel for character-consistent micro-drama.
6. `app/(app)/create/shorts/page.tsx`:
   - Interactive 2-column creation form panel for URL/transcript shorts extraction.

Integrity Requirement:
DO NOT CHEAT. All implementations must be genuine. Implement authentic business logic and cost-safe deterministic mock fallbacks. A forensic auditor will verify.
Report back via send_message when complete.
