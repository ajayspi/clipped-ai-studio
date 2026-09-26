import { z } from 'zod';
import {
  AspectRatioSchema,
  WorkflowTypeSchema,
  BgmPresetSchema,
} from './common';

/**
 * Subtitle configuration for video rendering
 */
export const SubtitleConfigSchema = z.object({
  burnSubtitles: z.boolean().default(true),
  subtitlePreset: z.string().optional(),
  subtitleColor: z.string().optional(),
  subtitleHighlightColor: z.string().optional(),
  subtitleGlow: z.boolean().optional(),
  subtitleGlowColor: z.string().optional(),
  subtitleOutline: z.union([z.boolean(), z.string()]).optional(),
  subtitleOutlineWidth: z.number().int().positive().optional(),
  subtitleBox: z.boolean().optional(),
  subtitleBoxColor: z.string().optional(),
  subtitleSize: z.number().positive().optional(),
  subtitleY: z.number().min(0).max(100).optional(),
  subtitleUppercase: z.boolean().optional(),
  // Karaoke/word-timing support
  karaoke: z.boolean().default(false),
  wordTimestamps: z.array(z.object({
    word: z.string(),
    start: z.number().nonnegative(),
    end: z.number().nonnegative(),
    confidence: z.number().min(0).max(1).optional(),
  })).optional(),
});

export type SubtitleConfig = z.infer<typeof SubtitleConfigSchema>;

/**
 * Individual beat/scene in a render job
 */
export const RenderBeatSchema = z.object({
  id: z.string().optional(),
  text: z.string().optional(),
  prompt: z.string().optional(),
  script: z.string().optional(),
  narration: z.string().optional(),
  duration: z.number().positive().optional(),
  voice: z.string().optional(),
  clipUrl: z.string().url().optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
  videoUrl: z.string().url().optional().or(z.literal('')),
  url: z.string().url().optional().or(z.literal('')),
  urls: z.array(z.string().url()).optional(),
  candidates: z.array(z.object({
    url: z.string().url().optional(),
  })).optional(),
  selectedVideo: z.object({
    url: z.string().url().optional(),
    platform: z.string().optional(),
    previewUrl: z.string().url().optional(),
  }).optional(),
  // Word-level timestamps for karaoke subtitles
  wordTimestamps: z.array(z.object({
    word: z.string(),
    start: z.number().nonnegative(),
    end: z.number().nonnegative(),
    confidence: z.number().min(0).max(1).optional(),
  })).optional(),
  // Exact audio duration from ffprobe
  exactDuration: z.number().positive().optional(),
});

export type RenderBeat = z.infer<typeof RenderBeatSchema>;

/**
 * Scene representation (alternative to beats for some workflows)
 */
export const RenderSceneSchema = z.object({
  id: z.string().optional(),
  text: z.string().optional(),
  narration: z.string().optional(),
  prompt: z.string().optional(),
  script: z.string().optional(),
  duration: z.number().positive().optional(),
  clipUrl: z.string().url().optional().or(z.literal('')),
  videoUrl: z.string().url().optional().or(z.literal('')),
  url: z.string().url().optional().or(z.literal('')),
  selectedVideo: z.object({
    url: z.string().url().optional(),
    previewUrl: z.string().url().optional(),
  }).optional(),
  wordTimestamps: z.array(z.object({
    word: z.string(),
    start: z.number().nonnegative(),
    end: z.number().nonnegative(),
    confidence: z.number().min(0).max(1).optional(),
  })).optional(),
  exactDuration: z.number().positive().optional(),
});

export type RenderScene = z.infer<typeof RenderSceneSchema>;

/**
 * Main render job parameters passed via job.logs
 */
export const RenderParamsSchema = z.object({
  message: z.string().optional(),
  script: z.string().optional(),
  duration: z.number().positive().optional(),
  aspectRatio: AspectRatioSchema.optional(),
  voice: z.string().optional(),
  voiceProvider: z.string().optional(),
  voiceSpeed: z.number().positive().default(1.0),
  voiceVolume: z.number().min(0).max(200).default(100),
  musicVolume: z.string().optional(),
  musicSource: z.string().optional(),
  beats: z.array(RenderBeatSchema).optional(),
  input: z.object({
    script: z.string().optional(),
    duration: z.number().optional(),
    beats: z.array(RenderBeatSchema).optional(),
  }).optional(),
  analysis: z.object({
    scenes: z.array(RenderSceneSchema).optional(),
  }).optional(),
  result: z.object({
    scenes: z.array(RenderSceneSchema).optional(),
  }).optional(),
  scenes: z.array(RenderSceneSchema).optional(),
  subtitleSettings: SubtitleConfigSchema.optional(),
  burnSubtitles: z.boolean().optional(),
  subtitlePreset: z.string().optional(),
  subtitleColor: z.string().optional(),
  subtitleHighlightColor: z.string().optional(),
  subtitleGlow: z.boolean().optional(),
  subtitleGlowColor: z.string().optional(),
  subtitleOutline: z.union([z.boolean(), z.string()]).optional(),
  subtitleOutlineWidth: z.number().int().positive().optional(),
  subtitleBox: z.boolean().optional(),
  subtitleBoxColor: z.string().optional(),
  subtitleSize: z.number().positive().optional(),
  subtitleY: z.number().min(0).max(100).optional(),
  // Workflow type for conditional logic
  workflowType: WorkflowTypeSchema.optional(),
  // Cost estimation from orchestrator
  costEstimation: z.object({
    totalCostUsd: z.number().optional(),
    llmTokens: z.number().optional(),
    ttsCharacters: z.number().optional(),
  }).optional(),
  // Final video URL template
  finalVideoUrl: z.string().url().optional(),
  // Background music
  bgmPreset: BgmPresetSchema.optional(),
  bgmVolume: z.number().min(0).max(1).default(0.2),
  enableDucking: z.boolean().default(true),
});

export type RenderParams = z.infer<typeof RenderParamsSchema>;

/**
 * Orchestration state stored in job.orchestration_state
 */
export const RenderOrchestrationStateSchema = z.object({
  subtitleSettings: SubtitleConfigSchema.optional(),
  voice: z.string().optional(),
  voiceProvider: z.string().optional(),
});

export type RenderOrchestrationState = z.infer<typeof RenderOrchestrationStateSchema>;

/**
 * Validation helpers
 */
export function validateRenderParams(data: unknown): RenderParams {
  return RenderParamsSchema.parse(data);
}

export function safeParseRenderParams(data: unknown): { success: true; data: RenderParams } | { success: false; error: z.ZodError } {
  const result = RenderParamsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function validateSubtitleConfig(data: unknown): SubtitleConfig {
  return SubtitleConfigSchema.parse(data);
}

export function validateRenderBeat(data: unknown): RenderBeat {
  return RenderBeatSchema.parse(data);
}