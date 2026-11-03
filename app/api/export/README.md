# export

## Overview
Video export resolution converter and preset metadata provider supporting 1080p, 720p, 4K, MP3 audio extraction, and animated GIF formats.

## Interface
- [route.ts:dynamic] export const dynamic = 'force-dynamic'
- [route.ts:EXPORT_PRESETS] export const EXPORT_PRESETS: Record<string, ExportPresetConfig>
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>
- [route.ts:GET] export async function GET(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:preset] Preset falls back to '1080p' if unrecognized
- [route.ts:expiresAt] Sets download link expiration to 7 days from execution
- [route.ts:fileSizeMb] Estimates file size based on bitrate and duration

## Side Effects
- [route.ts:supabase] Reads render_jobs or videos record from Supabase to resolve output media URL

## Verification
- Run: `pnpm test`
