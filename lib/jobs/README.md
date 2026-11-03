# jobs

## Overview
Background render-job claiming, lease locking, status updates, completion reporting, and workflow queue insertion helpers.

## Interface
- [lib/jobs/render-job.ts:claimRenderJob] export async function claimRenderJob(client: RpcClient, options: RenderJobClaimOptions): Promise<RenderJobClaim | null>
- [lib/jobs/render-job.ts:completeRenderJob] export async function completeRenderJob(client: RpcClient, options: CompleteRenderJobOptions): Promise<void>
- [lib/jobs/render-job.ts:failRenderJob] export async function failRenderJob(client: RpcClient, options: FailRenderJobOptions): Promise<void>
- [lib/jobs/render-job.ts:RenderJobClaim] export interface RenderJobClaim { id: string; orchestration_state: 'claimed'; lease_token: string }
- [lib/jobs/render-job.ts:RenderJobClaimOptions] export interface RenderJobClaimOptions { workerId: string; leaseToken: string; leaseMs: number }
- [lib/jobs/render-job.ts:CompleteRenderJobOptions] export interface CompleteRenderJobOptions { jobId: string; workerId: string; leaseToken: string; outputUrl: string; logs: Record<string, unknown> }
- [lib/jobs/render-job.ts:FailRenderJobOptions] export interface FailRenderJobOptions { jobId: string; workerId: string; leaseToken: string; errorMessage: string }
- [lib/jobs/enqueue.ts:enqueueRenderJob] export async function enqueueRenderJob(spec: { id: string; intent: RenderIntent; status: string; progress?: number; logs: Record<string, unknown>; client?: SupabaseClientLike }): Promise<{ ok: true } | { ok: false; error: string; downgraded: boolean }>
- [lib/jobs/enqueue.ts:RenderIntent] export type RenderIntent = 'render' | 'plan-only' | 'terminal'

## Invariants
- [lib/jobs/render-job.ts:claimRenderJob] Only jobs with orchestration_state in ('queued', 'retryable') or with expired leases can be claimed.
- [lib/jobs/render-job.ts:completeRenderJob] Throws an explicit error if the RPC returns false (lease expired or ownership lost).
- [lib/jobs/enqueue.ts:enqueueRenderJob] Maps 'render' intent to 'qc_pending', 'plan-only' to 'planning', and 'terminal' to 'completed'. If intent is 'render' but beats is empty, automatically downgrades to 'planning' (downgraded: true) to prevent empty concat FFmpeg crashes.

## Side Effects
- [lib/jobs/render-job.ts] Calls Supabase RPCs claim_render_job, complete_render_job, and fail_render_job, updating render_jobs row state and leases.
- [lib/jobs/enqueue.ts] Upserts records into Supabase render_jobs table.

## Verification
- Run: `pnpm test`
