# engine

## Overview
Core video orchestration, multi-provider LLM cascade, prompt engineering, shot planning, media resolution, and TTS synthesis engine.

## Interface
- [lib/engine/llm.ts:parseJson] export function parseJson<T>(content: string, fallback?: T): T
- [lib/engine/llm.ts:complete] export function complete(req: LLMCompletionRequest, provider?: string, model?: string): Promise<string>
- [lib/engine/llm.ts:resetProviderHealthCache] export function resetProviderHealthCache(): void
- [lib/engine/provider-health.ts:loadHealth] export function loadHealth(): Promise<Map<string, ProviderHealth>>
- [lib/engine/provider-health.ts:isProviderAvailable] export function isProviderAvailable(domain: HealthDomain, providerId: string): Promise<boolean>
- [lib/engine/provider-health.ts:recordProviderFailure] export function recordProviderFailure(domain: HealthDomain, providerId: string, error: string): Promise<void>
- [lib/engine/provider-health.ts:recordProviderSuccess] export function recordProviderSuccess(domain: HealthDomain, providerId: string): Promise<void>
- [lib/engine/ffprobe.ts:isFFprobeAvailable] export function isFFprobeAvailable(): boolean
- [lib/engine/ffprobe.ts:getAudioDuration] export function getAudioDuration(filePath: string): Promise<number>
- [lib/engine/ffprobe.ts:getVideoMetadata] export function getVideoMetadata(filePath: string): Promise<FFprobeVideoResult>
- [lib/engine/ffprobe.ts:buildZoompanFilter] export function buildZoompanFilter(move: CameraMove, durationFrames: number, fps: number, options?: { oversample?: number; width?: number; height?: number }): string
- [lib/engine/ffprobe.ts:isVideoFile] export function isVideoFile(filePath: string): Promise<boolean>
- [lib/engine/shot-planner.ts:normalizeCameraMove] export function normalizeCameraMove(raw: unknown, index?: number): CameraMove
- [lib/engine/shot-planner.ts:normalizeShotType] export function normalizeShotType(raw: unknown, index?: number): ShotType
- [lib/engine/shot-planner.ts:shotFromScene] export function shotFromScene(scene: ShotSceneInput, index?: number): { shotType: ShotType; cameraMove: CameraMove }
- [lib/engine/shot-planner.ts:CAMERA_MOVES] export const CAMERA_MOVES: readonly string[]
- [lib/engine/shot-planner.ts:SHOT_TYPES] export const SHOT_TYPES: readonly string[]
- [lib/engine/beat-media-resolver.ts:resolveBeatMedia] export function resolveBeatMedia(params: { beat: any; intent: 'video' | 'image'; aspectRatio: string; keys?: any }): Promise<ResolvedBeatMedia | null>
- [lib/engine/brand-kit.ts:getBrandKit] export function getBrandKit(userId: string | null): Promise<BrandKit | null>
- [lib/engine/stickman-orchestrator.ts:stickmanOrchestrator] export const stickmanOrchestrator: StickmanOrchestrator
- [lib/engine/mission-orchestrator.ts:missionOrchestrator] export const missionOrchestrator: MissionOrchestrator
- [lib/engine/podcast-orchestrator.ts:podcastOrchestrator] export const podcastOrchestrator: PodcastOrchestrator
- [lib/engine/reddit-orchestrator.ts:redditOrchestrator] export const redditOrchestrator: { generateVideo(req: RedditVideoRequest): Promise<any> }
- [lib/engine/trivia-orchestrator.ts:triviaOrchestrator] export const triviaOrchestrator: { generateVideo(req: TriviaVideoRequest): Promise<any> }
- [lib/engine/stories-orchestrator.ts:storiesOrchestrator] export const storiesOrchestrator: StoriesOrchestrator
- [lib/engine/bulk-planner.ts:bulkPlanner] export const bulkPlanner: BulkPlanner
- [lib/engine/drama-orchestrator.ts:dramaOrchestrator] export const dramaOrchestrator: DramaOrchestrator
- [lib/engine/shorts-extractor.ts:shortsExtractor] export const shortsExtractor: ShortsExtractor
- [lib/engine/auto-pilot.ts:autoPilot] export const autoPilot: AutoPilot
- [lib/engine/video-generator.ts:videoGenerator] export const videoGenerator: VideoGenerator
- [lib/engine/video-sourcer.ts:videoSourcer] export const videoSourcer: VideoSourcer
- [lib/engine/image-generator.ts:imageGenerator] export const imageGenerator: ImageGenerator
- [lib/engine/image-orchestrator.ts:imageOrchestrator] export const imageOrchestrator: { generateVideoPlan: Function }
- [lib/engine/image-sourcer.ts:imageSourcer] export const imageSourcer: ImageSourcer
- [lib/engine/orchestrator.ts:videoOrchestrator] export const videoOrchestrator: { generateVideoPlan: Function }
- [lib/engine/scene-matcher.ts:sceneMatcher] export const sceneMatcher: SceneMatcher
- [lib/engine/videoclaw.ts:huntForMedia] export function huntForMedia(query: string): Promise<string>
- [lib/engine/framewright.ts:enhanceFraming] export function enhanceFraming(basePrompt: string): Promise<string>
- [lib/engine/whiteboard-orchestrator.ts:whiteboardOrchestrator] export const whiteboardOrchestrator: WhiteboardOrchestrator
- [lib/engine/yaml-compiler.ts:compileYamlWorkflow] export function compileYamlWorkflow(yamlString: string): RenderParams
- [lib/engine/tts.ts:ttsEngine] export const ttsEngine: TTSEngine
- [lib/engine/tts.ts:TTSEngine] export class TTSEngine

## Invariants
- [lib/engine/ffprobe.ts:buildZoompanFilter] Camera moves must animate zoompan on output frame counter 'on', NEVER input frame counter 'in' to prevent frozen still renders.
- [lib/engine/ffprobe.ts:isVideoFile] Probes media bytes using ffprobe; falls back conservatively to still (return false) when uncertain to prevent 1-frame clip regressions.
- [lib/engine/shot-planner.ts:normalizeCameraMove] All shot planning functions are total and reject free-text LLM camera directions, strictly mapping onto closed vocabularies ('push-in', 'pull-out', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down', 'static').
- [lib/engine/llm.ts:complete] Three-tier resilient cascade: OmniRoute gateway -> stored provider keys -> Pollinations keyless fallback.
- [lib/engine/provider-health.ts:isProviderAvailable] Checks circuit breaker failure thresholds and cooldown windows before routing requests to provider.
- [lib/engine/yaml-compiler.ts:compileYamlWorkflow] Normalizes both 'beats' and 'scenes' YAML nodes into valid RenderBeat[] entries with default durations.

## Side Effects
- [lib/engine/ffprobe.ts:execSync] Executes system ffprobe child processes.
- [lib/engine/provider-health.ts:recordProviderFailure] Mutates provider_health table in Supabase via RPC.
- [lib/engine/tts.ts:synthesize] Outbound network requests to Azure Speech, ElevenLabs, OpenAI, or Google Cloud TTS, or writes synthetic WAV PCM buffers.
- [lib/engine/mission-orchestrator.ts:createJob] Inserts and updates render_jobs records in Supabase.

## Verification
- Run: `pnpm test`
