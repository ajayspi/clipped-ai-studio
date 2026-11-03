# publish

## Overview
Multi-platform video publisher orchestrating social distribution across YouTube Shorts, TikTok, and Instagram Reels with dry-run default.

## Interface
- [route.ts:dynamic] export const dynamic = 'force-dynamic'
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:validation] Rejects with 400 if neither jobId nor videoId is provided
- [route.ts:targetPlatforms] Rejects with 400 if platforms array is empty and isOneClick is false
- [route.ts:isOneClick] Defaults target platforms to ['youtube', 'tiktok', 'instagram'] when isOneClick is true
- [route.ts:isDryRun] Dry-run publishing is enabled by default (isDryRun !== false)

## Side Effects
- [route.ts:SocialPublisherManager.publish] Calls platform publishing adapters for YouTube, TikTok, and Instagram
- [route.ts:supabase.from('render_jobs').update] Updates render_jobs setting published: true and published_platforms

## Verification
- Run: `pnpm test`
