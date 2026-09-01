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
  cameraMotion?: string;
  visualPrompt?: string;
  selectedVideo?: Video;
  imageUrl?: string;
  videoUrl?: string;
}

export interface ScriptAnalysis {
  script: string;
  scenes: Scene[];
  totalDuration: number;
  title?: string;
  summary?: string;
}

export interface VideoMatch {
  video: Video;
  score: number;
  reason: string;
}

export interface GenerationRequest {
  script: string;
  character?: string;
  platforms?: string[];
  style?: 'professional' | 'casual' | 'educational' | 'cinematic';
}

export interface GenerationResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  analysis: ScriptAnalysis;
  videos: VideoMatch[];
  videoUrl?: string;
  error?: string;
}

// ==========================================
// Workflow 1: AI Video Generator Types
// ==========================================

export type AIVideoModel = 'kling-v1' | 'luma-dream' | 'fal-flux';

export type AspectRatio = '16:9' | '9:16' | '1:1';

export type CameraMotion =
  | 'static'
  | 'zoom_in'
  | 'zoom_out'
  | 'pan_left'
  | 'pan_right'
  | 'orbit'
  | 'drone'
  | 'tilt_up'
  | 'tilt_down';

export interface AIVideoGenerationRequest {
  script: string;
  prompt?: string;
  model?: AIVideoModel;
  aspectRatio?: AspectRatio | string;
  duration?: number;
  cameraMotion?: CameraMotion | string;
  negativePrompt?: string;
  style?: string;
  voice?: string;
  mock?: boolean;
  characterSheetUrl?: string;
  seed?: number;
}

export interface AIVideoGenerationResponse {
  success: boolean;
  jobId: string;
  videoUrl: string;
  prompt: string;
  modelUsed: string;
  duration: number;
  metadata: Record<string, any>;
  error?: string;
}

// ==========================================
// Workflow 2: Stories Orchestrator Types
// ==========================================

export interface StoryPart {
  partNumber: number;
  title: string;
  script: string;
  hook: string;
  cliffhanger: string;
  scenes: Scene[];
  estimatedDuration?: number;
}

export interface StorySeriesRequest {
  topic: string;
  storyType: string;
  partsCount: number;
  visualStyle: string;
  voice?: string;
  aspectRatio?: AspectRatio | string;
  includeHooks?: boolean;
}

export interface StorySeriesResponse {
  success: boolean;
  seriesTitle: string;
  parts: StoryPart[];
  metadata: Record<string, any>;
  error?: string;
}

// ==========================================
// Workflow 3: Bulk Content Planner Types
// ==========================================

export interface BulkPlanItem {
  day: number;
  title: string;
  hook: string;
  script: string;
  status: string;
  visualPrompt?: string;
  targetPlatform?: string;
  tags?: string[];
  scheduledDate?: string;
}

export interface BulkPlanRequest {
  niche: string;
  contentCount: number;
  cadence: string;
  visualStyle: string;
  voice?: string;
  platforms: string[];
  aspectRatio?: AspectRatio | string;
}

export interface BulkPlanResponse {
  success: boolean;
  planTitle: string;
  items: BulkPlanItem[];
  batchJobIds: string[];
  metadata?: Record<string, any>;
  error?: string;
}

// ==========================================
// Workflow 4: Micro-Drama Orchestrator Types
// ==========================================

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
  cliffhanger?: string;
  duration?: number;
}

export interface DramaSeriesRequest {
  script?: string;
  genre: string;
  characters: DramaCharacter[];
  episodesCount: number;
  aspectRatio?: AspectRatio | string;
  visualStyle?: string;
}

export interface DramaSeriesResponse {
  success: boolean;
  dramaTitle: string;
  characters: Array<{
    name: string;
    avatarUrl: string;
    visualAnchor: string;
  }>;
  episodes: DramaEpisode[];
  metadata?: Record<string, any>;
  error?: string;
}

// ==========================================
// Workflow 5: Shorts Extractor Types
// ==========================================

export interface ExtractedClip {
  clipId: string;
  title: string;
  hook: string;
  startTime: number;
  endTime: number;
  viralScore: number;
  reason: string;
  transcriptSegment?: string;
  videoUrl?: string;
}

export interface ShortsExtractionRequest {
  sourceType: 'url' | 'transcript' | 'file';
  videoUrl?: string;
  transcript?: string;
  clipCount?: number;
  strategy?: string;
  captionStyle?: string;
  aspectRatio?: AspectRatio | string;
}

export interface ShortsExtractionResponse {
  success: boolean;
  originalDuration: number;
  clips: ExtractedClip[];
  metadata?: Record<string, any>;
  error?: string;
}

// ==========================================
// Workflow 6: Auto Pilot Types
// ==========================================

export interface AutoPilotConfig {
  pipelineName: string;
  niche: string;
  schedule: string;
  sourceStrategy: string;
  visualPipeline: string;
  autoPublish: boolean;
  targetPlatforms: string[];
  voice?: string;
  visualStyle?: string;
  aspectRatio?: AspectRatio | string;
}

export interface AutoPilotResponse {
  success: boolean;
  pipelineId: string;
  nextRun: string;
  generatedJobId?: string;
  status: string;
  metadata?: Record<string, any>;
  error?: string;
}

// ==========================================
// Database & Common Workflow Contracts
// ==========================================

export type WorkflowType =
  | 'footage'
  | 'images'
  | 'ai-videos'
  | 'stories'
  | 'bulk'
  | 'bulk-plan'
  | 'shorts'
  | 'extract-shorts'
  | 'drama'
  | 'micro-drama'
  | 'auto'
  | 'avatar'
  | 'whiteboard'
  | 'mission';

