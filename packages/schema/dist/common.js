import { z } from 'zod';
/**
 * Common enums and base types shared across the pipeline
 */
export const AspectRatioSchema = z.enum(['16:9', '9:16', '1:1']);
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
export const RenderJobStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);
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
export const VoiceGenderSchema = z.enum(['male', 'female', 'neutral']);
export const BgmPresetSchema = z.enum([
    'upbeat',
    'cinematic',
    'ambient',
    'lofi',
    'dramatic',
    'corporate',
]);
export const AvatarProviderSchema = z.enum([
    'heygen',
    'did',
    'liveportrait',
    'remotion-pip',
    'mock',
]);
export const AvatarLayoutSchema = z.enum([
    'pip_bottom_right',
    'pip_bottom_left',
    'fullscreen',
    'side_by_side',
    'circular_bubble',
]);
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
export const WhiteboardStyleSchema = z.enum([
    'monoline_marker',
    'blackboard_chalk',
    'blueprint',
    'colored_doodle',
    'sketch_outline',
]);
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
export const AIVideoModelSchema = z.enum([
    'kling-v1',
    'luma-dream',
    'fal-flux',
    'alibaba/wan-3.0/text-to-video',
]).or(z.string());
export const ShortsSourceTypeSchema = z.enum(['url', 'transcript', 'file']);
/**
 * Base metadata attached to all responses
 */
export const MetadataSchema = z.record(z.string(), z.unknown());
/**
 * Pagination helper
 */
export const PaginationSchema = z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20),
});
