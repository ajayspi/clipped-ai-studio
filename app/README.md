# App Subsystem Blueprint

## Overview
The `app/` directory implements the Next.js 16 App Router hierarchy for Clipped AI Studio. It encompasses the public landing page, authentication views, the core multi-view studio workspace, and the comprehensive REST API layer powering video workflows, distributed queue leases, social media publishing, and provider health routing.

## Local Interface & Invariants
- `[layout.tsx:RootLayout]`: Global root layout component applying Geist font variables, global CSS, `ThemeProvider`, and `SupabaseProvider` context.
- `[page.tsx:HomePage]`: Public marketing landing page with interactive feature showcase, sample video carousel, and onboarding call-to-actions.
- Call invariant: Global layout wraps all routes in `ThemeProvider` with attribute="class" and defaultTheme="dark", and initializes `SupabaseProvider` for cookie-based dynamic client auth.

## Subdirectories & Boundaries
- **(app)**: [Studio Views](<./(app)/README.md>) - Authenticated studio application views including Dashboard, Creation Hub, NLE Timeline Editor, Queue, Library, Planner, and Settings.
- **(auth)**: [Auth Views](<./(auth)/README.md>) - Authentication pages and container layout for user login and registration.
- **api**: [API Subsystem](./api/README.md) - Studio backend API layer handling video workflows, queue management, provider routing, developer API, and publishing.

## Verification
- Run: `pnpm test`
