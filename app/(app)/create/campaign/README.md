# Campaign Studio Landing Page

## Overview
Server-side routing shim that canonicalizes `/create/campaign` traffic, preserving incoming search parameters and forwarding requests to the 30-Day Viral Bulk Content & Campaign Engine (`/create/bulk`).

## Interface
- [page.tsx:CampaignStudioLandingPage] Default async React Server Component resolving search parameters and dispatching Next.js redirect
- [page.tsx:dynamic] Route segment config `export const dynamic = "force-dynamic"`
- [page.tsx:PageProps] Type definition for Next.js 15+ async searchParams resolution

## Invariants
- [page.tsx:redirect] Must preserve all array and scalar query parameters when redirecting to `/create/bulk`
- [page.tsx:searchParams] Asynchronously resolves `searchParams` Promise to comply with Next.js 15+ constraints

## Side Effects
- [page.tsx:redirect] Throws Next.js redirect exception terminating request execution and issuing HTTP 307 to `/create/bulk`

## Verification
- Run: `node tests/e2e/standalone-runner.js`
