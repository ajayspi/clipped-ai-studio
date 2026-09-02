# Original User Request

## Initial Request — 2026-09-01T15:27:30+05:30

You are the Project Orchestrator for Clipped AI Studio dashboard UI enhancement and database seeding.

Workspace directory: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`
Agent Working directory: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\orchestrator_ui_seed`
Authoritative Request: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md`

## Task Overview
Enhance the Clipped AI Studio dashboard UI with a collapsible glassmorphism sidebar, vibrant color schemes, and placeholder images. Additionally, write a Supabase seeder script to populate the Library and Planner views with realistic mock data to remove their blank states.

Integrity mode: development

## Requirements
### R1. Dashboard UI & Sidebar Redesign
Update the main application layout to include a collapsible side navigation bar. The sidebar must feature glassmorphism styling (translucent, blurred background). Enhance the overall color scheme of the dashboard to be vibrant, colorful, and add icons wherever appropriate.

### R2. Dashboard Imagery
Incorporate high-quality images into the dashboard to make it look like a real, active application. Sourcing options include generating them or using high-quality stock URLs / realistic placeholder assets.

### R3. Supabase Data Seeding
Write a database seeder script (e.g., `scripts/seed.ts` or `seed.js`) to insert realistic mock data into the Supabase database. The script must populate the `render_jobs` table (for the Library) and the relevant tables for the Planner so that both views display active content rather than blank states.

## Acceptance Criteria
### UI Implementation
- [ ] The side navigation bar successfully toggles between a collapsed (icon-only) and expanded state.
- [ ] The side navigation bar implements CSS `backdrop-filter: blur()` or Tailwind `backdrop-blur` for the glassmorphism effect.
- [ ] At least 5 new icons are added across the dashboard components.

### Database Seeding & Verification
- [ ] A dedicated seeder script (e.g., `seed.ts` or `seed.js`) exists in the repository.
- [ ] Running the seeder script programmatically inserts at least 5 mock records into the Supabase database for both the Library and the Planner.
- [ ] The `app/(app)/library/page.tsx` and Planner pages successfully fetch and render the mock data without displaying an empty state.

## Orchestrator Rules & Workflow
- Maintain `progress.md` and `BRIEFING.md` in your working directory.
- Decompose the work, dispatch specialists, track progress, review and test.
- When all requirements are implemented and fully verified with tests passing, report completion back to the Sentinel (parent) via send_message with a complete summary and verification evidence.

## Follow-up — 2026-09-01T17:09:53+05:30

Enhance the 'create' section of the Clipped AI dashboard with API configuration status indicators and settings links. Implement an 'automatic mission' mode that generates end-to-end videos from a single prompt, and research/build pipelines for avatar-to-video and whiteboard animation with consistent Gemini-generated character references.

Working directory: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`
Integrity mode: development

## Requirements

### R1. API Status Indicators
Add visual indicators (green, orange, red, $) to each workflow card in the `create` section, reflecting the configuration status of required APIs. Add a settings icon linking to the configuration page.

### R2. Automatic Mission Mode
Implement a "one-click" generation flow where typing a subject and hitting enter automatically initiates the full video generation pipeline. The user should immediately navigate to a dedicated "Mission Progress" view that shows the steps completing automatically, while still allowing a "manual/edit" toggle for granular control.

### R3. Whiteboard & Avatar Pipelines
Research and integrate two new workflows: "Avatar to Video" and "Whiteboard Animation". The team is free to research and decide the best external models/APIs to use for generating Avatars and Whiteboards. However, the whiteboard pipeline must use Google Gemini to generate consistent character reference sheets (e.g., stickman, saint, old man, etc.) that drive the video generation.

## Acceptance Criteria

### UI & UX Verification
- [ ] Each workflow card dynamically displays a status dot (green, red, orange) based on the `/api/settings/keys` response.
- [ ] Submitting a prompt in "Automatic" mode navigates the user to a Mission Progress view where the job automatically progresses without manual intervention.

### Pipeline Verification
- [ ] New UI cards for "Avatar" and "Whiteboard" are added to the create section.
- [ ] Backend orchestrators for Whiteboard animation successfully use Gemini to generate character references before rendering.

## Follow-up — 2026-09-03T04:20:08+05:30

Finalizing the "Clipped" AI video generation platform into a complete, packaged product by adding custom database connections, expanding voice integrations with previews, modernizing the subtitles UI, and adding 5 major new features (Social Export, Branding, Workspaces, Webhooks, Analytics).

Working directory: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`
Integrity mode: benchmark

## Requirements

### R1. Custom Supabase Connection UI
Add a settings panel allowing users to input their own `NEXT_PUBLIC_SUPABASE_URL` and `ANON_KEY`. The app must dynamically route database queries to this user-provided instance.

### R2. Voice API Expansion & Previews
Integrate Azure TTS and additional free/keyless voice APIs. Add a "Play/Pause" preview button next to each voice model in the settings UI.

### R3. Modernize Subtitles UI
Redesign the subtitles configuration section to be highly modern, matching the glassmorphism and vibrant styling of the rest of the application.

### R4. Complete Package Features
Implement the following premium features:
1. One-Click Export & Publish (Direct to YouTube Shorts/TikTok).
2. Custom Branding & Watermarks (Overlay logos on generated videos).
3. Project Workspaces (Organize videos into folders/campaigns).
4. Developer API & Webhooks (Allow triggering generation via API).
5. Advanced Analytics (Track API usage and cost estimations).

## Acceptance Criteria

### Verification (Programmatic & UI)
- [ ] **R1**: Changing the Supabase credentials in the UI successfully updates the local storage/context, and a test query to the new database succeeds.
- [ ] **R2**: Clicking the "Play" button next to a voice model successfully triggers an audio playback of a sample text.
- [ ] **R3**: The Subtitles UI renders without console errors and features visual depth (e.g., shadows, blur).
- [ ] **R4**: The analytics dashboard successfully calculates and displays a mock API cost based on generated videos.

## Follow-up — 2026-09-03T04:26:12+05:30

Dynamic API Key Management & Custom API Integrations:
1. Dynamically render API key input fields in the Settings UI for ANY provider found in the Supabase `settings` table (including Grok, Groq, Suno, Cerebras, Mistral, GitHub Models, DeepSeek, Azure, etc.) rather than strictly hardcoding the UI list.
2. Provide a generic "Add Custom API Integration" button and modal/form in the Settings UI allowing users to define custom provider names, paste API keys / base URLs, and connect custom or local keyless endpoints.
