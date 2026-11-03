# trivia

## Overview
Interactive trivia and quiz video generator creating countdown timers, multiple-choice overlays, and reveal audio.

## Interface
- [page.tsx:default] TriviaToVideoPage React client component with trivia topic prompt, question count, and difficulty selector

## Invariants
- [page.tsx:questionsCount] Question count must be a positive integer between 1 and 10

## Side Effects
- [page.tsx:handleGenerate] Sends POST request to /api/workflows/trivia with topic, questions count, and theme settings
- [page.tsx:router.push] Navigates to /dashboard?job=${jobId} upon job acceptance

## Verification
- Run: `pnpm test`
