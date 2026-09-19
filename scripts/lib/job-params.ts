/**
 * Shared contract between the enqueue-only mission route and the
 * render-worker's mission branch (Phase B of the worker-hardening plan).
 *
 * The route serializes these params verbatim into render_jobs.logs, and the
 * worker reads them back when it claims the job — keeping both ends of the
 * queue in sync with one source of truth for the payload shape.
 */
export interface MissionJobParams {
  /** Discriminator that routes the job to the MissionOrchestrator pipeline. */
  type: 'mission'
  /** Topic / narration prompt for the autonomous 5-stage mission pipeline. */
  prompt: string
  aspectRatio?: '16:9' | '1:1' | '9:16' | string
  style?: string
  voice?: string
  mock?: boolean
}