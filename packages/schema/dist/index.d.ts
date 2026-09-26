/**
 * @clipped/schema - Shared Zod schemas for Clipped video generation pipeline
 *
 * Single source of truth for all job payloads, TTS, media, and workflow types.
 * Provides both compile-time TypeScript types and runtime validation.
 */
import { z } from 'zod';
export * from './common';
export * from './render-params';
export * from './tts';
export * from './media';
export { AIVideoGenerationRequestSchema, type AIVideoGenerationRequest, AIVideoGenerationResponseSchema, type AIVideoGenerationResponse, StoryPartSchema, type StoryPart, StorySeriesRequestSchema, type StorySeriesRequest, StorySeriesResponseSchema, type StorySeriesResponse, BulkPlanItemSchema, type BulkPlanItem, BulkPlanRequestSchema, type BulkPlanRequest, BulkPlanResponseSchema, type BulkPlanResponse, DramaCharacterSchema, type DramaCharacter, DramaEpisodeSchema, type DramaEpisode, DramaSeriesRequestSchema, type DramaSeriesRequest, DramaSeriesResponseSchema, type DramaSeriesResponse, ExtractedClipSchema, type ExtractedClip, ShortsExtractionRequestSchema, type ShortsExtractionRequest, ShortsExtractionResponseSchema, type ShortsExtractionResponse, AutoPilotConfigSchema, type AutoPilotConfig, AutoPilotResponseSchema, type AutoPilotResponse, AvatarPresetSchema, type AvatarPreset, AvatarConfigSchema, type AvatarConfig, AvatarGenerationRequestSchema, type AvatarGenerationRequest, AvatarGenerationResponseSchema, type AvatarGenerationResponse, CharacterPoseSchema, type CharacterPose, CharacterReferenceSheetSchema, type CharacterReferenceSheet, WhiteboardStoryboardBeatSchema, type WhiteboardStoryboardBeat, WhiteboardGenerationRequestSchema, type WhiteboardGenerationRequest, WhiteboardGenerationResponseSchema, type WhiteboardGenerationResponse, MissionStageSchema, MissionStepStatusSchema, type MissionStepStatus, MissionJobStateSchema, type MissionJobState, validateAIVideoRequest, validateStorySeriesRequest, validateBulkPlanRequest, validateDramaSeriesRequest, validateShortsExtractionRequest, validateAutoPilotConfig, validateAvatarConfig, validateWhiteboardRequest, validateMissionJobState, } from './workflow';
/**
 * Version of the schema package - increment when breaking changes
 */
export declare const SCHEMA_VERSION = "1.0.0";
/**
 * Helper to validate any schema and throw formatted error
 */
export declare function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T;
/**
 * Safe parse with typed result
 */
export declare function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: true;
    data: T;
} | {
    success: false;
    error: z.ZodError;
};
export type { ZodSchema, ZodType, ZodError, ZodIssue } from 'zod';
//# sourceMappingURL=index.d.ts.map