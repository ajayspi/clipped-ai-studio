-- =============================================================================
-- Realtime job-queue wiring + public "renders" storage bucket
--
-- Apply manually in the Supabase SQL editor (or `supabase db push`).
-- Every statement is idempotent (safe to re-run).
--
-- 1. Workers subscribe to postgres_changes on these tables, so they wake on
--    new jobs instead of hot-polling every few seconds.
-- 2. The public bucket lets the render worker upload finished MP4s and hand
--    absolute URLs to the frontend (required before the Vercel split).
-- =============================================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE render_jobs;
EXCEPTION
  WHEN duplicate_object THEN NULL; -- table already in publication
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE scheduled_posts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('renders', 'renders', true)
ON CONFLICT (id) DO NOTHING;

-- Finished renders are public-read (frontend plays the URL directly).
-- Uploads use the service-role key from the render worker, which bypasses RLS.
DO $$
BEGIN
  CREATE POLICY "Public read access to renders"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'renders');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
