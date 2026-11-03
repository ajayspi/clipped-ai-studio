# workspaces

## Overview
CRUD workspace and project folder management with database persistence and resilient in-memory fallback.

## Interface
- [route.ts:dynamic] export const dynamic = 'force-dynamic'
- [route.ts:WorkspaceItem] export interface WorkspaceItem
- [route.ts:GET] export async function GET(): Promise<NextResponse>
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>
- [route.ts:PATCH] export async function PATCH(req: Request): Promise<NextResponse>
- [route.ts:DELETE] export async function DELETE(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:POST] Requires valid non-empty workspace name string; automatically derives kebab-case slug
- [route.ts:PATCH/DELETE] Requires id parameter; returns 400 if missing
- [route.ts:fallbackWorkspaces] Falls back to in-memory workspace store if database query fails

## Side Effects
- [route.ts:supabase.from('workspaces')] Reads, inserts, updates, and deletes workspaces rows in Supabase
- [route.ts:DELETE] Updates videos belonging to deleted workspace setting workspace_id = null

## Verification
- Run: `pnpm test`
