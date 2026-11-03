# scripts

## Overview
Background workers, daemon schedulers, database seeders, and administrative CLI utilities for video rendering, social publishing, and maintenance.

## Interface
- [render-worker.ts:escapeFfmpegDrawtext]: Escapes string characters for FFmpeg drawtext filter syntax
- [render-worker.ts:normalizeBoxColor]: Normalizes CSS hex and rgba color strings into FFmpeg boxcolor hex format
- [render-worker.ts:buildSubtitleDrawtextFilter]: Generates static or wrapped subtitle drawtext filters from SubtitleConfig presets
- [render-worker.ts:buildKaraokeSubtitleFilter]: Generates word-level highlighted karaoke drawtext filters using timestamp bounds
- [render-worker.ts:startWorker]: Polling loop daemon that claims render_jobs with distributed leases and renders video via FFmpeg/Puppeteer
- [publish-worker.ts:processScheduledPosts]: Polling daemon that claims and publishes due scheduled_posts records across social platforms
- [publish-worker.ts:verifyTableExists]: Validates existence of scheduled_posts Supabase table on startup to prevent crash loops
- [auto-pilot-scheduler.ts:runScheduler]: Scheduler evaluating active auto_pipelines, synthesizing content, and enqueueing render jobs
- [seed.ts:seedDatabase]: Database seeding script populating videos, render_jobs, and scheduled_posts with mock records
- [seed.ts:MOCK_VIDEOS]: Typed mock video dataset array spanning multiple creation workflows
- [seed-dev-auth.ts:seedDefaultUser]: Development script provisioning default enterprise admin user in Supabase auth and public users table
- [logs.ts]: CLI utility tailing and formatting application and error logs with ANSI color coding
- [./lib/README.md]: Contract for shared worker job parameters and payload shapes

## Invariants
- [render-worker.ts:claimRenderJob]: Jobs claimed using lease locking (LEASE_MS >= 60,000ms, default 900,000ms); lease heartbeat renewed every Math.max(15000, Math.floor(LEASE_MS / 3))
- [render-worker.ts:assertOutputValid]: Rendered MP4 output file size must be strictly > 0 bytes or post-encode QC marks job failed
- [render-worker.ts:buildZoompanFilter]: Camera motion filters must animate progress on output frame counter 'on', never input frame counter 'in'
- [render-worker.ts:aspectRatio]: Supported aspect ratios are 9:16 (1080x1920), 16:9 (1920x1080), 1:1 (1080x1080), and volumetric (960x1080)
- [render-worker.ts:volumetric]: FFmpeg volumetric exports require RGB and depth map streams normalized to format=yuv420p before hstack filter
- [publish-worker.ts:status]: Strict scheduled_posts status lifecycle transitions: pending -> publishing -> published | failed
- [auto-pilot-scheduler.ts:auto_pipelines]: Only active pipelines (is_active = true) with next_run <= current timestamp are executed
- [seed-dev-auth.ts:safety]: Refuses to execute in production or when ENABLE_DEV_DEFAULT_USER is not 'true'

## Side Effects
- Spawns external processes (ffmpeg, ffprobe, puppeteer)
- Reads and writes local filesystem files under public/renders/, tmp_renders/, and logs/
- Performs outbound network requests to TTS engines, stock media APIs, and social publishing endpoints
- Mutates Supabase database tables: render_jobs, videos, scheduled_posts, auto_pipelines, settings, users

## Verification
- Run: `pnpm test`
