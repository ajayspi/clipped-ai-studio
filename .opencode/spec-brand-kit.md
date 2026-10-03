# Spec: Epic 4 - Custom Brand Kits & Watermarking

## Overview
Currently, subtitle styles (font, color) are selected from hardcoded presets, and there's no way to apply a global watermark/logo to videos. We need a "Brand Kit" feature that allows users to persist brand styles globally and inject them into render jobs.

## Requirements

### 1. Database & Settings
- Use the existing `settings` table or create a new JSON blob in Supabase to store `brandKit` configuration.
- The `brandKit` object should include:
  - `watermarkUrl` (string, URL to a PNG/transparent logo)
  - `watermarkPosition` (string, 'top-right', 'top-left', 'bottom-right', 'bottom-left')
  - `customFontUrl` (string, URL to a .ttf file)
  - `customSubtitleColor` (string, hex code)

### 2. UI: Settings Page
- In `app/(app)/settings/page.tsx` (or a new settings tab), add a "Brand Kit" section.
- Allow users to upload a watermark image and custom font file to a Supabase storage bucket (e.g. `assets`), then save the URLs to the `brandKit` settings.
- Add a color picker for the custom subtitle color.

### 3. Orchestration injection
- During job queuing (e.g., in `app/api/workflows/generate/route.ts` or `lib/jobs/enqueue.ts`), fetch the `brandKit` settings and inject them into the `render_jobs.logs` payload (or a dedicated `brand_kit` column if you decide to add one).

### 4. Render Worker (FFmpeg overlay)
- In `scripts/render-worker.ts`, update the video compilation logic:
  - If a `watermarkUrl` is present, download it locally.
  - Apply an FFmpeg `overlay` filter to place the watermark at the specified position.
  - If `customFontUrl` is present, download the font and use it in the `drawtext` filter.
  - If `customSubtitleColor` is present, override the subtitle fontcolor.

### 5. Testing
- Add a tier (e.g. Tier 30) to `tests/e2e/standalone-runner.js` to verify the Brand Kit payload insertion.

## Acceptance Criteria
- [ ] Users can upload a watermark and it renders correctly via FFmpeg.
- [ ] Tests pass cleanly with `pnpm test`.
