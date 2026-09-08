ALTER TABLE public.render_jobs
  ADD COLUMN IF NOT EXISTS orchestration_state TEXT NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS worker_id TEXT,
  ADD COLUMN IF NOT EXISTS lease_token TEXT,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS output_url TEXT;

UPDATE public.render_jobs
SET orchestration_state = CASE
  WHEN status = 'completed' THEN 'completed'
  WHEN status = 'failed' THEN 'failed'
  WHEN status = 'processing' THEN 'rendering'
  ELSE 'queued'
END
WHERE orchestration_state = 'queued';

CREATE INDEX IF NOT EXISTS idx_render_jobs_claimable
  ON public.render_jobs (orchestration_state, created_at, lease_expires_at);

CREATE OR REPLACE FUNCTION public.claim_render_job(
  p_worker_id TEXT,
  p_lease_token TEXT,
  p_lease_ms INTEGER DEFAULT 300000
)
RETURNS TABLE (
  id UUID,
  orchestration_state TEXT,
  lease_token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_job public.render_jobs%ROWTYPE;
BEGIN
  SELECT *
  INTO claimed_job
  FROM public.render_jobs
  WHERE (
    orchestration_state IN ('queued', 'retryable')
    OR (
      orchestration_state IN ('claimed', 'rendering', 'publishing')
      AND lease_expires_at IS NOT NULL
      AND lease_expires_at < timezone('utc'::text, now())
    )
  )
  AND attempt_count < max_attempts
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.render_jobs
  SET orchestration_state = 'claimed',
      status = 'processing',
      worker_id = p_worker_id,
      lease_token = p_lease_token,
      lease_expires_at = timezone('utc'::text, now()) + make_interval(secs => p_lease_ms / 1000.0),
      attempt_count = attempt_count + 1,
      started_at = COALESCE(started_at, timezone('utc'::text, now())),
      last_error = NULL
  WHERE render_jobs.id = claimed_job.id;

  RETURN QUERY
  SELECT render_jobs.id, render_jobs.orchestration_state, render_jobs.lease_token
  FROM public.render_jobs
  WHERE render_jobs.id = claimed_job.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_render_job(
  p_job_id UUID,
  p_worker_id TEXT,
  p_lease_token TEXT,
  p_output_url TEXT,
  p_logs TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.render_jobs
  SET orchestration_state = 'completed',
      status = 'completed',
      output_url = p_output_url,
      logs = p_logs,
      completed_at = timezone('utc'::text, now()),
      lease_expires_at = NULL
  WHERE id = p_job_id
    AND worker_id = p_worker_id
    AND lease_token = p_lease_token
    AND lease_expires_at > timezone('utc'::text, now());

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_render_job(
  p_job_id UUID,
  p_worker_id TEXT,
  p_lease_token TEXT,
  p_error_message TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_attempt INTEGER;
  current_max_attempts INTEGER;
BEGIN
  SELECT attempt_count, max_attempts
  INTO current_attempt, current_max_attempts
  FROM public.render_jobs
  WHERE id = p_job_id
    AND worker_id = p_worker_id
    AND lease_token = p_lease_token
    AND lease_expires_at > timezone('utc'::text, now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE public.render_jobs
  SET orchestration_state = CASE
        WHEN current_attempt < current_max_attempts THEN 'retryable'
        ELSE 'failed'
      END,
      status = CASE
        WHEN current_attempt < current_max_attempts THEN 'pending'
        ELSE 'failed'
      END,
      last_error = p_error_message,
      error_message = p_error_message,
      lease_expires_at = NULL
  WHERE id = p_job_id;

  RETURN TRUE;
END;
$$;