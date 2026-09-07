# TTS Voice and Render Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make voice selection reliable from UI to final MP4 by honoring the selected provider and voice, adding free-first TTS, persisting complete voice settings, and writing audio buffers to real files before FFmpeg rendering.

**Architecture:** Keep OmniRoute as an optional TTS provider, but introduce an explicit provider dispatcher whose requested provider is honored and whose fallback chain is deterministic. Store a serializable `VoiceSettings` object in workflow/render job payloads; the preview route and render worker consume the same object. TTS responses continue exposing `audioUrl` for browser previews, while the render worker uses `audioBuffer` directly and never downloads a data URL.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase settings/render_jobs, native `fetch`, FFmpeg via `fluent-ffmpeg`, `@ffmpeg-installer/ffmpeg`, Vitest, and the existing Zustand wizard store.

**Spec:** Validated in-chat design from the preceding brainstorming session and comparison with MoneyPrinterTurbo: free-first Edge/Azure-compatible TTS, explicit provider dispatch, voice preview/replay, speed/gender/language/pitch/volume controls, real audio files for FFmpeg, and fail-closed behavior when voiceover is requested but no audio is produced.

## Global Constraints

- The selected provider must be attempted first; fallback is allowed only after a recorded provider failure.
- OmniRoute remains optional for TTS and must work with a local gateway without requiring an API key when the gateway is configured to allow unauthenticated requests.
- Free TTS must not require a paid API key; document that keyless upstream services remain subject to their terms and availability.
- Raw API keys must never appear in client responses, logs, job payloads, or error messages.
- `audioBuffer` is the source of truth for rendering; `data:` URLs are browser-preview compatibility output only.
- Rendering must fail clearly when voiceover is enabled and every provider fails; silent output is allowed only when the user explicitly selects no voiceover.
- Preserve existing `TTSRequest`, `TTSResponse`, workflow payloads, and `VoiceSelector` compatibility through additive fields and adapters.
- All persisted voice settings must be JSON-serializable and validated at the API boundary.
- Do not install Python, SadTalker, or GPU dependencies in this project.

---

## File Structure

- Create `lib/engine/voice-settings.ts`: validated `VoiceSettings`, defaults, normalization, and provider/voice metadata.
- Modify `lib/engine/tts.ts`: explicit provider dispatch, free-first provider, pitch/volume support, and provider attempt reporting.
- Modify `app/api/tts/preview/route.ts`: validate and pass the complete voice settings object.
- Modify `components/wizard/VoiceStep.tsx`: add provider-aware voice controls, gender/language filters, replay, and settings state wiring.
- Modify `components/create/ui/VoiceSelector.tsx`: preserve selected voice while exposing the shared voice model where used.
- Modify `app/(app)/settings/page.tsx`: make the Voice Catalog settings functional and use the same preview contract.
- Modify `lib/engine/types.ts`: add additive `voiceSettings` fields to supported workflow/render payload types.
- Modify `app/api/workflows/mission/route.ts`: accept and persist validated voice settings in mission jobs.
- Modify `lib/engine/mission-orchestrator.ts`: pass voice settings into scene synthesis and render state.
- Modify `scripts/render-worker.ts`: read voice settings, call the selected provider, write `audioBuffer` to a temporary file, and fail clearly when required audio is missing.
- Modify `remotion/Composition.tsx`: retain audio-aware beat fields and avoid claiming audio exists when the render worker did not create it.
- Create `tests/tts/voice-settings.test.ts`: normalization and validation tests.
- Create `tests/tts/tts-dispatch.test.ts`: selected-provider dispatch and fallback tests.
- Create `tests/tts/preview-route.test.ts`: preview contract tests.
- Create `tests/tts/render-audio.test.ts`: audio-buffer-to-file and no-silent-render tests.
- Create `tests/tts/workflow-voice-settings.test.ts`: mission payload persistence tests.
- Modify `README.md`: document voice provider setup, free-first behavior, controls, and render requirements.
- Modify `.env.example`: document optional TTS variables and keyless default behavior.

## Interfaces

```ts
export type VoiceProvider =
  | 'omniroute'
  | 'azure'
  | 'openai'
  | 'elevenlabs'
  | 'google'
  | 'coqui'
  | 'keyless'
  | 'mock';

export type VoiceGender = 'male' | 'female' | 'neutral';

export interface VoiceSettings {
  provider: VoiceProvider | string;
  voiceId: string;
  language: string;
  gender: VoiceGender;
  speed: number;
  pitch: number;
  volumeGainDb: number;
  enabled: boolean;
}

export interface VoiceSettingsValidation {
  settings: VoiceSettings;
  errors: string[];
}
```

