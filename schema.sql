-- schema.sql
-- Adapted from ProstudioX data models for Supabase PostgreSQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    tier TEXT DEFAULT 'free',
    niches TEXT[],
    storage_preference TEXT DEFAULT 'cloud',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. videos
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    script TEXT,
    workflow TEXT DEFAULT 'standard',
    status TEXT DEFAULT 'draft',
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. render_jobs
CREATE TABLE render_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    logs TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. api_credits
CREATE TABLE api_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    free_quota INTEGER DEFAULT 0,
    used_this_month INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. published_videos
CREATE TABLE published_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    platform_id TEXT,
    url TEXT,
    view_count INTEGER DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$ language 'plpgsql';

CREATE TRIGGER update_videos_modtime 
BEFORE UPDATE ON videos 
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_api_credits_modtime 
BEFORE UPDATE ON api_credits 
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 6. settings (API Keys and Configuration)
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, provider)
);

CREATE TRIGGER update_settings_modtime 
BEFORE UPDATE ON settings 
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 7. scheduled_posts (planner and publishing queue)
CREATE TABLE scheduled_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES render_jobs(id) ON DELETE CASCADE,
    platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
    caption TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending',
    result_urls JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_scheduled_posts_status_time
    ON scheduled_posts(status, scheduled_for);

-- 8. provider_health (API Circuit Breaker)
create table if not exists provider_health (
  id                    text primary key,
  consecutive_failures  integer not null default 0,
  cooldown_until        timestamptz,
  last_error            text,
  updated_at            timestamptz not null default now()
);

create or replace function record_provider_failure(p_id text, p_reason text)
returns void language plpgsql as $$
declare v_failures integer;
begin
  insert into provider_health as ph (id, consecutive_failures, last_error)
  values (p_id, 1, p_reason)
  on conflict (id) do update
    set consecutive_failures = ph.consecutive_failures + 1,
        last_error          = p_reason,
        updated_at          = now()
  returning consecutive_failures into v_failures;

  if v_failures >= 3 then
    update provider_health
       set cooldown_until = now() + interval '60 seconds', updated_at = now()
     where id = p_id;
  end if;
end $$;

create or replace function record_provider_success(p_id text)
returns void language sql as $$
  insert into provider_health as ph (id, consecutive_failures, last_error)
  values (p_id, 0, null)
  on conflict (id) do update
    set consecutive_failures = 0, cooldown_until = null,
        last_error = null, updated_at = now();
$$;

create or replace function get_provider_health()
returns table (id text, consecutive_failures integer, cooldown_until timestamptz, last_error text)
language sql stable as $$
  select ph.id, ph.consecutive_failures, ph.cooldown_until, ph.last_error from provider_health ph;
$$;
