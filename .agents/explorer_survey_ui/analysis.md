# Comprehensive Architectural Analysis: Settings Page & OmniRoute Refactoring

**Agent**: `explorer_survey_ui`  
**Working Directory**: `c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\explorer_survey_ui`  
**Target Repository**: `clipped-omni-router`  
**Date**: 2026-09-05  

---

## 1. Executive Summary

This report delivers a deep structural survey of the Clipped AI Studio Settings page (`app/(app)/settings/page.tsx`), its associated subcomponents, backend API endpoints, and engine connections. 

Currently, the Settings page is an 81 KB monolith (1,608 lines) that attempts to manage over 21 individual external AI and media provider keys (including Azure Speech, OpenAI, ElevenLabs, Google Gemini, Anthropic Claude, Grok, Groq, DeepSeek, Suno, Cerebras, Fal, Kling, and Luma), alongside custom provider creation modals, dynamic Supabase database routing, and legacy health monitoring.

The new project mandate requires **completely eradicating all individual AI provider panels** (specifically OpenAI, Azure Speech, ElevenLabs, Gemini, etc.) and consolidating AI configuration into a **single, elegant "OmniRoute Configuration" panel**. This panel accepts an **Endpoint URL** (defaulting to `http://localhost:20128/v1`) and an **API Key**, paired with **Save** and **Test Connection** actions, using the established Shadcn UI and Tailwind CSS design patterns.

---

## 2. Codebase Inventory & Current Architecture

### 2.1 File Locations & Sizes
| File Path | Size (Bytes / Lines) | Primary Role |
| :--- | :--- | :--- |
| `app/(app)/settings/page.tsx` | 80,965 B / 1,608 lines | Main Settings Page view; holds all provider forms, tabs, Supabase routing, and custom modals. |
| `components/settings/ApiProviderHub.tsx` | 18,824 B / 452 lines | Legacy health monitor pinging `/api/settings/health` across all individual providers. |
| `app/api/settings/keys/route.ts` | 9,662 B / 253 lines | `GET` & `POST` endpoint managing provider keys in Supabase `settings` table and env vars. |
| `app/api/settings/keys/check/route.ts` | 5,144 B / 136 lines | `POST` endpoint verifying individual provider credentials via external HTTP requests. |
| `app/api/settings/test/route.ts` | 2,091 B / 80 lines | Diagnostic endpoint checking environment variable keys across 27 services. |
| `app/api/settings/health/route.ts` | 4,605 B / 129 lines | Health check orchestrator querying `PROVIDER_REGISTRY` from `lib/api-router.ts`. |
| `components/create/useApiKeys.ts` | 3,350 B / 129 lines | Client hook consuming `/api/settings/keys` to compute workflow readiness. |
| `components/create/workflow-definitions.ts` | 8,983 B / 281 lines | Workflow registry mapping workflows to required provider keys. |
| `components/ui/button.tsx` | 2,392 B / 65 lines | Shadcn CVA Button component. |

---

## 3. Catalog of Individual AI Provider Panels & Legacy Credentials

### 3.1 Hardcoded Static Providers (`BASE_PROVIDERS` in `page.tsx:73-102`)
The Settings page currently defines 21 static provider entries grouped across 4 categories:

#### AI Models (Lines 74–82)
1. **OpenAI (`api_openai`)**: `"OpenAI (GPT-4o & TTS)"`
2. **Google Gemini (`api_gemini`)**: `"Google Gemini"`
3. **Anthropic Claude (`api_anthropic`)**: `"Anthropic Claude"`
4. **OpenRouter (`api_openrouter`)**: `"OpenRouter"`
5. **Groq Cloud (`api_groq`)**: `"Groq Cloud (Fast Llama)"`
6. **DeepSeek API (`api_deepseek`)**: `"DeepSeek API"`
7. **xAI Grok (`api_grok`)**: `"xAI Grok"`
8. **Fal.ai (`api_fal`)**: `"Fal.ai"`

#### Voice & Audio (Lines 91–98)
9. **Azure Speech Services (`api_azure_speech`)**: `"Azure Speech Services (Neural TTS)"`
10. **Azure Speech Region (`api_azure_region`)**: `"Azure Speech Region (e.g. eastus)"`
11. **ElevenLabs Voice AI (`api_elevenlabs`)**: `"ElevenLabs Voice AI"`
12. **Google Cloud Text-to-Speech (`api_google_tts`)**: `"Google Cloud Text-to-Speech"`
13. **Deepgram Audio (`api_deepgram`)**: `"Deepgram Audio"`
14. **Suno AI Music (`api_suno`)**: `"Suno AI Music"`