Defaults:

```ts
{
  provider: 'keyless',
  voiceId: 'free-en-us',
  language: 'en-US',
  gender: 'female',
  speed: 1,
  pitch: 0,
  volumeGainDb: 0,
  enabled: true
}
```

Fallback order when the selected provider is unavailable:

```text
selected provider -> keyless free TTS -> mock only in explicit test/mock mode
```

The provider dispatcher must not silently replace an explicitly selected provider with OmniRoute before attempting that provider.

---

### Task 1: Add Voice Settings Contract and Validation

**Files:**
- Create: `lib/engine/voice-settings.ts`
- Modify: `lib/engine/types.ts`
- Test: `tests/tts/voice-settings.test.ts`

**Interfaces:**
- Produces `VoiceSettings`, `VoiceSettingsValidation`, `DEFAULT_VOICE_SETTINGS`, and `normalizeVoiceSettings(input: unknown): VoiceSettingsValidation`.
- `normalizeVoiceSettings` clamps speed to `0.5..2.0`, pitch to `-20..20`, volume gain to `-20..20`, defaults missing strings, and returns an error for invalid provider/voice types or `enabled: true` with an empty voice ID.

- [ ] **Step 1: Write the failing tests**

```ts
import { DEFAULT_VOICE_SETTINGS, normalizeVoiceSettings } from '@/lib/engine/voice-settings';

test('normalizes complete voice settings without losing provider selection', () => {
  const result = normalizeVoiceSettings({
    provider: 'azure', voiceId: 'en-US-JennyNeural', language: 'en-US',
    gender: 'female', speed: 1.15, pitch: 2, volumeGainDb: -1, enabled: true,
  });
  expect(result.errors).toEqual([]);
  expect(result.settings).toMatchObject({ provider: 'azure', voiceId: 'en-US-JennyNeural', speed: 1.15 });
});

test('clamps unsafe numeric controls and applies defaults', () => {
  const result = normalizeVoiceSettings({ speed: 9, pitch: -99, volumeGainDb: 99 });
  expect(result.settings).toMatchObject({ ...DEFAULT_VOICE_SETTINGS, speed: 2, pitch: -20, volumeGainDb: 20 });
});

test('rejects enabled voiceover with no voice ID', () => {
  const result = normalizeVoiceSettings({ enabled: true, voiceId: '' });
  expect(result.errors).toContain('voiceId is required when voiceover is enabled');
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `pnpm.cmd exec vitest run tests/tts/voice-settings.test.ts`
Expected: FAIL because the shared settings module does not exist.

- [ ] **Step 3: Implement normalization and additive types**

Create the exact contract above. Add `voiceSettings?: VoiceSettings` to `MissionOptions`, render/job payload types, and any workflow request type that already carries voice configuration. Do not remove existing `voice` or `voiceSpeed` fields.

- [ ] **Step 4: Run the focused test and diagnostics**

Run: `pnpm.cmd exec vitest run tests/tts/voice-settings.test.ts`
Expected: PASS.

Run: `get_errors` for `lib/engine/voice-settings.ts` and `lib/engine/types.ts`.
Expected: no errors.

### Task 2: Make TTS Provider Dispatch Deterministic

**Files:**
- Modify: `lib/engine/tts.ts`
- Test: `tests/tts/tts-dispatch.test.ts`

**Interfaces:**
- Consumes `VoiceSettings` from Task 1.
- `TTSEngine.synthesize(request: TTSRequest)` honors `request.provider` and `request.voiceId`.
- Provider attempts are returned in `metadata.providerAttempts` with provider, status, error, and latency.

- [ ] **Step 1: Write failing dispatch tests**

```ts
test('selected Azure provider is attempted before fallback providers', async () => {
  mockAzureSuccess();
  const result = await new TTSEngine().synthesize({
    text: 'hello', provider: 'azure', voiceId: 'en-US-JennyNeural',
    language: 'en-US', gender: 'female', speed: 1.1,
  });
  expect(result.providerUsed).toBe('azure');
  expect(firstProviderAttempt(result)).toBe('azure');
});

test('local OmniRoute can be used without an API key', async () => {
  mockOmniRouteSuccess({ requireAuthorization: false });
  const result = await new TTSEngine().synthesize({
    text: 'hello', provider: 'omniroute', voiceId: 'alloy', language: 'en-US',
  });
  expect(result.providerUsed).toBe('omniroute');
});

