# settings

## Overview
Settings panel and API gateway integration dashboard for monitoring OmniRoute connectivity, latency, and available model counts.

## Interface
- [ApiProviderHub.tsx:ApiProviderHub] - Real-time monitoring card and health probe trigger for the unified OmniRoute gateway.

## Invariants
- [ApiProviderHub.tsx:endpoint] - Falls back to http://localhost:20128/v1 when no stored endpoint URL is configured in settings keys.
- [ApiProviderHub.tsx:autoRefresh] - Interval polling must be tracked in pollTimerRef and cleared on component unmount or state toggle.

## Side Effects
- [ApiProviderHub.tsx:checkHealth] - Dispatches GET to /api/settings/keys to retrieve endpoint metadata, followed by POST to /api/settings/keys/check.

## Verification
- Run: `pnpm test`
