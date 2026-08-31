## 2026-08-29T00:59:16Z

You are the Sub-Orchestrator for Milestone 1 (AI Video Generators & Types) of the "Clipped" Next.js 14 project.

Working Directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\sub_orch_m1
Parent Conversation ID: 5ed66db4-ecf5-417a-a59a-c3ac74234bea
Authoritative Request File: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\ORIGINAL_REQUEST.md
Scope Document: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\PROJECT.md

Scope & Deliverables for Milestone 1:
1. `lib/engine/types.ts`: Extend with complete data models and contracts for all 6 workflows.
2. `lib/engine/prompts.ts`: Implement structured reusable prompt templates for script generation, scene breakdown, drama consistency, hooks, and story continuations.
3. `lib/engine/video-generator.ts`: Implement `VideoGenerator` singleton supporting Kling AI (`KLING_API_KEY`), Luma Dream Machine (`LUMA_API_KEY`), and Fal.ai (`FAL_API_KEY`), with cost-safe dry-run mock fallbacks.
4. `app/api/workflows/ai-videos/route.ts`: Implement `POST` route handler with synchronous Supabase `render_jobs` insert (`status: 'pending'`, `progress: 0`), async background execution, and `{ success: true, jobId, message }` response.
5. `app/(app)/create/ai-videos/page.tsx`: Implement full interactive UI form panel matching the 2-column layout and submission handler pattern of `/create/footage` and `/create/images`.
