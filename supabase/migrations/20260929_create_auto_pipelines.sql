CREATE TABLE auto_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_name TEXT NOT NULL,
  niche TEXT NOT NULL,
  schedule TEXT NOT NULL,           -- cron expression or keyword
  next_run TIMESTAMPTZ,
  source_strategy TEXT DEFAULT 'trending-rss',
  visual_pipeline TEXT DEFAULT 'ai-videos',
  target_platforms JSONB DEFAULT '["youtube"]',
  voice TEXT DEFAULT 'alloy',
  visual_style TEXT,
  aspect_ratio TEXT DEFAULT '9:16',
  auto_publish BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ,
  last_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
