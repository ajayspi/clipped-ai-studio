# api

## Overview
Central backend API layer for Clipped AI Studio handling video workflows, queue management, provider routing, developer API, publishing, and workspace state.

## Interface
- export: ./export/README.md
- health: ./health/README.md
- jobs: ./jobs/README.md
- logs: ./logs/README.md
- publish: ./publish/README.md
- settings: ./settings/README.md
- tts: ./tts/README.md
- v1: ./v1/README.md
- workflows: ./workflows/README.md
- workspaces: ./workspaces/README.md

## Invariants
- [nextjs:app-router] All route handlers follow Next.js 16 App Router conventions using export async function GET/POST/PATCH/DELETE
- [nextjs:dynamic-params] Dynamic route parameters ({ params }) are asynchronous Promises and must be awaited before accessing properties
- [queue:orchestration_state] Non-renderable planning workflows explicitly set orchestration_state to 'planning' or 'completed' to prevent worker claim
- [auth:v1] Developer V1 API routes require Bearer/x-api-key authentication while internal workflow routes operate within studio context

## Side Effects
- [database:supabase] Inserts, updates, and deletes records in Supabase tables: render_jobs, videos, settings, workspaces
- [network:external] Dispatches outbound HTTP requests to AI providers, social platforms (YouTube, TikTok, Instagram), and webhook targets

## Verification
- Run: `pnpm test`
