import { z } from 'zod';
import { AspectRatioSchema } from './common';

/**
 * Media Asset - canonical provenance-bearing asset
 */
export const MediaAssetSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  source: z.enum(['generated', 'stock', 'uploaded', 'reference']),
  provider: z.string().optional(),
  model: z.string().optional(),
  prompt: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().positive().optional(),
  mimeType: z.string().optional(),
  license: z.string().optional(),
  attribution: z.string().optional(),
  generatedAt: z.string().datetime().optional(),
});

export type MediaAsset = z.infer<typeof MediaAssetSchema>;

/**
 * Video from stock providers
 */
export const VideoSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  title: z.string(),
  platform: z.enum(['pixabay', 'pexels', 'unsplash', 'coverr', 'mixkit', 'videvo', 'openverse']),
  thumbnail: z.string().url().optional(),
  duration: z.number().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  mediaAsset: MediaAssetSchema.optional(),
});

export type Video = z.infer<typeof VideoSchema>;

/**
 * Scene with media
 */
export const SceneSchema = z.object({
  id: z.string(),
  text: z.string(),
  keywords: z.array(z.string()),
  description: z.string(),
  duration: z.number().positive(),
  emotion: z.string().optional(),
  cameraMotion: z.string().optional(),
  visualPrompt: z.string().optional(),
  imagePrompt: z.string().optional(),
  selectedVideo: VideoSchema.optional(),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  audioUrl: z.string().url().optional(),
  mediaAsset: MediaAssetSchema.optional(),
  wordTimestamps: z.array(z.object({
    word: z.string(),
    start: z.number().nonnegative(),
    end: z.number().nonnegative(),
    confidence: z.number().min(0).max(1).optional(),
  })).optional(),
  exactDuration: z.number().positive().optional(),
});

export type Scene = z.infer<typeof SceneSchema>;

/**
 * Video match from stock search
 */
export const VideoMatchSchema = z.object({
  video: VideoSchema,
  score: z.number().min(0).max(1),
  reason: z.string(),
});

export type VideoMatch = z.infer<typeof VideoMatchSchema>;

/**
 * Script analysis result
 */
export const ScriptAnalysisSchema = z.object({
  script: z.string(),
  scenes: z.array(SceneSchema),
  totalDuration: z.number().positive(),
  title: z.string().optional(),
  summary: z.string().optional(),
});

export type ScriptAnalysis = z.infer<typeof ScriptAnalysisSchema>;

/**
 * Generation request for AI video
 */
export const GenerationRequestSchema = z.object({
  script: z.string(),
  character: z.string().optional(),
  platforms: z.array(z.string()).optional(),
  style: z.enum(['professional', 'casual', 'educational', 'cinematic']).optional(),
});

export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;

/**
 * Generation response
 */
export const GenerationResponseSchema = z.object({
  success: z.boolean(),
  jobId: z.string(),
  status: z.enum(['pending', 'generating', 'rendering', 'completed', 'failed']),
  analysis: ScriptAnalysisSchema,
  videos: z.array(VideoMatchSchema),
  videoUrl: z.string().url().optional(),
  error: z.string().optional(),
});

export type GenerationResponse = z.infer<typeof GenerationResponseSchema>;

/**
 * Validation helpers
 */
export function validateMediaAsset(data: unknown): MediaAsset {
  return MediaAssetSchema.parse(data);
}

export function validateScene(data: unknown): Scene {
  return SceneSchema.parse(data);
}

export function validateScriptAnalysis(data: unknown): ScriptAnalysis {
  return ScriptAnalysisSchema.parse(data);
}