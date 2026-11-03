# Dynamic Workflow Creation Wizard Route

## Overview
Fallback App Router dynamic route handler (`/create/[workflowType]`) that unifies the legacy 5-step CreationWizard workflows (`ai-videos`, `footage`, `images`, `stories`) into a single parametric client wrapper while delegating specialized static sibling routes to their dedicated folders.

## Interface
- [page.tsx:CreateWorkflowPage] Default client component mounting the `CreationWizard` for supported workflow slugs
- [page.tsx:WIZARD_TYPES] Whitelist constant restricting accepted types to `["ai-videos", "footage", "images", "stories"]`
- Integrates with `CreationWizard` (`components/wizard/CreationWizard.tsx`)

## Invariants
- [page.tsx:TypeValidation] Slugs outside `WIZARD_TYPES` immediately trigger Next.js `notFound()` 404 response
- [page.tsx:AsyncParams] Uses React `use()` to unwrap Next.js 15+ async `params` Promise

## Side Effects
- [page.tsx:notFound] Throws Next.js 404 response when `workflowType` is unrecognized

## Verification
- Run: `node tests/e2e/standalone-runner.js`