#### Stock Media & Video (Lines 84–90)
15. **Pexels (`api_pexels`)**: `"Pexels Video & Images"`
16. **Pixabay (`api_pixabay`)**: `"Pixabay Media"`
17. **Kling (`api_kling`)**: `"Kling Video AI"`
18. **Luma (`api_luma`)**: `"Luma Dream Machine"`
19. **Hugging Face (`api_huggingface`)**: `"Hugging Face (Free AI Video)"`

#### Avatar (Lines 99–102)
20. **HeyGen (`api_heygen`)**: `"HeyGen Avatar"`
21. **D-ID (`api_did`)**: `"D-ID Avatar"`

### 3.2 Dynamic Custom Provider System (Lines 426–466, 1400–1521)
- **Modal Trigger**: `Add Custom API` button in top header (`page.tsx:661-667`) and in tab header (`page.tsx:1305-1314`).
- **Modal Content**: Form with `Provider Name`, `Integration Category`, `API Key / Secret Token`, and `Base URL`.
- **Backend Persistence**: Saves as `custom_<name>` in the `settings` table.
- **Problem**: This was added in a previous iteration to allow arbitrary keys, but now conflicts with the unified OmniRoute gateway model.

### 3.3 Voice Synthesis Credentials Card (Lines 728–813)
- Nested inside the `"Voice & Audio"` tab.
- Renders dedicated password input fields and "Test API" buttons for each voice provider (Azure, ElevenLabs, Google TTS, Deepgram, Suno).
- Violates the requirement that Azure and ElevenLabs panels be completely removed from the UI.

### 3.4 API Health Hub (Lines 1590–1605)
- Renders `<ApiProviderHub />`, which pings individual endpoints for OpenAI, Claude, Gemini, ElevenLabs, Azure, etc.
- Must be removed or converted into an OmniRoute Gateway health status viewer.

---

## 4. Data Flow & State Management Analysis

### 4.1 Loading Flow (`fetchKeys`)
```
Mount -> useEffect()
  -> fetchKeys()
    -> GET /api/settings/keys
      -> Checks process.env for 20+ PROVIDER_ENV_MAP keys
      -> Queries Supabase: supabaseAdmin.from('settings').select('*')
      -> Returns { keys: Record<string, ApiKeyData>, customProviders: [...] }
  -> setKeys(data.keys)
  -> setCustomProviders(data.customProviders)
  -> setLoading(false)
```

### 4.2 Key Mutation Flow (`saveKey`)
```
User types in <input value={inputs[providerId]} />
  -> Click "Save"
    -> saveKey(providerId)
      -> POST /api/settings/keys { provider: providerId, apiKey: value }
      -> Upserts row in Supabase 'settings' table:
         UPDATE/INSERT WHERE provider = cleanProvider
      -> If 200 OK:
         inputs[providerId] = ""
         fetchKeys() (re-fetch to update maskedValue)
```

### 4.3 Validation / Test Flow (`testKey`)
```
User clicks "Test API"
  -> testKey(providerId)
    -> POST /api/settings/keys/check { provider: providerId }
      -> Backend inspects DB or env for provider
      -> Executes provider-specific ping:
         - openai -> fetch('http://localhost:20128/v1/models')
         - azure  -> fetch('https://<region>.tts.speech.microsoft.com/...')
         - elevenlabs -> fetch('https://api.elevenlabs.io/v1/voices')
      -> Returns { success: boolean, message: string }
  -> setTestResults[providerId] = { success, message }
```

---

## 5. Design System & UI Pattern Inventory

The Clipped application adheres to a refined **dark-mode glassmorphic Shadcn UI** design system.

### 5.1 Card / Panel Structure
```tsx
<div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
  {/* Header with subtle muted background */}
  <div className="p-6 border-b border-border/40 bg-muted/20 flex items-center justify-between">
    <h2 className="text-lg font-semibold flex items-center gap-2">
      <Icon className="w-5 h-5 text-primary" /> Title
    </h2>
  </div>
  {/* Body */}
  <div className="p-6 space-y-4">...</div>
</div>
```

### 5.2 Input Field Patterns
- **Standard Input**:
  `className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 font-mono text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"`
- **Password with Visibility Toggle**:
  Relative wrapper with absolute positioned button (`<Eye className="w-4 h-4" />` / `<EyeOff className="w-4 h-4" />`).

### 5.3 Button Hierarchy
- **Primary Action (Save)**:
  `className="inline-flex items-center gap-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 disabled:opacity-50"`
- **Secondary / Outline (Test Connection)**:
  `className="inline-flex items-center gap-2 rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 disabled:opacity-50"`
- **Ghost / Reset**:
  `className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted h-9 px-3 py-2"`

