# Clipped: Week 1 Kickoff Brief for Antigravity
## Architecture & Setup Phase

PROJECT OVERVIEW:
- Name: Clipped
- Tagline: Clip ideas into viral videos with AI
- Goal: Free, open-source creator studio with 8 AI workflows
- Timeline: 8 weeks parallel build
- Repository: github.com/clipped-ai/clipped
- License: MIT

WEEK 1 OBJECTIVE: Scaffold everything. Get to "Hello Clipped" running locally.

DELIVERABLES:
✓ GitHub repo created & structured
✓ Next.js 14 + React 19 + TypeScript scaffolding
✓ Supabase PostgreSQL connected with all 5 tables
✓ Database schema (users, videos, render_jobs, api_credits, published_videos)
✓ Environment setup (.env.local)
✓ Docker Compose for self-hosted
✓ App shell (navbar, sidebar, routing)
✓ Login/register flow (NextAuth.js v5)
✓ Theme switcher (dark/light mode)
✓ Basic dashboard page (layout only)

TECH STACK (ENFORCE):
- Framework: Next.js 14.2+
- React: 19
- TypeScript: 5.4+
- Styling: Tailwind CSS 4.0+
- Components: shadcn/ui v0.9.0+
- Icons: lucide-react
- Database: Supabase (PostgreSQL)
- Auth: NextAuth.js v5
- Forms: react-hook-form + zod
- State: Zustand (client) + Server State
- Build: Turbopack
- Package Manager: pnpm

GITHUB REPO STRUCTURE:
- app/ (Next.js 14 App Router)
  - (auth)/ (login, register)
  - (app)/ (dashboard, create, library, settings)
  - api/ (auth, health endpoints)
- components/ (UI, layouts, theme-toggle)
- lib/ (auth, db, store, utils, validators)
- styles/ (globals.css with Tailwind)
- public/ (logo.svg)
- Dockerfile + docker-compose.yml
- .env.example
- README.md

DATABASE TABLES (Supabase PostgreSQL):
1. users (id, email, name, tier, niches, storage_preference)
2. videos (id, user_id, title, script, workflow, status, view_count)
3. render_jobs (id, video_id, status, progress, error_message, logs)
4. api_credits (id, user_id, provider, free_quota, used_this_month)
5. published_videos (id, video_id, platform, platform_id, url, view_count)

CRITICAL CHECKS:
✓ pnpm build succeeds
✓ pnpm dev starts, http://localhost:3000 loads
✓ Dark mode toggle works
✓ Login/register at /login and /register
✓ After login, redirects to dashboard
✓ Sidebar navigation works
✓ Supabase tables visible and queryable
✓ docker-compose up builds without errors
✓ No TypeScript errors or ESLint warnings
✓ GitHub repo is public with MIT license

TASK BREAKDOWN (5 parallel agents):
1. Project Setup: GitHub repo, Next.js 14, TypeScript, ESLint, shadcn/ui
2. Database & Auth: Supabase setup, 5 SQL tables, NextAuth.js v5, GitHub OAuth
3. Frontend Shell: App layout, navbar, sidebar, navigation routing, landing page
4. Styling: Tailwind CSS 4, color palette, global styles, component library testing
5. Deployment: Dockerfile, docker-compose.yml, .env.example, README setup instructions

ACCEPTANCE CRITERIA:
1. Build succeeds: pnpm build runs without errors
2. Dev server starts: pnpm dev → http://localhost:3000 loads
3. Auth flow works: Can login/register and access protected pages
4. Database connected: Supabase tables visible and queryable
5. Dark mode works: Theme toggle switches between light/dark
6. Docker builds: docker-compose up runs without errors
7. Tests pass: Any unit tests added pass cleanly
8. Code quality: No TypeScript errors or ESLint warnings
9. README complete: Setup guide + deployment options
10. GitHub ready: Repo is public, has MIT license, all code committed

REFERENCE DOCUMENTS:
- CLIPPED_DESIGN_STACK.md (Tech stack details & patterns)
- CLIPPED_COMPONENTS_EXAMPLES.tsx (Production component templates)
- UML_DIAGRAMS_WORKFLOWS.md (System architecture diagrams)
- ANTIGRAVITY_COMPLETE_HANDOVER.md (Full project specification)

READY? Let's build Clipped Week 1!
