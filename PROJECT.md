# Project: Clipped Application — Settings Page OmniRoute Refactoring

## Architecture
Refactoring the Clipped application Settings and AI/voice infrastructure to exclusively support a unified OmniRoute/OpenRouter gateway, deprecating all individual AI provider panels, storage keys, and hardcoded credentials.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT LAYER                                        │
│  - Settings Page (app/(app)/settings/page.tsx): Single OmniRoute Configuration Panel    │
│    * Endpoint URL input (with default http://localhost:20128/v1 and presets)           │
│    * API Key input (with visibility toggle)                                            │
│    * Save Configuration & Test Connection buttons (with latency & model feedback)      │
│    * Removed: Azure, OpenAI, ElevenLabs, Gemini, Grok, Groq, custom provider modal     │
│  - Retained: Supabase Database Panel, Brand Kits, Workspaces, Analytics                │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                                 API & STORAGE LAYER                                    │
│  - Backend Settings Keys Route (app/api/settings/keys/route.ts):                       │
│    * GET: Returns exclusively OmniRoute credentials (endpointUrl, maskedApiKey)       │
│           Strictly 0 legacy provider keys returned                                     │
│    * POST: Accepts, validates (HTTP/HTTPS), and stores OmniRoute credentials           │
│            Rejects legacy provider submissions with 400 Bad Request                    │
│    * Zero references to OPENAI_API_KEY or PROVIDER_ENV_MAP in settings storage logic   │
│  - Settings Connection Test Route (app/api/settings/keys/check/route.ts):              │
│    * Directly tests OmniRoute GET /v1/models with latency & model enumeration          │
│  - Centralized Credential Resolver (lib/keys.ts):                                      │
│    * getOmniRouteConfig(): In-memory cached lookup from Supabase settings with env fallback│
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                                    ENGINE LAYER                                        │
│  - Unified LLM Engine (lib/engine/llm.ts & lib/ai/llm.ts):                             │
│    * Fetches OmniRoute credentials dynamically via getOmniRouteConfig()                │
│    * Dispatches chat completions to ${endpointUrl}/v1/chat/completions with Auth header│
│    * Exports complete() and safe parseJson()                                           │
│  - TTS Engine (lib/engine/tts.ts):                                                     │
│    * OmniRoute promoted to primary TTS provider calling ${endpointUrl}/v1/audio/speech │
│    * Removed mandatory OPENAI_API_KEY / AZURE_SPEECH_KEY constraints                   │
│  - Engine Orchestrators (auto-pilot, drama, bulk-planner, scene-matcher, etc.):         │
│    * Consolidated to use unified LLM engine without ad-hoc OPENAI_API_KEY checks       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | OmniRoute Credential Resolver | `lib/keys.ts::getOmniRouteConfig()` with Supabase settings query & env fallback | M1 | R2, R3 |
| 2 | Backend Keys GET Endpoint | `app/api/settings/keys/route.ts` returning ONLY OmniRoute credentials | M1 | R2, AC |
| 3 | Backend Keys POST Endpoint | `app/api/settings/keys/route.ts` validating & saving OmniRoute credentials | M1 | R2, AC |
| 4 | Legacy Key Storage Elimination | Complete removal of `OPENAI_API_KEY` & `PROVIDER_ENV_MAP` in storage logic | M1 | R2, AC |
| 5 | OmniRoute Connection Probe | `app/api/settings/keys/check/route.ts` testing `${endpointUrl}/v1/models` | M1 | R1, R2 |
| 6 | Unified Engine LLM Facade | `lib/engine/llm.ts` & `lib/ai/llm.ts` calling OmniRoute with Auth header | M2 | R3 |
| 7 | OmniRoute TTS Integration | `lib/engine/tts.ts` promoting OmniRoute to primary speech synthesis | M2 | R3 |
| 8 | Engine Deprecated Key Cleanup | Remove `OPENAI_API_KEY` requirements from orchestrators & callers | M2 | R3 |
| 9 | Settings Page OmniRoute Panel | Single OmniRoute configuration panel in `app/(app)/settings/page.tsx` | M3 | R1, AC |
| 10 | Individual Provider Removal | Complete removal of Azure, OpenAI, ElevenLabs, Gemini panels & modals | M3 | R1, AC |
| 11 | Settings UI Render Integrity | Zero crash, full Shadcn UI compliance, visual feedback | M3 | AC |
| 12 | Programmatic Backend Tests | Automated test suite for GET, POST, validation, and legacy key absence | M4 | AC |
| 13 | E2E System Verification | Full verification across UI render, backend storage, and engine pipeline | M4 | AC |
| 14 | Forensic Integrity Audit | Independent binary integrity audit verifying genuine implementation | M4 | Audit |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Backend Storage & API Keys Route | Refactor `lib/keys.ts`, `app/api/settings/keys/route.ts`, and `check/route.ts` to exclusively support OmniRoute | none | DONE |
| 2 | Engine Integration Updates | Create `lib/engine/llm.ts`, update `lib/ai/llm.ts`, `lib/engine/tts.ts`, and clean up engine caller key dependencies | M1 | IN_PROGRESS |
| 3 | Settings UI Overhaul | Refactor `app/(app)/settings/page.tsx` to remove all individual provider panels and add single OmniRoute panel | M1 | IN_PROGRESS |
| 4 | E2E Verification & Forensic Audit | Comprehensive test execution, acceptance criteria validation, and forensic integrity audit | M1, M2, M3 | PLANNED |

## Interface Contracts

### 1. OmniRoute Credential Resolver (`lib/keys.ts`)
```ts
export interface OmniRouteConfig {
  baseUrl: string; // e.g. "http://localhost:20128" or "https://openrouter.ai/api"
  apiKey: string;  // e.g. "sk-..."
  isConfigured: boolean;
  source: 'database' | 'environment' | 'default';
}

export async function getOmniRouteConfig(): Promise<OmniRouteConfig>;
```

### 2. Backend Settings API (`app/api/settings/keys/route.ts`)
- **`GET /api/settings/keys`**:
  - Response:
    ```json
    {
      "omniroute": {
        "endpointUrl": "http://localhost:20128/v1",
        "maskedApiKey": "sk-••••••••1234",
        "isConfigured": true,
        "source": "database"
      },
      "keys": {
        "omniroute": {
          "endpointUrl": "http://localhost:20128/v1",
          "maskedApiKey": "sk-••••••••1234",
          "isConfigured": true
        }
      }
    }
    ```
  - Strictly **no** legacy keys: `openai`, `azure_speech`, `elevenlabs`, `gemini`, etc.
- **`POST /api/settings/keys`**:
  - Request: `{ endpointUrl: string, apiKey: string }` or `{ provider: "omniroute", endpointUrl: string, apiKey: string }`
  - Validation: `endpointUrl` must be a valid `http://` or `https://` URL.
  - Rejection: Requests specifying legacy providers (e.g. `provider: "openai"`) return HTTP 400.
  - Response: `{ success: true, omniroute: { isConfigured: true } }`

### 3. OmniRoute Connection Check API (`app/api/settings/keys/check/route.ts`)
- **`POST /api/settings/keys/check`**:
  - Request: `{ endpointUrl?: string, apiKey?: string }`
  - Response: `{ success: boolean, latencyMs: number, models?: string[], error?: string }`

### 4. Engine LLM & TTS Integration
- **`lib/engine/llm.ts`**:
  - `complete(request: { system: string; user: string; maxTokens?: number; json?: boolean }, model?: string): Promise<string>`
  - Uses `getOmniRouteConfig()`, sends `POST ${baseUrl}/v1/chat/completions` with `Authorization: Bearer ${apiKey}`.
  - `parseJson<T>(content: string, fallback: T): T`
- **`lib/engine/tts.ts`**:
  - Provider `'omniroute'` sends `POST ${baseUrl}/v1/audio/speech` with `Authorization: Bearer ${apiKey}`.

## Code Layout
- `lib/keys.ts` — Centralized API key and OmniRoute credential resolver
- `app/api/settings/keys/route.ts` — Settings keys GET and POST handlers
- `app/api/settings/keys/check/route.ts` — OmniRoute health check / model probe
- `lib/engine/llm.ts` — Unified LLM engine facade
- `lib/ai/llm.ts` — Core LLM completion implementation
- `lib/engine/tts.ts` — Text-to-speech engine with primary OmniRoute provider
- `app/(app)/settings/page.tsx` — Settings page with single OmniRoute panel
- `tests/e2e/omniroute-verification.ts` — Automated verification runner for acceptance criteria
