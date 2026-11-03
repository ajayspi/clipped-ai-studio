# migrations

## Overview
Database schema migrations defining scheduled social posts, real-time render replication and public storage buckets, atomic worker lease-locking RPCs (claim_render_job, complete_render_job, fail_render_job), and provider health circuit breakers.

## Interface
- [20260831_create_scheduled_posts.sql] Table scheduled_posts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID REFERENCES render_jobs(id) ON DELETE CASCADE, platforms JSONB NOT NULL DEFAULT '[]'::jsonb, caption TEXT, scheduled_for TIMESTAMPTZ NOT NULL, status VARCHAR(50) DEFAULT 'pending', result_urls JSONB DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())
- [20260831_create_scheduled_posts.sql] Index idx_scheduled_posts_status_time ON scheduled_posts(status, scheduled_for)
- [20260905_realtime_renders_bucket.sql] Publication supabase_realtime ADD TABLE render_jobs, scheduled_posts
- [20260905_realtime_renders_bucket.sql] Storage Bucket storage.buckets id='renders' (name='renders', public=true)
- [20260905_realtime_renders_bucket.sql] Policy 'Public read access to renders' ON storage.objects FOR SELECT USING (bucket_id = 'renders')
- [20260905_render_job_leases.sql] Table Columns public.render_jobs: orchestration_state TEXT NOT NULL DEFAULT 'queued', worker_id TEXT, lease_token TEXT, lease_expires_at TIMESTAMPTZ, attempt_count INTEGER NOT NULL DEFAULT 0, max_attempts INTEGER NOT NULL DEFAULT 3, last_error TEXT, output_url TEXT
- [20260905_render_job_leases.sql] Index idx_render_jobs_claimable ON public.render_jobs(orchestration_state, created_at, lease_expires_at)
- [20260905_render_job_leases.sql] Function public.claim_render_job(p_worker_id TEXT, p_lease_token TEXT, p_lease_ms INTEGER DEFAULT 300000) RETURNS TABLE (id UUID, orchestration_state TEXT, lease_token TEXT)
- [20260905_render_job_leases.sql] Function public.complete_render_job(p_job_id UUID, p_worker_id TEXT, p_lease_token TEXT, p_output_url TEXT, p_logs TEXT) RETURNS BOOLEAN
- [20260905_render_job_leases.sql] Function public.fail_render_job(p_job_id UUID, p_worker_id TEXT, p_lease_token TEXT, p_error_message TEXT) RETURNS BOOLEAN
- [20260929_provider_health.sql] Table provider_health (id TEXT PRIMARY KEY, consecutive_failures INTEGER NOT NULL DEFAULT 0, cooldown_until TIMESTAMPTZ, last_error TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())
- [20260929_provider_health.sql] Function record_provider_failure(p_id TEXT, p_reason TEXT) RETURNS VOID
- [20260929_provider_health.sql] Function record_provider_success(p_id TEXT) RETURNS VOID
- [20260929_provider_health.sql] Function get_provider_health() RETURNS TABLE (id TEXT, consecutive_failures INTEGER, cooldown_until TIMESTAMPTZ, last_error TEXT)

## Invariants
- [20260831_create_scheduled_posts.sql] scheduled_posts.job_id cascades on render_jobs deletion (ON DELETE CASCADE); platforms defaults to empty JSON array; scheduled_for is non-null with timezone.
- [20260905_realtime_renders_bucket.sql] Migration statements are strictly idempotent wrapped in DO  ... EXCEPTION WHEN duplicate_object THEN NULL; END ; or ON CONFLICT DO NOTHING.
- [20260905_render_job_leases.sql] claim_render_job selects jobs using FOR UPDATE SKIP LOCKED where orchestration_state IN ('queued', 'retryable') or expired lease in ('claimed', 'rendering', 'publishing') and attempt_count < max_attempts.
- [20260905_render_job_leases.sql] Qualified column references (render_jobs.orchestration_state) must be maintained to prevent ERROR 42702 ambiguity against the RETURNS TABLE out-parameter.
- [20260905_render_job_leases.sql] complete_render_job and fail_render_job require unexpired lease token matching worker_id (lease_expires_at > now()).
- [20260905_render_job_leases.sql] fail_render_job reverts orchestration_state to 'retryable' (status 'pending') when current_attempt < max_attempts, transitioning to 'failed' only when attempts are exhausted.
- [20260929_provider_health.sql] Exactly 3 consecutive failures triggers a 60-second cooldown window (cooldown_until = now() + interval '60 seconds'); record_provider_success resets consecutive_failures to 0 and clears cooldown.

## Side Effects
- [20260831_create_scheduled_posts.sql] Creates table scheduled_posts and b-tree index idx_scheduled_posts_status_time.
- [20260905_realtime_renders_bucket.sql] Alters supabase_realtime publication to broadcast changes on render_jobs and scheduled_posts; registers public storage bucket 'renders' with RLS select policy on storage.objects.
- [20260905_render_job_leases.sql] Alters public.render_jobs with 8 columns, backfills orchestration_state from status, creates index idx_render_jobs_claimable, and defines 3 SECURITY DEFINER RPC functions.
- [20260929_provider_health.sql] Creates table provider_health and defines circuit-breaker state management functions modifying failure counts and cooldown timestamps.

## Verification
- Run: `pnpm test`
