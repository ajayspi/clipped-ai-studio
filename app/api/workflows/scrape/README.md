# scrape

## Overview
Web scraping utility extracting article content from URLs and converting it into video scripts via LLM summarization.

## Interface
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:url] Rejects with 400 if url is missing
- [route.ts:contentType] Rejects with 415 if target is not text/html
- [route.ts:writes queue] Pure utility; does not insert into render_jobs queue

## Side Effects
- [route.ts:safeFetch] Fetches remote webpage with SSRF safe fetch guard
- [route.ts:complete] Calls LLM to summarize webpage into short-form narration script

## Verification
- Run: `pnpm test`