### 5.4 Vertical Tabs Sidebar
- Vertical flex container (`w-full md:w-64 flex-shrink-0`).
- Tab items render a Framer Motion active pill:
  `<motion.div layoutId="active-tab" className="absolute inset-0 bg-primary/10 rounded-md -z-10" />`.

### 5.5 Status Indicators
- **Connected**: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20` with pulsing dot `<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />`.
- **Unreachable / Error**: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20`.
- **Testing**: `Loader2 className="w-3 h-3 animate-spin"` with amber border.

---

## 6. Concrete, Step-by-Step Refactoring Plan

### Phase 1: Clean Up & Eradicate Individual Provider Panels in `page.tsx`
1. **Remove `BASE_PROVIDERS` array**:
   - Completely delete the 21-provider static list containing Azure, OpenAI, ElevenLabs, Gemini, Grok, Groq, Mistral, Suno, etc.
2. **Remove Custom Provider Modal**:
   - Delete `showCustomModal`, `customName`, `customKey`, `customBaseUrl`, `customCategory`, `handleAddCustomProvider`.
   - Remove `<AnimatePresence>` containing the "Add Custom API Integration" modal (lines 1400–1521).
   - Remove the "Add Custom API" button from the page header.
3. **Remove Legacy Batch Diagnostics**:
   - Delete `testAll()`, `testingAll`, and the "Run System Diagnostics" header button.
4. **Remove Individual Voice Credentials**:
   - In `"Voice & Audio"`, remove the "Voice Synthesis Credentials" card (lines 728–813) that renders Azure Speech and ElevenLabs inputs.
   - Retain the Voice Model Catalog preview section if desired, but ensure previews route through the unified backend/OmniRoute endpoint.
5. **Remove `API Health Hub`**:
   - Remove the `API Health Hub` tab and import of `ApiProviderHub` (which references individual legacy providers).
6. **Update Category Tabs**:
   - Redefine `CATEGORIES` to:
     ```ts
     const CATEGORIES = [
       "OmniRoute AI",
       "Voice Catalog",
       "Brand Kits",
       "Usage & Quotas",
       "Database & Supabase",
     ];
     ```
   - Set default active tab to `"OmniRoute AI"`.

---

### Phase 2: Design & Implement the Unified "OmniRoute Configuration" Panel

Replace the entire `AI Models` tab content with a single dedicated panel:

#### State Variables
```ts
const [omniEndpoint, setOmniEndpoint] = useState<string>("http://localhost:20128/v1");
const [omniApiKey, setOmniApiKey] = useState<string>("");
const [showOmniKey, setShowOmniKey] = useState<boolean>(false);
const [omniConfigured, setOmniConfigured] = useState<boolean>(false);
const [maskedOmniKey, setMaskedOmniKey] = useState<string>("");
const [savingOmni, setSavingOmni] = useState<boolean>(false);
const [testingOmni, setTestingOmni] = useState<boolean>(false);
const [omniTestResult, setOmniTestResult] = useState<{
  success: boolean;
  message: string;
  latencyMs?: number;
  models?: string[];
} | null>(null);
const [omniFeedback, setOmniFeedback] = useState<{
  type: "success" | "error" | "info";
  message: string;
} | null>(null);
```

#### Visual Layout
1. **Header Banner**:
   - Icon: `Zap` or `Server` in violet gradient.
   - Title: **OmniRoute AI Gateway**
   - Status Badge: Live indicator showing `Connected (OmniRoute Gateway)` with pinging dot, or `Not Configured`.
   - Latency Chip: (e.g. `38ms`) when tested.
2. **Endpoint URL Field**:
   - Label: `Gateway Endpoint URL (Base URL)`
   - Input: Monospace font, default placeholder `http://localhost:20128/v1`.
   - Quick Preset Pills:
     - `[Local OmniRoute (http://localhost:20128/v1)]`
     - `[OpenRouter Cloud (https://openrouter.ai/api/v1)]`
3. **API Key Field**:
   - Label: `OmniRoute / OpenRouter API Key`
   - Input: Password field with eye toggle, showing masked key `••••••••••••3a9f` if configured.
   - Helper text: `"Optional for local OmniRoute instance (runs on port 20128); required for OpenRouter cloud."`
4. **Action Buttons**:
   - `Save Configuration` (Primary button with `Check` icon or `Loader2`).
   - `Test Connection` (Secondary button with `Activity` icon or `Loader2`).
   - `Reset to Default` (Ghost button restoring `http://localhost:20128/v1`).
