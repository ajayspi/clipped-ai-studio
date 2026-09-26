/**
 * @clipped/schema - Shared Zod schemas for Clipped video generation pipeline
 *
 * Single source of truth for all job payloads, TTS, media, and workflow types.
 * Provides both compile-time TypeScript types and runtime validation.
 */
// Common enums and base types
export * from './common';
// Render job parameters and orchestration
export * from './render-params';
// TTS Engine types
export * from './tts';
// Media assets and scenes
export * from './media';
// Workflow-specific request/response types (avoid duplicate exports from common)
export { AIVideoGenerationRequestSchema, AIVideoGenerationResponseSchema, StoryPartSchema, StorySeriesRequestSchema, StorySeriesResponseSchema, BulkPlanItemSchema, BulkPlanRequestSchema, BulkPlanResponseSchema, DramaCharacterSchema, DramaEpisodeSchema, DramaSeriesRequestSchema, DramaSeriesResponseSchema, ExtractedClipSchema, ShortsExtractionRequestSchema, ShortsExtractionResponseSchema, AutoPilotConfigSchema, AutoPilotResponseSchema, AvatarPresetSchema, AvatarConfigSchema, AvatarGenerationRequestSchema, AvatarGenerationResponseSchema, CharacterPoseSchema, CharacterReferenceSheetSchema, WhiteboardStoryboardBeatSchema, WhiteboardGenerationRequestSchema, WhiteboardGenerationResponseSchema, MissionStageSchema, MissionStepStatusSchema, MissionJobStateSchema, validateAIVideoRequest, validateStorySeriesRequest, validateBulkPlanRequest, validateDramaSeriesRequest, validateShortsExtractionRequest, validateAutoPilotConfig, validateAvatarConfig, validateWhiteboardRequest, validateMissionJobState, } from './workflow';
/**
 * Version of the schema package - increment when breaking changes
 */
export const SCHEMA_VERSION = '1.0.0';
/**
 * Helper to validate any schema and throw formatted error
 */
export function validateOrThrow(schema, data, context) {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errorMsg = [
            context ? `Validation failed${context ? ` (${context})` : ''}:` : 'Validation failed:',
            ...result.error.issues.map((issue) => `  ${issue.path.join('.') || 'root'}: ${issue.message}`),
        ].join('\n');
        throw new Error(errorMsg);
    }
    return result.data;
}
/**
 * Safe parse with typed result
 */
export function safeParse(schema, data) {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
