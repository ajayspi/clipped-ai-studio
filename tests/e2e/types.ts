/**
 * Clipped E2E Test Suite - Core Types and Interfaces
 * Requirement-driven contracts based on PROJECT.md and ORIGINAL_REQUEST.md
 */

export interface Video {
  id: string;
  url: string;
  title: string;
  platform: 'pixabay' | 'pexels' | 'unsplash' | 'coverr' | 'mixkit' | 'videvo' | 'openverse';
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface Scene {
  id: string;
  text: string;
  keywords: string[];
  description: string;
  duration: number;
  emotion?: string;
  selectedVideo?: Video;
}

// 1. AI Video Generator Types
export interface AIVideoGenerationRequest {
  script: string;
  model?: 'kling-v1' | 'luma-dream' | 'fal-flux';
  aspectRatio?: '16:9' | '9:16' | '1:1';
  duration?: number;
  cameraMotion?: string;
  negativePrompt?: string;
  voice?: string;
  mock?: boolean;
}

export interface AIVideoGenerationResponse {
  success: boolean;
  jobId: string;
  videoUrl: string;
  prompt: string;
  modelUsed: string;
  duration: number;
  metadata: Record<string, any>;
}

// 2. Stories Orchestrator Types
export interface StorySeriesRequest {
  topic: string;
  storyType: string;
  partsCount: number;
  visualStyle: string;
  voice?: string;
  aspectRatio?: string;
  includeHooks?: boolean;
}

export interface StoryPart {
  partNumber: number;
  title: string;
  script: string;
  hook: string;
  cliffhanger: string;
  scenes: Scene[];
}

export interface StorySeriesResponse {
  success: boolean;
  seriesTitle: string;
  parts: StoryPart[];
  metadata: Record<string, any>;
}

// 3. Bulk Planner Types
export interface BulkPlanRequest {
  niche: string;
  contentCount: number;
  cadence: string;
  visualStyle: string;
  voice?: string;
  platforms: string[];
  aspectRatio?: string;
}

export interface BulkPlanItem {
  day: number;
  title: string;
  hook: string;
  script: string;
  status: string;
}

export interface BulkPlanResponse {
  success: boolean;
  planTitle: string;
  items: BulkPlanItem[];
  batchJobIds: string[];
}

// 4. Micro-Drama Types
export interface DramaCharacter {
  name: string;
  description: string;
  visualAnchor: string;
  voice?: string;
  avatarUrl?: string;
}

export interface DramaEpisode {
  episodeNumber: number;
  title: string;
  script: string;
  scenes: Scene[];
}

export interface DramaSeriesRequest {
  script?: string;
  genre: string;
  characters: DramaCharacter[];
  episodesCount: number;
  aspectRatio?: string;
}

export interface DramaSeriesResponse {
  success: boolean;
  dramaTitle: string;
  characters: DramaCharacter[];
  episodes: DramaEpisode[];
}

// 5. Shorts Extractor Types
export interface ShortsExtractionRequest {
  sourceType: 'url' | 'transcript' | 'file';
  videoUrl?: string;
  transcript?: string;
  clipCount?: number;
  strategy?: string;
  captionStyle?: string;
  aspectRatio?: string;
}

export interface ExtractedClip {
  clipId: string;
  title: string;
  hook: string;
  startTime: number;
  endTime: number;
  viralScore: number;
  reason: string;
}

export interface ShortsExtractionResponse {
  success: boolean;
  originalDuration: number;
  clips: ExtractedClip[];
}

// 6. Auto Pilot Types
export interface AutoPilotConfig {
  pipelineName: string;
  niche: string;
  schedule: string;
  sourceStrategy: string;
  visualPipeline: string;
  autoPublish: boolean;
  targetPlatforms: string[];
  voice?: string;
}

export interface AutoPilotResponse {
  success: boolean;
  pipelineId: string;
  nextRun: string;
  generatedJobId?: string;
  status: string;
}

// Test Runner Framework Types
export interface TestCase {
  id: string;
  tier: 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5' | 'tier6' | 'api';
  workflow:
    | 'ai-videos'
    | 'stories'
    | 'bulk-plan'
    | 'extract-shorts'
    | 'micro-drama'
    | 'auto'
    | 'cross-workflow'
    | 'tts'
    | 'publishing'
    | 'quotas'
    | 'audio-mixer'
    | 'integration';
  title: string;
  description: string;
  fn: () => Promise<void> | void;
}

export interface TestResult {
  id: string;
  tier: string;
  workflow: string;
  title: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export interface SuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestResult[];
}
