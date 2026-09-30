import { z } from 'zod';
import { AspectRatioSchema } from './common';
/**
 * Workflow 1: AI Video Generator Types
 */
export const AIVideoModelSchema = z.enum([
    'kling-v1',
    'luma-dream',
    'fal-flux',
    'alibaba/wan-3.0/text-to-video',
]).or(z.string());
export const CameraMotionSchema = z.enum([
    'static', 'zoom_in', 'zoom_out', 'pan_left', 'pan_right',
    'orbit', 'drone', 'tilt_up', 'tilt_down',
]);
export const AIVideoGenerationRequestSchema = z.object({
    script: z.string(),
    prompt: z.string().optional(),
    model: AIVideoModelSchema.optional(),
    aspectRatio: AspectRatioSchema.optional(),
    duration: z.number().positive().optional(),
    cameraMotion: CameraMotionSchema.optional(),
    negativePrompt: z.string().optional(),
    style: z.string().optional(),
    voice: z.string().optional(),
    mock: z.boolean().default(false),
    characterSheetUrl: z.string().url().optional(),
    seed: z.number().int().optional(),
});
export const AIVideoGenerationResponseSchema = z.object({
    success: z.boolean(),
    jobId: z.string(),
    videoUrl: z.string().url(),
    prompt: z.string(),
    modelUsed: z.string(),
    duration: z.number().positive(),
    metadata: z.record(z.string(), z.unknown()),
    error: z.string().optional(),
});
/**
 * Workflow 2: Stories Orchestrator Types
 */
export const StoryPartSchema = z.object({
    partNumber: z.number().int().positive(),
    title: z.string(),
    script: z.string(),
    hook: z.string(),
    cliffhanger: z.string(),
    scenes: z.array(z.object({
        id: z.string(),
        text: z.string(),
        keywords: z.array(z.string()),
        description: z.string(),
        duration: z.number().positive(),
        emotion: z.string().optional(),
        cameraMotion: z.string().optional(),
        visualPrompt: z.string().optional(),
        imagePrompt: z.string().optional(),
        selectedVideo: z.object({
            id: z.string(),
            url: z.string().url(),
            title: z.string(),
            platform: z.string(),
            thumbnail: z.string().url().optional(),
            duration: z.number().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
        }).optional(),
        imageUrl: z.string().url().optional(),
        videoUrl: z.string().url().optional(),
        audioUrl: z.string().url().optional(),
    })),
    estimatedDuration: z.number().positive().optional(),
});
export const StorySeriesRequestSchema = z.object({
    topic: z.string(),
    storyType: z.string(),
    partsCount: z.number().int().positive(),
    visualStyle: z.string(),
    voice: z.string().optional(),
    aspectRatio: AspectRatioSchema.optional(),
    includeHooks: z.boolean().optional(),
});
export const StorySeriesResponseSchema = z.object({
    success: z.boolean(),
    seriesTitle: z.string(),
    parts: z.array(StoryPartSchema),
    metadata: z.record(z.string(), z.unknown()),
    error: z.string().optional(),
});
/**
 * Workflow 3: Bulk Content Planner Types
 */
export const BulkPlanItemSchema = z.object({
    day: z.number().int().positive(),
    title: z.string(),
    hook: z.string(),
    script: z.string(),
    status: z.string(),
    visualPrompt: z.string().optional(),
    targetPlatform: z.string().optional(),
    tags: z.array(z.string()).optional(),
    scheduledDate: z.string().datetime().optional(),
});
export const BulkPlanRequestSchema = z.object({
    niche: z.string(),
    contentCount: z.number().int().positive(),
    cadence: z.string(),
    visualStyle: z.string(),
    voice: z.string().optional(),
    platforms: z.array(z.string()),
    aspectRatio: AspectRatioSchema.optional(),
});
export const BulkPlanResponseSchema = z.object({
    success: z.boolean(),
    planTitle: z.string(),
    items: z.array(BulkPlanItemSchema),
    batchJobIds: z.array(z.string()),
    metadata: z.record(z.string(), z.unknown()).optional(),
    error: z.string().optional(),
});
/**
 * Workflow 4: Micro-Drama Types
 */
