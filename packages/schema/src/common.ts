import { z } from 'zod';

/**
 * Common enums and base types shared across the pipeline
 */

export const AspectRatioSchema = z.enum(['16:9', '9:16', '1:1']);
export type AspectRatio = z.infer<typeof AspectRatioSchema>;

export const WorkflowTypeSchema = z.enum([
  'footage',
  'images',
  'ai-videos',
  'stories',
  'bulk',
  'bulk-plan',
  'shorts',
  'extract-shorts',
  'drama',
  'micro-drama',
  'auto',
  'avatar',
  'whiteboard',
  'mission',
]);
export type WorkflowType = z.infer<typeof WorkflowTypeSchema>;

export const RenderJobStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);
export type RenderJobStatus = z.infer<typeof RenderJobStatusSchema>;

export const OrchestrationStateSchema = z.enum([
  'planning',
  'queued',
  'claimed',
  'rendering',
  'publishing',
  'retryable',
  'completed',
  'failed',
]);
export type OrchestrationState = z.infer<typeof OrchestrationStateSchema>;

export const TTSProviderSchema = z.enum([
  'omniroute',
  'azure',
  'openai',
  'elevenlabs',
  'google',
  'coqui',
  'keyless',
  'mock',
  'auto',
]);
export type TTSProvider = z.infer<typeof TTSProviderSchema>;

export const SupportedLanguageSchema = z.enum([
  'en-US',
  'en-IN',
  'hi-IN',
  'ta-IN',
  'te-IN',
  'kn-IN',
  'bn-IN',
  'mr-IN',
]);
export type SupportedLanguage = z.infer<typeof SupportedLanguageSchema>;

export const VoiceGenderSchema = z.enum(['male', 'female', 'neutral']);
export type VoiceGender = z.infer<typeof VoiceGenderSchema>;

export const BgmPresetSchema = z.enum([
  'upbeat',
  'cinematic',
  'ambient',
  'lofi',
  'dramatic',
  'corporate',
]);
export type BgmPreset = z.infer<typeof BgmPresetSchema>;

export const AvatarProviderSchema = z.enum([
  'heygen',
  'did',
  'liveportrait',
  'remotion-pip',
  'mock',
]);
export type AvatarProvider = z.infer<typeof AvatarProviderSchema>;

export const AvatarLayoutSchema = z.enum([
  'pip_bottom_right',
  'pip_bottom_left',
  'fullscreen',
  'side_by_side',
  'circular_bubble',
]);
export type AvatarLayout = z.infer<typeof AvatarLayoutSchema>;

export const WhiteboardArchetypeSchema = z.enum([
  'stickman',
  'saint',
  'old man',
  'founder',
  'doctor',
  'teacher',
  'scientist',
  'custom',
]);
export type WhiteboardArchetype = z.infer<typeof WhiteboardArchetypeSchema>;

export const WhiteboardStyleSchema = z.enum([
  'monoline_marker',
  'blackboard_chalk',
  'blueprint',
  'colored_doodle',
  'sketch_outline',
]);
export type WhiteboardStyle = z.infer<typeof WhiteboardStyleSchema>;

export const CameraMotionSchema = z.enum([
  'static',
  'zoom_in',
  'zoom_out',
  'pan_left',
  'pan_right',
  'orbit',
  'drone',
  'tilt_up',
  'tilt_down',
]);
export type CameraMotion = z.infer<typeof CameraMotionSchema>;

export const AIVideoModelSchema = z.enum(['kling-v1', 'luma-dream', 'fal-flux']);
export type AIVideoModel = z.infer<typeof AIVideoModelSchema>;

export const ShortsSourceTypeSchema = z.enum(['url', 'transcript', 'file']);
export type ShortsSourceType = z.infer<typeof ShortsSourceTypeSchema>;

/**
 * Base metadata attached to all responses
 */
export const MetadataSchema = z.record(z.string(), z.unknown());
export type Metadata = z.infer<typeof MetadataSchema>;

/**
 * Pagination helper
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});
export type Pagination = z.infer<typeof PaginationSchema>;