# bulk

## Overview
Zero-click 30-day viral newsroom planner and batch video content calendar generation studio with trend-jacking capabilities.

## Interface
- [page.tsx:default] BulkPage React client component with niche input, trend-jacking toggle, batch size buttons, and export utilities
- [page.tsx:BulkPlan] Interface representing generated batch plan structure with planTitle and items: BulkPlanItem[]

## Invariants
- [page.tsx:contentCount] Batch size is constrained to 7, 14, 21, or 30 days
- [page.tsx:cadence] Publishing cadence is restricted to 'daily', 'weekdays', or 'weekly'
- [page.tsx:platforms] Target distribution networks array must contain at least one of ['tiktok', 'youtube', 'instagram', 'twitter']

## Side Effects
- [page.tsx:handleGenerate] Sends POST request to /api/workflows/bulk-plan with niche, cadence, and visual settings
- [page.tsx:handlePushAll] Sends POST request to /api/workflows/bulk-plan/push to enqueue generated batch items into Supabase render queue
- [page.tsx:handleSavePlan] Persists plan JSON array into window.localStorage['clipped_bulk_plans']
- [page.tsx:handleExportCSV] Creates in-memory Blob and triggers client browser CSV file download
- [page.tsx:handleExportJSON] Creates in-memory Blob and triggers client browser JSON file download
- [page.tsx:handleExportClipboard] Writes tab-delimited script and hook text to navigator.clipboard

## Verification
- Run: `pnpm test`
