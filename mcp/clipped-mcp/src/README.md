# src

## Overview
Model Context Protocol (MCP) server implementation for Clipped AI enabling external AI agents to trigger video generation workflows via stdio transport.

## Interface
- [index.ts:ClippedServer] MCP server class registering tools and stdio transport
- [index.ts:generate_video] Tool accepting script, workflow, aspectRatio, voice, and autoFrame to enqueue video generation via /api/workflows/generate

## Invariants
- [index.ts:script] 'script' argument is mandatory and non-empty
- [index.ts:CLIPPED_API_URL] Targets process.env.CLIPPED_API_URL or defaults to http://localhost:3000

## Side Effects
- Listens on stdio for JSON-RPC MCP messages
- Makes outbound HTTP/HTTPS POST requests to Clipped API server to create render jobs

## Verification
- Run: `pnpm test`
