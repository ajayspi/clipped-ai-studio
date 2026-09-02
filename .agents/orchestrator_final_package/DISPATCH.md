## 2026-09-02T22:50:48Z

You are the Project Orchestrator for finalizing the "Clipped" AI video generation platform into a complete, packaged product.

Workspace directory: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`
Agent Working directory: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\orchestrator_final_package`
Authoritative Request: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md` (Check the latest section: `## Follow-up — 2026-09-03T04:20:08+05:30`)

Integrity mode: benchmark

## Task Overview
Finalize the "Clipped" AI video generation platform into a complete, packaged product by adding custom database connections, expanding voice integrations with previews, modernizing the subtitles UI, and adding 5 major new features (Social Export, Branding, Workspaces, Webhooks, Analytics).

## Requirements
### R1. Custom Supabase Connection UI
Add a settings panel allowing users to input their own `NEXT_PUBLIC_SUPABASE_URL` and `ANON_KEY`. The app must dynamically route database queries to this user-provided instance (e.g. via dynamic Supabase client context/storage and connection testing).

### R2. Voice API Expansion & Previews
Integrate Azure TTS and additional free/keyless voice APIs. Add a "Play/Pause" preview button next to each voice model in the settings UI that plays a sample preview.

### R3. Modernize Subtitles UI
Redesign the subtitles configuration section to be highly modern, matching the glassmorphism and vibrant styling of the rest of the application (shadows, blur, visual depth, clean rendering without console errors).

### R4. Complete Package Features
Implement the following premium features:
1. One-Click Export & Publish (Direct to YouTube Shorts/TikTok).
2. Custom Branding & Watermarks (Overlay logos on generated videos).
3. Project Workspaces (Organize videos into folders/campaigns).
4. Developer API & Webhooks (Allow triggering generation via API).
5. Advanced Analytics (Track API usage and cost estimations).

## Acceptance Criteria
- [ ] **R1**: Changing the Supabase credentials in the UI successfully updates the local storage/context, and a test query to the new database succeeds.
- [ ] **R2**: Clicking the "Play" button next to a voice model successfully triggers an audio playback of a sample text.
- [ ] **R3**: The Subtitles UI renders without console errors and features visual depth (e.g., shadows, blur).
- [ ] **R4**: The analytics dashboard successfully calculates and displays a mock API cost based on generated videos.

## 2026-09-02T22:56:12Z

[User Request / Feedback for Ongoing Task]
The user just noticed that many of the API keys they provided in the database (like Grok, Groq, Suno, Cerebras, Mistral, GitHub Models, DeepSeek) are missing from the Settings UI. 
They explicitly requested: "I also gave you many apikeys which were not added give room to add custom apis"

Please update your milestones to include:
1. Dynamically rendering API key input fields in the Settings UI for ANY provider found in the Supabase `settings` table, rather than strictly hardcoding the UI list.
2. A generic "Add Custom API Integration" button in the Settings UI that lets the user define a custom provider name and paste an API key (or base URL) so they can use custom/keyless endpoints (like local LLMs or Azure).
