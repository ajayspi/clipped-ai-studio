export interface RenderJobClaim {
  id: string
  orchestration_state: 'claimed'
  lease_token: string
}

export interface RenderJobClaimOptions {
  workerId: string
  leaseToken: string
  leaseMs: number
}

interface RpcClient {
  rpc<T>(name: string, params: Record<string, unknown>): Promise<{
    data: T | null
    error: { message: string } | null
  }>
}

export async function claimRenderJob(
  client: RpcClient,
  options: RenderJobClaimOptions,
): Promise<RenderJobClaim | null> {
  const { data, error } = await client.rpc<RenderJobClaim[]>('claim_render_job', {
    p_worker_id: options.workerId,
    p_lease_token: options.leaseToken,
    p_lease_ms: options.leaseMs,
  })

  if (error) {
    throw new Error(`Unable to claim render job: ${error.message}`)
  }

  return data?.[0] ?? null
}

export interface CompleteRenderJobOptions {
  jobId: string
  workerId: string
  leaseToken: string
  outputUrl: string
  logs: Record<string, unknown>
}

export interface FailRenderJobOptions {
  jobId: string
  workerId: string
  leaseToken: string
  errorMessage: string
}

export async function completeRenderJob(
  client: RpcClient,
  options: CompleteRenderJobOptions,
): Promise<void> {
  const { error } = await client.rpc('complete_render_job', {
    p_job_id: options.jobId,
    p_worker_id: options.workerId,
    p_lease_token: options.leaseToken,
    p_output_url: options.outputUrl,
    p_logs: JSON.stringify(options.logs),
  })

  if (error) {
    throw new Error(`Unable to complete render job: ${error.message}`)
  }
}

export async function failRenderJob(
  client: RpcClient,
  options: FailRenderJobOptions,
): Promise<void> {
  const { error } = await client.rpc('fail_render_job', {
    p_job_id: options.jobId,
    p_worker_id: options.workerId,
    p_lease_token: options.leaseToken,
    p_error_message: options.errorMessage,
  })

  if (error) {
    throw new Error(`Unable to fail render job: ${error.message}`)
  }
}