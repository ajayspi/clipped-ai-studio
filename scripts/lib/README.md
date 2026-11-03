# lib

## Overview
Shared TypeScript data contracts and payload interfaces for worker tasks and background pipeline orchestration.

## Interface
- [job-params.ts:MissionJobParams]: Interface defining mission orchestration payload structure serialized in render_jobs.logs (type: 'mission', prompt: string, aspectRatio?: string, style?: string, voice?: string, mock?: boolean)

## Invariants
- [job-params.ts:MissionJobParams.type]: Discriminator type must strictly equal 'mission'
- [job-params.ts:MissionJobParams.prompt]: Prompt string is required for autonomous 5-stage mission execution
- [job-params.ts]: Serves as the single source of truth between the enqueue-only mission route and worker payload deserialization

## Side Effects
- None

## Verification
- Run: `pnpm test`
