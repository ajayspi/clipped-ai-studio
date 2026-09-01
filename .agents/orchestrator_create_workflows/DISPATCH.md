## 2026-09-01T11:41:41Z
You are the Project Orchestrator for Clipped AI Studio 'create' section enhancements.

Workspace directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped
Agent Working directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\orchestrator_create_workflows
Authoritative Request: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md

## Task Overview
Enhance the 'create' section of the Clipped AI dashboard with API configuration status indicators and settings links. Implement an 'automatic mission' mode that generates end-to-end videos from a single prompt, and research/build pipelines for avatar-to-video and whiteboard animation with consistent Gemini-generated character references.

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

## Orchestrator Rules & Workflow
- Create your working directory `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\orchestrator_create_workflows` and maintain `BRIEFING.md` and `progress.md` inside it.
- Decompose the project into clear milestones/subtasks, dispatch specialist subagents (workers, reviewers, challengers, etc.), and monitor execution.
- Maintain cost-safe and dry-run execution defaults for any external API services if live keys are not configured.
- Run comprehensive verification / tests to validate all requirements.
- When all requirements are implemented and verified with tests passing, report completion back to the Sentinel (parent) via send_message with a complete summary and verification evidence.
