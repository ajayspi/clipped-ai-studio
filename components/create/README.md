# create

## Overview
Creation studio hub components including workflow catalog cards, filterable grid, mission prompt launcher, and API key management hooks.

## Interface
- [MissionPromptBar.tsx:MissionPromptBar] - One-click prompt input bar with suggestion chips to trigger autonomous video generation missions.
- [MissionPromptBar.tsx:SUGGESTIONS] - Static array of suggested topics for quick test generation.
- [useApiKeys.ts:useApiKeys] - Custom hook managing cached API provider keys, status checks, and workflow feasibility evaluation.
- [workflow-definitions.ts:WORKFLOWS] - Catalog of all 10 creation workflow definitions with styling, cost tier, and required providers.
- [workflow-definitions.ts:evaluateWorkflowStatus] - Pure function determining whether a workflow is 'ready', 'warning', or 'error'.
- [WorkflowGrid.tsx:WorkflowGrid] - Filterable and searchable grid component grouping workflows by category and health status.
- [WorkflowCard.tsx:WorkflowCard] - Interactive workflow card displaying title, description, cost tier, provider status tooltip, and settings link.

## Invariants
- [useApiKeys.ts:hydration] - Initial hook render initializes with empty keys or memory cache to prevent SSR/client hydration mismatches.
- [workflow-definitions.ts:isProviderConfigured] - Evaluates provider readiness against both explicit provider API keys and active OmniRoute gateway connectivity.

## Side Effects
- [useApiKeys.ts:fetchKeysFromApi] - Fetches credentials from /api/settings/keys and synchronizes with browser localStorage (clipped_api_keys_cache_v1).
- [MissionPromptBar.tsx:handleSubmit] - Dispatches POST request to /api/workflows/mission with prompt and generation parameters.

## Verification
- Run: `pnpm test`