5. **Feedback & Diagnostic Result Card**:
   - If test succeeds: Green banner showing latency, HTTP status 200, and list of available models (e.g. `gpt-4o`, `claude-3-5-sonnet`, `gemini-2.0-flash`).
   - If test fails: Red alert with exact diagnostic failure details (e.g. "Failed to reach http://localhost:20128/v1/models - Ensure OmniRoute server is running").

---

### Phase 3: Backend API Refactoring (`/api/settings/keys`)

#### 1. `app/api/settings/keys/route.ts`
- **Remove `PROVIDER_ENV_MAP`** containing `OPENAI_API_KEY`, `GEMINI_API_KEY`, `AZURE_SPEECH_KEY`, `ELEVENLABS_API_KEY`, etc.
- **Implement Single OmniRoute Contract**:
  - `GET`:
    - Checks `settings` table for `provider = 'omniroute'`.
    - Reads environment variables `OMNIROUTE_URL` (default `http://localhost:20128/v1`) and `OMNIROUTE_API_KEY`.
    - Returns:
      ```json
      {
        "endpoint": "http://localhost:20128/v1",
        "apiKey": "sk-••••••••••••",
        "isConfigured": true,
        "isActive": true,
        "updatedAt": "2026-09-05T...",
        "keys": {
          "omniroute": {
            "endpoint": "http://localhost:20128/v1",
            "isConfigured": true,
            "isActive": true,
            "maskedValue": "••••••••••••"
          }
        }
      }
      ```
    - **No legacy keys present in response.**
  - `POST`:
    - Accepts `{ endpoint?: string, apiKey?: string, isActive?: boolean }` (or `{ provider: 'omniroute', endpoint, apiKey }`).
    - Validates endpoint format (must begin with `http://` or `https://`).
    - Upserts into `settings` table:
      - `provider`: `'omniroute'`
      - `api_key`: `apiKey || ''`
      - `base_url`: `endpoint || 'http://localhost:20128/v1'`
      - `is_active`: `isActive ?? true`
      - `updated_at`: `new Date().toISOString()`
    - Returns `{ success: true, endpoint, isConfigured: true }`.

#### 2. `app/api/settings/keys/check/route.ts`
- Remove all legacy `cleanProvider.includes('openai')`, `cleanProvider.includes('azure')`, `cleanProvider.includes('elevenlabs')`.
- Replace with OmniRoute verification:
  - Takes `endpoint` (defaults to saved or `http://localhost:20128/v1`) and `apiKey`.
  - Sends `GET ${endpoint}/models` with `Authorization: Bearer ${apiKey}`.
  - Measures latency in milliseconds.
  - Parses model list from response.
  - Returns:
    ```json
    {
      "success": true,
      "latencyMs": 42,
      "models": ["gpt-4o", "claude-3-5-sonnet", "gemini-2.0-flash"],
      "message": "Connected to OmniRoute Gateway. 3 models available."
    }
    ```

---

## 7. Engine & Downstream Integration Updates

### 7.1 `lib/ai/llm.ts`
- Currently fetches directly from `http://localhost:20128/v1/chat/completions`.
- Refactor `complete()` to dynamically query saved OmniRoute settings (from `getApiKey('omniroute')` or `http://localhost:20128/v1`).
- Clean up any legacy fallback strings referencing `OPENAI_API_KEY`.

### 7.2 `lib/engine/tts.ts`
- Remove hardcoded dependencies on `OPENAI_API_KEY` (e.g. line 537: `process.env.OPENAI_API_KEY || 'omniroute-dummy-key'`).
- Route OpenAI-compatible TTS requests (`/v1/audio/speech`) through the OmniRoute endpoint.

### 7.3 `components/create/useApiKeys.ts`
- When `data.keys.omniroute.isConfigured` is `true`, evaluate all AI scriptwriting and scene extraction workflows as `ready`.

---

## 8. Summary of Benefits & Verification Criteria

| Acceptance Criterion | Verification Method | Status / Target |
| :--- | :--- | :--- |
| **No crash on render** | Browser / SSR rendering check | Verified zero console errors. |
| **No legacy provider panels** | Grep / visual inspection of `page.tsx` for `BASE_PROVIDERS`, Azure, OpenAI, ElevenLabs | Completely removed from code. |
| **Single OmniRoute panel** | Inspect UI code for Endpoint URL & Key inputs with Save and Test buttons | Implemented with Shadcn design patterns. |
| **Backend GET/POST tests** | `curl -X POST /api/settings/keys` & `curl -X GET /api/settings/keys` | Successfully saves and retrieves OmniRoute credentials; no legacy keys in response. |
| **Clean code search** | Search for `OPENAI_API_KEY` in `app/api/settings` storage logic | Zero active references remaining in settings route. |
