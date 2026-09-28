import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  claimRenderJob,
  completeRenderJob,
  failRenderJob,
} from '../../lib/jobs/render-job'

test('claims the next render job with a worker identity and lease token', async () => {
  const calls: Array<{ name: string; params: Record<string, unknown> }> = []
  const client = {
    async rpc(name: string, params: Record<string, unknown>) {
      calls.push({ name, params })
      return {
        data: [{ id: 'job-1', orchestration_state: 'claimed', lease_token: 'lease-1' }],
        error: null,
      }
    },
  }

  const claimed = await claimRenderJob(client, {
    workerId: 'render-worker-1',
    leaseToken: 'lease-1',
    leaseMs: 60_000,
  })

  assert.deepEqual(claimed, {
    id: 'job-1',
    orchestration_state: 'claimed',
    lease_token: 'lease-1',
  })
  assert.deepEqual(calls, [{
    name: 'claim_render_job',
    params: {
      p_worker_id: 'render-worker-1',
      p_lease_token: 'lease-1',
      p_lease_ms: 60_000,
    },
  }])
})

test('migration defines an atomic render job claim function', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260905_render_job_leases.sql',
  )
  const migration = fs.readFileSync(migrationPath, 'utf8')

  assert.match(migration, /ALTER TABLE public\.render_jobs/i)
  assert.match(migration, /lease_token/i)
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.claim_render_job/i)
  assert.match(migration, /FOR UPDATE SKIP LOCKED/i)
})

test('completion is guarded by the lease token', async () => {
  const calls: Array<{ name: string; params: Record<string, unknown> }> = []
  const client = {
    async rpc(name: string, params: Record<string, unknown>) {
      calls.push({ name, params })
      return { data: true, error: null }
    },
  }

  await completeRenderJob(client, {
    jobId: 'job-1',
    workerId: 'render-worker-1',
    leaseToken: 'lease-1',
    outputUrl: 'https://storage.example/render.mp4',
    logs: { duration: 4 },
  })

  assert.deepEqual(calls, [{
    name: 'complete_render_job',
    params: {
      p_job_id: 'job-1',
      p_worker_id: 'render-worker-1',
      p_lease_token: 'lease-1',
      p_output_url: 'https://storage.example/render.mp4',
      p_logs: JSON.stringify({ duration: 4 }),
    },
  }])
})

test('completion throws when the lease is gone, instead of silently no-oping', async () => {
  // complete_render_job returns FALSE (not an error) when its UPDATE matched no
  // rows — an expired lease, or a job another worker now owns. The RPC is happy
  // either way, so a naive caller treats a lost job as a completed one and the
  // job is re-claimed and re-rendered.
  const client = {
    async rpc() {
      return { data: false, error: null }
    },
  }

  await assert.rejects(
    () =>
      completeRenderJob(client, {
        jobId: 'job-1',
        workerId: 'render-worker-1',
        leaseToken: 'lease-1',
        outputUrl: 'https://storage.example/render.mp4',
        logs: { duration: 4 },
      }),
    /lease expired or lost ownership/i,
  )
})

test('failure is guarded by the lease token', async () => {
  const calls: Array<{ name: string; params: Record<string, unknown> }> = []
  const client = {
    async rpc(name: string, params: Record<string, unknown>) {
      calls.push({ name, params })
      return { data: true, error: null }
    },
  }

  await failRenderJob(client, {
    jobId: 'job-1',
    workerId: 'render-worker-1',
    leaseToken: 'lease-1',
    errorMessage: 'ffmpeg failed',
  })

  assert.deepEqual(calls, [{
    name: 'fail_render_job',
    params: {
      p_job_id: 'job-1',
      p_worker_id: 'render-worker-1',
      p_lease_token: 'lease-1',
      p_error_message: 'ffmpeg failed',
    },
  }])
})