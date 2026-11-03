# dashboard

## Overview
Video studio dashboard cards and publishing/exporting dialogs for rendered video preview, social distribution, and workspace organization.

## Interface
- [DashboardCard.tsx:DashboardCard] - Video grid card presenting 9:16 video thumbnails, inline preview playback, format tags, and workspace actions.
- [PublishModal.tsx:PublishModal] - Modal dialog supporting social media dispatch (YouTube, TikTok, Instagram) and multi-preset video exports.

## Invariants
- [DashboardCard.tsx:playback] - Mouse leave events on the thumbnail trigger setIsPlaying(false) to halt video playback.
- [PublishModal.tsx:tabs] - Active view state is strictly bounded to 'publish' | 'export'.

## Side Effects
- [DashboardCard.tsx:handleMove] - Dispatches POST request to /api/workspaces/move with video and workspace IDs.
- [PublishModal.tsx:handlePublish] - Issues POST request to /api/publish to schedule external distribution.
- [PublishModal.tsx:handleExport] - Issues POST request to /api/export to prepare downloadable video presets.

## Verification
- Run: `pnpm test`
