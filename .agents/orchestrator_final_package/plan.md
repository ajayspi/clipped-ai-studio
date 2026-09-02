# Orchestration Plan: Clipped Final Package

## Objective
Finalize the "Clipped" AI video generation platform into a complete, packaged product matching all requirements in R1-R4 with full verification and automated test coverage.

## Plan Steps
1. **Phase 0: Survey & Discovery**
   - Dispatch 3 parallel Explorers:
     - Explorer 1: Inspect existing database layers, Supabase client setups, contexts, settings UI, and local storage handling.
     - Explorer 2: Inspect existing TTS / Voice integrations, audio players, preview components, subtitles UI & styling.
     - Explorer 3: Inspect existing project structure, export/render pipeline, branding/watermark, workspace/folders, webhooks/API routes, analytics & cost tracking.
   - Aggregate findings into `PROJECT.md` with full Feature Inventory and interface contracts.

2. **Milestone 1: Custom Supabase Connection UI (R1)**
   - Settings UI for user `NEXT_PUBLIC_SUPABASE_URL` and `ANON_KEY`.
   - Dynamic client routing & local storage persistence.
   - Connection test query functionality.

3. **Milestone 2: Voice API Expansion & Previews (R2)**
   - Azure TTS integration + free/keyless TTS providers.
   - Play/Pause preview buttons next to each voice model in settings UI with sample text playback.

4. **Milestone 3: Modernize Subtitles UI (R3)**
   - Redesign subtitles configuration with glassmorphism, visual depth, blur, shadows, and vibrant styling.
   - Ensure clean console/runtime rendering without warnings/errors.

5. **Milestone 4: Premium Package Features (R4)**
   - Social Export & One-Click Publish (YouTube Shorts / TikTok mock/integration).
   - Custom Branding & Watermarks (Logo overlay configuration & rendering).
   - Project Workspaces (Folder / campaign management).
   - Developer API & Webhooks (Trigger video generation via API endpoint & webhook dispatch).
   - Advanced Analytics & Cost Tracking (Track usage, token/API costs).

6. **Milestone 5: Comprehensive E2E Testing & Verification**
   - Unit and integration tests covering all acceptance criteria:
     - R1 credentials update, local storage, test query.
     - R2 voice play/pause preview audio triggering.
     - R3 subtitle UI rendering with visual depth.
     - R4 analytics dashboard cost calculation and mock video cost display.
     - Package features (export, branding, workspace, webhooks).

7. **Milestone 6: Forensic Integrity Audit & Final Presentation**
   - Run teamwork_preview_auditor for integrity forensics.
   - Synthesize report and present completion to parent.
