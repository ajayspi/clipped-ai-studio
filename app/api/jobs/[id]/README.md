# [id]

## Overview
Job deletion endpoint removing specific render job records from Supabase by ID.

## Interface
- [route.ts:DELETE] export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse>

## Invariants
- [route.ts:params] Next.js 16 dynamic parameter params must be awaited before extracting id

## Side Effects
- [route.ts:supabase.from('render_jobs').delete] Deletes matching job record from Supabase render_jobs table

## Verification
- Run: `pnpm test`