test('provider failure falls back to keyless and records both attempts', async () => {
  mockAzureFailure(503);
  mockKeylessSuccess();
  const result = await new TTSEngine().synthesize({ text: 'hello', provider: 'azure', voiceId: 'en-US-JennyNeural' });
  expect(result.providerUsed).toBe('keyless');
  expect(result.metadata.providerAttempts.map((attempt) => attempt.provider)).toEqual(['azure', 'keyless']);
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `pnpm.cmd exec vitest run tests/tts/tts-dispatch.test.ts`
Expected: FAIL because current synthesis always starts with OmniRoute and keyless, ignoring the selected provider.

- [ ] **Step 3: Implement explicit dispatch**

Normalize `request.provider`. For `azure`, call the existing Azure method and pass `voiceId`, gender, speed, pitch, and volume. For `omniroute`, attempt the configured endpoint even when `apiKey` is empty; attach Authorization only when a key exists. For `keyless`, call the free implementation. For `auto`, use `omniroute -> azure -> keyless` based on available configuration. Preserve existing OpenAI, ElevenLabs, Google, and Coqui methods in the dispatcher.

Make the free provider output a real `audioBuffer`. Keep `audioUrl` as a data URL for preview compatibility. Do not log audio contents or credentials.

- [ ] **Step 4: Run focused tests and lint**

Run: `pnpm.cmd exec vitest run tests/tts/tts-dispatch.test.ts`
Expected: PASS.

Run: `& .\\node_modules\\.bin\\eslint.cmd lib/engine/tts.ts lib/engine/voice-settings.ts tests/tts/tts-dispatch.test.ts`
Expected: no output and exit code 0.

### Task 3: Add Functional Preview and Voice UI Controls

**Files:**
- Modify: `app/api/tts/preview/route.ts`
- Modify: `components/wizard/VoiceStep.tsx`
- Modify: `components/create/ui/VoiceSelector.tsx`
- Modify: `app/(app)/settings/page.tsx`
- Test: `tests/tts/preview-route.test.ts`

**Interfaces:**
- Preview API accepts `{ text, voiceSettings }` and continues accepting legacy `{ voiceId, provider, language, speed }` fields.
- Produces `{ success, audioUrl, duration, providerUsed, voiceId, metadata }` without raw credentials.

- [ ] **Step 1: Write failing preview contract tests**

```ts
test('preview forwards provider, voice, gender, speed, pitch, and volume', async () => {
  const response = await postPreview({
    text: 'Preview',
    voiceSettings: {
      provider: 'azure', voiceId: 'en-US-JennyNeural', language: 'en-US',
      gender: 'female', speed: 1.2, pitch: 3, volumeGainDb: -2, enabled: true,
    },
  });
  expect(response.status).toBe(200);
  expect(lastSynthesisRequest()).toMatchObject({ provider: 'azure', voiceId: 'en-US-JennyNeural', speed: 1.2, pitch: 3, volumeGainDb: -2 });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `pnpm.cmd exec vitest run tests/tts/preview-route.test.ts`
Expected: FAIL because the route currently accepts only flattened legacy fields.

- [ ] **Step 3: Implement the shared preview contract**

Normalize `body.voiceSettings` with `normalizeVoiceSettings`; map legacy fields into the same object; return HTTP 400 for invalid enabled settings. Use the same settings object for preview and final rendering.

- [ ] **Step 4: Implement UI controls**

In `VoiceStep`, keep the existing provider and voice cards, then add:

- gender filter: All, Female, Male, Neutral;
- language filter/select;
- speed slider from `0.5x` to `2.0x`;
- pitch slider from `-20` to `20`;
- volume slider from `-20 dB` to `+20 dB`;
- replay button using the existing audio ref;
- selected provider/voice status;
- explicit “Apply to all scenes” state.

Send one `voiceSettings` object to `/api/tts/preview`. Do not make gender a free-text value. Keep the current voice card play button and ensure clicking replay stops the previous audio first.

In the settings page, replace static catalog-only preview calls with the same preview payload and show provider health/error state. `VoiceSelector` remains backward compatible but should use the canonical selected `voiceId` value.

- [ ] **Step 5: Run focused tests, diagnostics, and lint**

Run: `pnpm.cmd exec vitest run tests/tts/preview-route.test.ts`
Expected: PASS.

Run: `get_errors` for the route and three UI files.
Expected: no errors.

Run: `& .\\node_modules\\.bin\\eslint.cmd app/api/tts/preview/route.ts components/wizard/VoiceStep.tsx components/create/ui/VoiceSelector.tsx 'app/(app)/settings/page.tsx'`
Expected: no output and exit code 0.

### Task 4: Persist Voice Settings Through Mission and Render Jobs

**Files:**
- Modify: `app/api/workflows/mission/route.ts`
- Modify: `lib/engine/mission-orchestrator.ts`
- Modify: `scripts/render-worker.ts`
- Modify: `lib/engine/types.ts`
- Test: `tests/tts/workflow-voice-settings.test.ts`

**Interfaces:**
- Mission POST accepts `voiceSettings?: VoiceSettings` and maps legacy `voice` plus `voiceSpeed` when supplied.
- `render_jobs.logs` contains `voiceSettings` and `voiceoverEnabled`.
- Render worker passes the exact settings to `TTSEngine.synthesize()` for each beat.

- [ ] **Step 1: Write failing persistence tests**

```ts
test('mission job preserves selected voice settings', async () => {
  const result = await postMission({
    prompt: 'A short science story',
    voiceSettings: {
      provider: 'azure', voiceId: 'en-US-GuyNeural', language: 'en-US',
      gender: 'male', speed: 0.9, pitch: -1, volumeGainDb: 1, enabled: true,
    },
  });
  expect(result.status).toBe(200);
  const job = await getCreatedMissionJob();
  expect(job.voiceSettings).toMatchObject({ provider: 'azure', voiceId: 'en-US-GuyNeural', speed: 0.9 });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `pnpm.cmd exec vitest run tests/tts/workflow-voice-settings.test.ts`
Expected: FAIL because mission currently stores only `voice` and the render worker reconstructs provider selection from environment variables.

- [ ] **Step 3: Implement mission persistence**

Normalize voice settings in the POST route. Store them in the initial mission state and Supabase `logs`. Return them from GET under `data.voiceSettings`. Use `voiceSettings.voiceId` as the compatibility value for `data.voice` when present.

Pass the settings to `synthesizeAudioForScenes` and preserve them when creating any downstream render job.

- [ ] **Step 4: Implement render-worker settings consumption**

Read `params.voiceSettings`, normalize it, and call `ttsEngine.synthesize()` with its provider, voice ID, language, gender, speed, pitch, volume gain, and enabled flag. Do not choose ElevenLabs or Google merely because an environment key exists. If `enabled` is false, skip TTS intentionally and mark the beat as voiceover-disabled.

- [ ] **Step 5: Run focused tests and diagnostics**

Run: `pnpm.cmd exec vitest run tests/tts/workflow-voice-settings.test.ts`
Expected: PASS.

Run: `get_errors` for the mission route, orchestrator, render worker, and types.
Expected: no errors.

### Task 5: Write Audio Buffers to Files and Prevent Silent Renders

**Files:**
- Modify: `scripts/render-worker.ts`
- Modify: `lib/engine/tts.ts`
- Modify: `remotion/Composition.tsx`
- Test: `tests/tts/render-audio.test.ts`

**Interfaces:**
- Produces `writeAudioBuffer(buffer: Buffer, destination: string): Promise<void>` in the render-worker testable helper or extracted `lib/engine/render-audio.ts` module.
- A required voiceover render either creates one audio file per beat or fails the render job with a clear error.

- [ ] **Step 1: Write failing audio-file tests**

```ts
test('writes TTS audioBuffer directly instead of downloading audioUrl', async () => {
  const destination = await renderOneBeat({
    audioBuffer: Buffer.from('valid-audio-bytes'),
    audioUrl: 'data:audio/mp3;base64,not-used',
    voiceoverEnabled: true,
  });
  expect(await fs.promises.readFile(destination)).toEqual(Buffer.from('valid-audio-bytes'));
});

test('fails required voiceover render when TTS returns no audio', async () => {
  await expect(renderOneBeat({ audioBuffer: Buffer.alloc(0), audioUrl: '', voiceoverEnabled: true }))
    .rejects.toThrow('Voiceover audio was not generated');
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pnpm.cmd exec vitest run tests/tts/render-audio.test.ts`
Expected: FAIL because the worker currently downloads `audioUrl` and catches TTS failure without failing required voiceover.

- [ ] **Step 3: Implement direct buffer persistence**

Write `ttsRes.audioBuffer` to `audio_<index>.<format>` with `fs.writeFile`. Validate that the buffer is non-empty and that the MIME/format maps to `mp3`, `wav`, or `ogg`. Pass the local path to FFmpeg. Remove the data URL download path for TTS audio; retain URL downloading only for remote images/videos.

When voiceover is enabled and TTS fails or returns an empty buffer, throw `Voiceover audio was not generated for beat <n>: <provider error>`. The job must be marked failed. When voiceover is disabled, render without audio and record that choice.

Ensure FFmpeg receives `-shortest` only when an audio input exists, and preserve audio codec/output settings for MP4.

- [ ] **Step 4: Keep Remotion audio contract honest**

Add an explicit `voiceoverEnabled`/audio state to the composition beat input if needed. Do not render a fake audio URL as though it were a playable file. Keep existing subtitle behavior and beat timing.

- [ ] **Step 5: Run focused tests and a render-worker smoke check**

Run: `pnpm.cmd exec vitest run tests/tts/render-audio.test.ts`
Expected: PASS.

Run: `node scripts/render-worker.ts` with a test job fixture or the repository’s existing render-worker test harness.
Expected: the worker starts, processes a fixture, and writes a non-empty MP4 with an audio stream when voiceover is enabled.

Run: `& .\\node_modules\\.bin\\eslint.cmd scripts/render-worker.ts lib/engine/tts.ts remotion/Composition.tsx tests/tts/render-audio.test.ts`
Expected: no output and exit code 0.

### Task 6: Document and Verify End-to-End Voice Behavior

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Test: `tests/tts/voice-e2e-contract.test.ts`

**Interfaces:**
- Documents free-first provider behavior, voice controls, environment variables, and intentional no-voiceover mode.
- Provides a deterministic mocked end-to-end contract from preview settings through render payload.

- [ ] **Step 1: Write the failing end-to-end contract test**

```ts
test('preview and render consume the same voice settings', async () => {
  const settings = {
    provider: 'keyless', voiceId: 'free-en-us', language: 'en-US',
    gender: 'female', speed: 1.05, pitch: 0, volumeGainDb: 0, enabled: true,
  };
  const preview = await runPreviewWithMocks(settings);
  const render = await runRenderWithMocks({ voiceSettings: settings, script: 'Hello world' });
  expect(preview.voiceId).toBe(render.voiceId);
  expect(render.audioBytes).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `pnpm.cmd exec vitest run tests/tts/voice-e2e-contract.test.ts`
Expected: FAIL until preview and render share the canonical settings contract.

- [ ] **Step 3: Add setup documentation**

Document:

```env
OMNIROUTE_URL=http://localhost:20128
OMNIROUTE_API_KEY=
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=
ELEVENLABS_API_KEY=
GOOGLE_TTS_API_KEY=
```

Explain that keyless TTS is the default free fallback, OmniRoute can be local and unauthenticated, optional cloud providers require their own keys, and generated audio is written to temporary files before FFmpeg rendering.

Document the UI controls: provider, voice, gender, language, speed, pitch, volume, preview, replay, and no-voiceover mode.

- [ ] **Step 4: Run the complete TTS validation**

Run: `pnpm.cmd exec vitest run tests/tts`
Expected: all TTS tests pass.

Run: `pnpm.cmd exec tsc --noEmit`
Expected: no TypeScript errors.

Run: `& .\\node_modules\\.bin\\eslint.cmd lib/engine/voice-settings.ts lib/engine/tts.ts app/api/tts/preview/route.ts components/wizard/VoiceStep.tsx scripts/render-worker.ts remotion/Composition.tsx`
Expected: no output and exit code 0.

---

## Verification Checklist

- [ ] Selecting Azure in the UI actually calls Azure first.
- [ ] Selecting OmniRoute uses a local unauthenticated gateway when configured that way.
- [ ] Keyless TTS produces a non-empty audio buffer.
- [ ] Preview and final render use the same provider, voice, language, gender, speed, pitch, and volume.
- [ ] Voice settings survive mission creation and render-job persistence.
- [ ] The render worker writes `audioBuffer` directly to disk.
- [ ] A required voiceover failure marks the job failed instead of producing a silent MP4.
- [ ] Explicit no-voiceover mode still renders successfully without audio.
- [ ] Voice preview supports pause, replay, and provider errors.
- [ ] No raw credentials appear in API output, persisted job logs, or console output.
- [ ] No Python, SadTalker, GPU, or unrelated image/video provider work is included in this sub-project.
