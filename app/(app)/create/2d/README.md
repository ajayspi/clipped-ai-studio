# 2D Studio Landing Page

## Overview
Server-side routing shim that canonicalizes legacy `/create/2d` traffic, preserving incoming search parameters and forwarding requests to the consolidated 2D Stick Figure Animation & Character Studio (`/create/stick-figure`).

## Interface
- [page.tsx:TwoDStudioLandingPage] Default async React Server Component resolving search parameters and dispatching Next.js redirect
- [page.tsx:dynamic] Route segment config `export const dynamic = "force-dynamic"`
- [page.tsx:PageProps] Type definition for Next.js 15+ async searchParams resolution

## Invariants
- [page.tsx:redirect] Must preserve all array and scalar query parameters when redirecting to `/create/stick-figure`
- [page.tsx:searchParams] Asynchronously resolves `searchParams` Promise to comply with Next.js 15+ constraints

## Side Effects
- [page.tsx:redirect] Throws Next.js redirect exception terminating request execution and issuing HTTP 307 to `/create/stick-figure`

## Verification
- Run: `node tests/e2e/standalone-runner.js`
