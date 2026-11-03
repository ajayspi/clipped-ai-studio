# ScriptBreak Studio

## Overview
Screenplay parser that analyzes narrative scripts into discrete cinematic shots and calculates an Emotional Tension Curve across dramatic beats, delegating to `/api/workflows/scriptbreak`.

## Interface
- [page.tsx:ScriptBreakPage] Default client component providing screenplay input and breakdown submission
- [page.tsx:script] State holding raw screenplay text
- [page.tsx:handleBreakdown] Async handler submitting script payload to backend pipeline

## Invariants
- [page.tsx:Validation] Disables breakdown action when script text is empty or whitespace-only
- [page.tsx:Navigation] On successful breakdown (`data.success && data.jobId`), navigates user directly to `/editor/${data.jobId}`

## Side Effects
- [page.tsx:fetch] Sends POST request to `/api/workflows/scriptbreak` with JSON `{ script }`
- [page.tsx:router.push] Client-side navigation to the timeline editor on job creation

## Verification
- Run: `node tests/e2e/standalone-runner.js`