export const DramaCharacterSchema = z.object({
    name: z.string(),
    description: z.string(),
    visualAnchor: z.string(),
    voice: z.string().optional(),
    avatarUrl: z.string().url().optional(),
});
export const DramaEpisodeSchema = z.object({
    episodeNumber: z.number().int().positive(),
    title: z.string(),
    script: z.string(),
    scenes: z.array(z.object({
        id: z.string(),
        text: z.string(),
        keywords: z.array(z.string()),
        description: z.string(),
        duration: z.number().positive(),
        emotion: z.string().optional(),
        cameraMotion: z.string().optional(),
        visualPrompt: z.string().optional(),
        imagePrompt: z.string().optional(),
        selectedVideo: z.object({
            id: z.string(),
            url: z.string().url(),
            title: z.string(),
            platform: z.string(),
            thumbnail: z.string().url().optional(),
            duration: z.number().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
        }).optional(),
        imageUrl: z.string().url().optional(),
        videoUrl: z.string().url().optional(),
        audioUrl: z.string().url().optional(),
    })),
    cliffhanger: z.string().optional(),
    duration: z.number().positive().optional(),
});
export const DramaSeriesRequestSchema = z.object({
    script: z.string().optional(),
    genre: z.string(),
    characters: z.array(DramaCharacterSchema),
    episodesCount: z.number().int().positive(),
    aspectRatio: AspectRatioSchema.optional(),
    visualStyle: z.string().optional(),
});
export const DramaSeriesResponseSchema = z.object({
    success: z.boolean(),
    dramaTitle: z.string(),
    characters: z.array(z.object({
        name: z.string(),
        avatarUrl: z.string().url(),
        visualAnchor: z.string(),
    })),
    episodes: z.array(DramaEpisodeSchema),
    metadata: z.record(z.string(), z.unknown()).optional(),
    error: z.string().optional(),
});
/**
 * Workflow 5: Shorts Extractor Types
 */
export const ExtractedClipSchema = z.object({
    clipId: z.string(),
    title: z.string(),
    hook: z.string(),
    startTime: z.number().nonnegative(),
    endTime: z.number().positive(),
    viralScore: z.number().min(0).max(100),
    reason: z.string(),
    transcriptSegment: z.string().optional(),
    videoUrl: z.string().url().optional(),
});
export const ShortsExtractionRequestSchema = z.object({
    sourceType: z.enum(['url', 'transcript', 'file']),
    videoUrl: z.string().url().optional(),
    transcript: z.string().optional(),
    clipCount: z.number().int().positive().optional(),
    strategy: z.string().optional(),
    captionStyle: z.string().optional(),
    aspectRatio: AspectRatioSchema.optional(),
});
export const ShortsExtractionResponseSchema = z.object({
    success: z.boolean(),
    originalDuration: z.number().positive(),
    clips: z.array(ExtractedClipSchema),
    metadata: z.record(z.string(), z.unknown()).optional(),
    error: z.string().optional(),
});
/**
 * Workflow 6: Auto Pilot Types
 */
export const AutoPilotConfigSchema = z.object({
    pipelineName: z.string(),
    niche: z.string(),
    schedule: z.string(),
    sourceStrategy: z.string(),
    visualPipeline: z.string(),
    autoPublish: z.boolean(),
    targetPlatforms: z.array(z.string()),
    voice: z.string().optional(),
    visualStyle: z.string().optional(),
    aspectRatio: AspectRatioSchema.optional(),
});
export const AutoPilotResponseSchema = z.object({
    success: z.boolean(),
    pipelineId: z.string(),
    nextRun: z.string().datetime(),
    generatedJobId: z.string().optional(),
    status: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    error: z.string().optional(),
});
/**
 * Avatar Types
 */
export const AvatarProviderSchema = z.enum(['heygen', 'did', 'liveportrait', 'remotion-pip', 'mock']);
export const AvatarLayoutSchema = z.enum(['pip_bottom_right', 'pip_bottom_left', 'fullscreen', 'side_by_side', 'circular_bubble']);
export const AvatarVoiceSchema = z.enum(['nova', 'onyx', 'rachel', 'josh', 'alloy', 'shimmer']).or(z.string());
export const AvatarPresetSchema = z.object({
    id: z.string(),
    name: z.string(),
    previewUrl: z.string().url(),
    gender: z.enum(['male', 'female', 'neutral']),
    style: z.enum(['photorealistic', '3d_animated', 'anime', 'illustrated']),
    supportedProviders: z.array(AvatarProviderSchema),
});
export const AvatarConfigSchema = z.object({
    avatarType: z.enum(['preset', 'custom_photo']),
    avatarId: z.string().optional(),
    customImageUrl: z.string().url().nullable().optional(),
    layout: AvatarLayoutSchema.optional(),
    voice: AvatarVoiceSchema.optional(),
    speed: z.number().positive().optional(),
    aspectRatio: AspectRatioSchema.optional(),
    backgroundVideoUrl: z.string().url().optional(),
    backgroundMusicUrl: z.string().url().optional(),
});
export const AvatarGenerationRequestSchema = AvatarConfigSchema.extend({
    script: z.string(),
    mock: z.boolean().optional(),
});
export const AvatarGenerationResponseSchema = z.object({
    success: z.boolean(),
    jobId: z.string(),
    videoUrl: z.string().url(),
    avatarId: z.string(),
    duration: z.number().positive(),
    layout: AvatarLayoutSchema,
    providerUsed: z.string(),
    metadata: z.record(z.string(), z.unknown()),
    error: z.string().optional(),
});
/**
 * Whiteboard Types
 */
