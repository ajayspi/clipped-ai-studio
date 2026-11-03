# avatar

## Overview
Talking head avatar generation studio supporting preset presenters, custom photo uploads, voice cloning, and layout compositing.

## Interface
- [page.tsx:default] AvatarCreatePage React client component with preset avatar catalog, custom image upload, script editor, and layout picker

## Invariants
- [page.tsx:customImageUrl] When switching from custom photo to preset avatar tab, customImageUrl is unset and avatarType resets to 'preset'
- [page.tsx:customImageUrl] Custom photo input safely falls back to default preset image (AVATAR_PRESETS[0].previewUrl) if string is empty or whitespace-only

## Side Effects
- [page.tsx:handleGenerate] Issues POST request to /api/workflows/avatar with voice, script, presenter, and layout configuration
- [page.tsx:router.push] Navigates to /create/mission/${jobId} upon successful initiation

## Verification
- Run: `pnpm test`
