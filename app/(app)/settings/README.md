# settings

## Overview
Studio settings hub configuring OmniRoute AI gateway, direct provider keys, voice catalog preview, brand kits, and Supabase connections.

## Interface
- [page.tsx:default] SettingsPage React client component with multi-category navigation (OmniRoute AI, Voice Catalog, Brand Kits, Workspaces, Supabase, Health Hub)
- [page.tsx:DIRECT_PROVIDER_GROUPS] Groups of external API providers (LLM & Text, Image & Video, Stock Media, Voice & Music)
- [page.tsx:STATIC_VOICE_CATALOG] Voice catalog definitions with voice samples, genders, and categories
- [page.tsx:SCHEMA_DDL_SQL] Complete PostgreSQL DDL string for initializing and repairing Supabase schema and RLS policies

## Invariants
- [page.tsx:endpointUrl] Requires non-empty endpoint URL before saving OmniRoute configuration
- [page.tsx:prevDbUrl] Synchronizes local DB URL and anon key state during render without cascading useEffect passes

## Side Effects
- [page.tsx:fetchOmniConfig] Issues GET request to /api/settings/keys to load masked API keys
- [page.tsx:handleSaveOmni] Issues POST request to /api/settings/keys to persist OmniRoute gateway endpoint and key
- [page.tsx:handleTestOmni] Issues POST request to /api/settings/keys/check to measure gateway latency and enumerate models
- [page.tsx:handleSaveExternalKey] Issues POST request to /api/settings/keys to save individual provider keys (fal, pexels, etc.)
- [page.tsx:handleToggleVoicePreview] Issues POST request to /api/tts/preview and plays synthesized audio via HTMLAudioElement
- [page.tsx:handleSaveBrandKit] Issues POST request to /api/settings/brand-kit with subtitle presets and watermark settings
- [page.tsx:handleAddWorkspace] Issues POST request to /api/workspaces to persist new workspace definitions
- [page.tsx:handleSaveDbConnection] Invokes context setCustomConfig to switch Supabase endpoints at runtime

## Verification
- Run: `pnpm test`
