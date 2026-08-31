-- Supabase Multi-Tenancy & Row Level Security Setup

-- 1. Create users table that links to auth.users
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    tier TEXT DEFAULT 'free',
    niches TEXT[],
    storage_preference TEXT DEFAULT 'cloud',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
ON public.users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.users FOR UPDATE USING (auth.uid() = id);

-- 2. Trigger to automatically create a user record when someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Modify existing tables to link to auth.users (or public.users) and enable RLS
-- Assuming tables videos, render_jobs, api_credits, scheduled_posts already exist.

-- Videos
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own videos" 
ON public.videos FOR ALL USING (auth.uid() = user_id);

-- API Credits
ALTER TABLE public.api_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own credits" 
ON public.api_credits FOR SELECT USING (auth.uid() = user_id);

-- Settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own settings" 
ON public.settings FOR ALL USING (auth.uid() = user_id);

-- Scheduled Posts
-- If user_id doesn't exist, we should add it:
-- ALTER TABLE public.scheduled_posts ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own posts" 
ON public.scheduled_posts FOR ALL USING (auth.uid() = user_id);

-- Render Jobs (links to video, so we can do a join policy or add user_id)
-- For simplicity, usually adding user_id to render_jobs directly is easiest for RLS.
-- ALTER TABLE public.render_jobs ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
-- ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own render jobs" ON public.render_jobs FOR ALL USING (auth.uid() = user_id);