export const WhiteboardArchetypeSchema = z.enum([
    'stickman', 'saint', 'old man', 'founder', 'doctor', 'teacher', 'scientist', 'custom',
]);
export const WhiteboardStyleSchema = z.enum([
    'monoline_marker', 'blackboard_chalk', 'blueprint', 'colored_doodle', 'sketch_outline',
]);
export const CharacterPoseSchema = z.object({
    name: z.string(),
    description: z.string(),
    bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    svgPath: z.string().optional(),
    previewUrl: z.string().url().optional(),
});
export const CharacterReferenceSheetSchema = z.object({
    characterId: z.string(),
    archetype: WhiteboardArchetypeSchema.or(z.string()),
    customDescription: z.string().optional(),
    sheetImageUrl: z.string().url(),
    poses: z.record(z.string(), CharacterPoseSchema),
    style: WhiteboardStyleSchema.or(z.string()),
    createdAt: z.string().datetime().optional(),
});
export const WhiteboardStoryboardBeatSchema = z.object({
    id: z.string(),
    text: z.string(),
    narration: z.string(),
    duration: z.number().positive(),
    assignedPose: z.string(),
    drawingPrompt: z.string(),
    drawingSvgPath: z.string().optional(),
    markerColor: z.string().optional(),
    handOverlay: z.boolean().optional(),
});
export const WhiteboardGenerationRequestSchema = z.object({
    prompt: z.string(),
    script: z.string().optional(),
    characterArchetype: WhiteboardArchetypeSchema.optional(),
    customCharacterDescription: z.string().optional(),
    style: WhiteboardStyleSchema.optional(),
    markerColor: z.string().optional(),
    aspectRatio: AspectRatioSchema.optional(),
    voice: z.string().optional(),
    mock: z.boolean().optional(),
});
export const WhiteboardGenerationResponseSchema = z.object({
    success: z.boolean(),
    jobId: z.string(),
    videoUrl: z.string().url(),
    characterSheet: CharacterReferenceSheetSchema,
    storyboard: z.array(WhiteboardStoryboardBeatSchema),
    duration: z.number().positive(),
    metadata: z.record(z.string(), z.unknown()),
    error: z.string().optional(),
});
/**
 * Mission Types
 */
export const MissionStageSchema = z.enum([
    'prompt_analysis', 'script_generation', 'scene_planning', 'asset_sourcing',
    'voice_synthesis', 'video_composition', 'ready',
]);
export const MissionStepStatusSchema = z.object({
    stage: MissionStageSchema,
    label: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
    progress: z.number().min(0).max(100),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    log: z.string().optional(),
});
export const MissionJobStateSchema = z.object({
    jobId: z.string(),
    prompt: z.string(),
    aspectRatio: AspectRatioSchema,
    style: z.string(),
    voice: z.string(),
    currentStage: MissionStageSchema,
    overallProgress: z.number().min(0).max(100),
    steps: z.array(MissionStepStatusSchema),
    script: z.string().optional(),
    scenes: z.array(z.object({
        id: z.string(),
        text: z.string(),
        keywords: z.array(z.string()),
        description: z.string(),
        duration: z.number().positive(),
        emotion: z.string().optional(),
        cameraMotion: z.string().optional(),
        visualPrompt: z.string().optional(),
        imagePrompt: z.string().optional(),
        selectedVideo: z.object({
            id: z.string(),
            url: z.string().url(),
            title: z.string(),
            platform: z.string(),
            thumbnail: z.string().url().optional(),
            duration: z.number().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
        }).optional(),
        imageUrl: z.string().url().optional(),
        videoUrl: z.string().url().optional(),
        audioUrl: z.string().url().optional(),
    })).optional(),
    audioUrl: z.string().url().optional(),
    videoUrl: z.string().url().optional(),
    error: z.string().optional(),
});
/**
 * Validation helpers
 */
export function validateAIVideoRequest(data) {
    return AIVideoGenerationRequestSchema.parse(data);
}
export function validateStorySeriesRequest(data) {
    return StorySeriesRequestSchema.parse(data);
}
export function validateBulkPlanRequest(data) {
    return BulkPlanRequestSchema.parse(data);
}
export function validateDramaSeriesRequest(data) {
    return DramaSeriesRequestSchema.parse(data);
}
export function validateShortsExtractionRequest(data) {
    return ShortsExtractionRequestSchema.parse(data);
}
export function validateAutoPilotConfig(data) {
    return AutoPilotConfigSchema.parse(data);
}
export function validateAvatarConfig(data) {
    return AvatarConfigSchema.parse(data);
}
export function validateWhiteboardRequest(data) {
    return WhiteboardGenerationRequestSchema.parse(data);
}
export function validateMissionJobState(data) {
    return MissionJobStateSchema.parse(data);
}
