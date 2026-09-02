---
name: supabase-rls-backend
description: Rule for safely interacting with Supabase from Next.js backend API routes to avoid RLS blocks.
---

# Supabase Row-Level Security in Next.js API Routes

**Trigger**: When writing Next.js API Routes (`app/api/**`) that interact with Supabase.

**Behavior**: 
- Always use the `SUPABASE_SERVICE_ROLE_KEY` (via a dedicated `supabaseAdmin` client) in server-side API routes to bypass Row-Level Security (RLS) when reading/writing application configuration, API keys, or background worker jobs. 
- Never use the `NEXT_PUBLIC_SUPABASE_ANON_KEY` for backend orchestration unless you are explicitly querying data on behalf of an authenticated user session that matches RLS policies.
