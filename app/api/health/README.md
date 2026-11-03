# health

## Overview
Service health probe returning static server status and application version.

## Interface
- [route.ts:GET] export async function GET(): Promise<Response>

## Invariants
- [route.ts:GET] Returns 200 with status 'ok', app name 'clipped', and version '0.1.0'
- [route.ts:GET] Unauthenticated public endpoint requiring no session or API key

## Side Effects
- None

## Verification
- Run: `pnpm test`