export type RenderJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface RenderJobRecord {
  id: string;
  video_id?: string | null;
  status: RenderJobStatus;
  progress: number;
  logs?: any;
  error_message?: string | null;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

// ==========================================
// API Key Status & Workflow Cards Types
// ==========================================

export interface ApiKeyStatus {
  isConfigured: boolean;
  isActive: boolean;
  maskedValue?: string;
  updatedAt?: string | null;
  source?: 'database' | 'env' | 'none';
}

export type ApiKeysMap = Record<string, ApiKeyStatus>;

export type WorkflowHealthStatus = 'ready' | 'warning' | 'error';
export type CostTier = '$' | '$$' | '$$$';

export interface WorkflowStatusResult {
  status: WorkflowHealthStatus;
  costTier: CostTier;
  label: string;
  requiredProviders: string[];
  missingProviders: string[];
  configuredProviders: string[];
  fallbackAvailable: boolean;
  message?: string;
}

export interface WorkflowDefinition {
  id: WorkflowType;
  title: string;
  description: string;
  iconName: string;
  color: string;
  bg: string;
  borderHover?: string;
  href: string;
  category?: 'ai-video' | 'stock' | 'avatar-wb' | 'automation' | string;
  costTier: CostTier;
  primaryProviders: string[];
  fallbackProviders?: string[];
  hasFallback: boolean;
  badge?: string;
  isNew?: boolean;
  isPopular?: boolean;
  settingsUrl?: string;
}

// ==========================================
// Workflow 7: Avatar to Video Engine Types
// ==========================================

export type AvatarProvider = 'heygen' | 'did' | 'liveportrait' | 'remotion-pip' | 'mock';
export type AvatarLayout = 'pip_bottom_right' | 'pip_bottom_left' | 'fullscreen' | 'side_by_side' | 'circular_bubble';
export type AvatarVoice = 'nova' | 'onyx' | 'rachel' | 'josh' | 'alloy' | 'shimmer' | string;

export interface AvatarPreset {
  id: string;
  name: string;
  previewUrl: string;
  gender: 'male' | 'female' | 'neutral';
  style: 'photorealistic' | '3d_animated' | 'anime' | 'illustrated';
  supportedProviders: AvatarProvider[];
}

export interface AvatarConfig {
  avatarType: 'preset' | 'custom_photo';
  avatarId?: string;
  customImageUrl?: string | null;
  layout?: AvatarLayout;
  voice?: AvatarVoice;
  speed?: number;
  aspectRatio?: AspectRatio | string;
  backgroundVideoUrl?: string;
  backgroundMusicUrl?: string;
}

export interface AvatarGenerationRequest extends AvatarConfig {
  script: string;
  mock?: boolean;
}

export interface AvatarGenerationResponse {
  success: boolean;
  jobId: string;
  videoUrl: string;
  avatarId: string;
  duration: number;
  layout: AvatarLayout;
  providerUsed: AvatarProvider | string;
  metadata: Record<string, any>;
  error?: string;
}

// ==========================================
// Workflow 8: Whiteboard Animation Engine Types
// ==========================================

export type WhiteboardArchetype =
  | 'stickman'
  | 'saint'
  | 'old man'
  | 'founder'
  | 'doctor'
  | 'teacher'
  | 'scientist'
  | 'custom';

export type WhiteboardStyle =
  | 'monoline_marker'
  | 'blackboard_chalk'
  | 'blueprint'
  | 'colored_doodle'
  | 'sketch_outline';

export interface CharacterPose {
  name: string;
  description: string;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  svgPath?: string;
  previewUrl?: string;
}

export interface CharacterReferenceSheet {
  characterId: string;
  archetype: WhiteboardArchetype | string;
  customDescription?: string;
  sheetImageUrl: string;
  poses: Record<string, CharacterPose>; // pose_1 to pose_9
  style: WhiteboardStyle | string;
  createdAt?: string;
}

export interface WhiteboardStoryboardBeat {
  id: string;
  text: string;
  narration: string;
  duration: number;
  assignedPose: string; // e.g. 'pose_1' | 'pointing' | 'eureka'
  drawingPrompt: string;
  drawingSvgPath?: string;
  markerColor?: string;
  handOverlay?: boolean;
}

export interface WhiteboardGenerationRequest {
  prompt: string;
  script?: string;
  characterArchetype?: WhiteboardArchetype;
  customCharacterDescription?: string;
  style?: WhiteboardStyle;
  markerColor?: string;
  aspectRatio?: AspectRatio | string;
  voice?: string;
  mock?: boolean;
}

export interface WhiteboardGenerationResponse {
  success: boolean;
  jobId: string;
  videoUrl: string;
  characterSheet: CharacterReferenceSheet;
  storyboard: WhiteboardStoryboardBeat[];
  duration: number;
  metadata: Record<string, any>;
  error?: string;
}

// ==========================================
// Workflow 9: Automatic Mission Mode Types
// ==========================================

export type MissionStage =
  | 'prompt_analysis'
  | 'script_generation'
  | 'scene_planning'
  | 'asset_sourcing'
  | 'voice_synthesis'
  | 'video_composition'
  | 'ready';

export interface MissionStepStatus {
  stage: MissionStage;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  startedAt?: string;
  completedAt?: string;
  log?: string;
}

export interface MissionJobState {
  jobId: string;
  prompt: string;
  aspectRatio: AspectRatio;
  style: string;
  voice: string;
  currentStage: MissionStage;
  overallProgress: number;
  steps: MissionStepStatus[];
  script?: string;
  scenes?: Scene[];
  audioUrl?: string;
  videoUrl?: string;
  error?: string;
}
