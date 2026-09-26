/**
 * @clipped/schema - Shared Zod schemas for Clipped video generation pipeline
 * 
 * Single source of truth for all job payloads, TTS, media, and workflow types.
 * Provides both compile-time TypeScript types and runtime validation.
 */

import { z } from 'zod';

// Common enums and base types
export * from './common';

// Render job parameters and orchestration
export * from './render-params';

// TTS Engine types
export * from './tts';

// Media assets and scenes
export * from './media';

// Workflow-specific request/response types (avoid duplicate exports from common)
export {
  AIVideoGenerationRequestSchema,
  type AIVideoGenerationRequest,
  AIVideoGenerationResponseSchema,
  type AIVideoGenerationResponse,
  StoryPartSchema,
  type StoryPart,
  StorySeriesRequestSchema,
  type StorySeriesRequest,
  StorySeriesResponseSchema,
  type StorySeriesResponse,
  BulkPlanItemSchema,
  type BulkPlanItem,
  BulkPlanRequestSchema,
  type BulkPlanRequest,
  BulkPlanResponseSchema,
  type BulkPlanResponse,
  DramaCharacterSchema,
  type DramaCharacter,
  DramaEpisodeSchema,
  type DramaEpisode,
  DramaSeriesRequestSchema,
  type DramaSeriesRequest,
  DramaSeriesResponseSchema,
  type DramaSeriesResponse,
  ExtractedClipSchema,
  type ExtractedClip,
  ShortsExtractionRequestSchema,
  type ShortsExtractionRequest,
  ShortsExtractionResponseSchema,
  type ShortsExtractionResponse,
  AutoPilotConfigSchema,
  type AutoPilotConfig,
  AutoPilotResponseSchema,
  type AutoPilotResponse,
  AvatarPresetSchema,
  type AvatarPreset,
  AvatarConfigSchema,
  type AvatarConfig,
  AvatarGenerationRequestSchema,
  type AvatarGenerationRequest,
  AvatarGenerationResponseSchema,
  type AvatarGenerationResponse,
  CharacterPoseSchema,
  type CharacterPose,
  CharacterReferenceSheetSchema,
  type CharacterReferenceSheet,
  WhiteboardStoryboardBeatSchema,
  type WhiteboardStoryboardBeat,
  WhiteboardGenerationRequestSchema,
  type WhiteboardGenerationRequest,
  WhiteboardGenerationResponseSchema,
  type WhiteboardGenerationResponse,
  MissionStageSchema,
  MissionStepStatusSchema,
  type MissionStepStatus,
  MissionJobStateSchema,
  type MissionJobState,
  validateAIVideoRequest,
  validateStorySeriesRequest,
  validateBulkPlanRequest,
  validateDramaSeriesRequest,
  validateShortsExtractionRequest,
  validateAutoPilotConfig,
  validateAvatarConfig,
  validateWhiteboardRequest,
  validateMissionJobState,
} from './workflow';

/**
 * Version of the schema package - increment when breaking changes
 */
export const SCHEMA_VERSION = '1.0.0';

/**
 * Helper to validate any schema and throw formatted error
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMsg = [
      context ? `Validation failed${context ? ` (${context})` : ''}:` : 'Validation failed:',
      ...result.error.issues.map((issue: z.ZodIssue) => 
        `  ${issue.path.join('.') || 'root'}: ${issue.message}`
      ),
    ].join('\n');
    throw new Error(errorMsg);
  }
  return result.data;
}

/**
 * Safe parse with typed result
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): 
  | { success: true; data: T }
  | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// Re-export Zod types for convenience
export type { ZodSchema, ZodType, ZodError, ZodIssue } from 'zod';