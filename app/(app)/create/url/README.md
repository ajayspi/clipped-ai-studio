# URL to Video Studio

## Overview
Web content ingestion studio that scrapes articles, documentation, or blog posts via `/api/workflows/scrape`, injects the generated script into `useWizardStore`, and triggers auto-pilot generation within the footage wizard.

## Interface
- [page.tsx:UrlToVideoPage] Default client component hosting URL input form and scraper dispatch
- [page.tsx:url] State holding the input URL
- [page.tsx:handleSubmit] Form submission handler orchestrating scraping and wizard store hydration
- Integrates with `useWizardStore` (`components/wizard/wizard-store.ts`)

## Invariants
- [page.tsx:WizardHydration] On scraping success, resets wizard store, sets `workflowType: "footage"`, hydrates `narration` with `data.script`, sets `autoMode: true`, and navigates to `/create/footage`
- [page.tsx:HostnameFallback] Derives default subject title from parsed URL hostname, falling back safely on invalid URL syntax

## Side Effects
- [page.tsx:fetch] Sends POST request to `/api/workflows/scrape` with JSON `{ url }`
- [page.tsx:useWizardStore] Mutates client-side Zustand wizard state
- [page.tsx:router.push] Dispatches client-side route transition to `/create/footage`

## Verification
- Run: `node tests/e2e/standalone-runner.js`
