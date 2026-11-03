# mission

## Overview
Autonomous multi-stage video generation mission orchestrator running in-process via Next.js after() with step tracking.

## Interface
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>
- [route.ts:GET] export async function GET(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:prompt] Rejects with 400 if prompt is empty
- [route.ts:after] Uses after() for background mission execution to keep process alive without serverless dropouts
- [route.ts:orchestration_state] Mission runs in-process and is not claimed by FFmpeg worker

## Side Effects
- [route.ts:missionOrchestrator.createJob] Initializes job state in orchestrator
- [route.ts:missionOrchestrator.executeMission] Executes 5-stage video creation pipeline in background

## Verification
- Run: `pnpm test`
