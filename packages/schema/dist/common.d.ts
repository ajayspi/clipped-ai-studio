import { z } from 'zod';
/**
 * Common enums and base types shared across the pipeline
 */
export declare const AspectRatioSchema: z.ZodEnum<["16:9", "9:16", "1:1"]>;
export type AspectRatio = z.infer<typeof AspectRatioSchema>;
export declare const WorkflowTypeSchema: z.ZodEnum<["footage", "images", "ai-videos", "stories", "bulk", "bulk-plan", "shorts", "extract-shorts", "drama", "micro-drama", "auto", "avatar", "whiteboard", "mission"]>;
export type WorkflowType = z.infer<typeof WorkflowTypeSchema>;
export declare const RenderJobStatusSchema: z.ZodEnum<["pending", "processing", "completed", "failed"]>;
export type RenderJobStatus = z.infer<typeof RenderJobStatusSchema>;
export declare const OrchestrationStateSchema: z.ZodEnum<["planning", "queued", "claimed", "rendering", "publishing", "retryable", "completed", "failed"]>;
export type OrchestrationState = z.infer<typeof OrchestrationStateSchema>;
export declare const TTSProviderSchema: z.ZodEnum<["omniroute", "azure", "openai", "elevenlabs", "google", "coqui", "keyless", "mock", "auto"]>;
export type TTSProvider = z.infer<typeof TTSProviderSchema>;
export declare const SupportedLanguageSchema: z.ZodEnum<["en-US", "en-IN", "hi-IN", "ta-IN", "te-IN", "kn-IN", "bn-IN", "mr-IN"]>;
export type SupportedLanguage = z.infer<typeof SupportedLanguageSchema>;
export declare const VoiceGenderSchema: z.ZodEnum<["male", "female", "neutral"]>;
export type VoiceGender = z.infer<typeof VoiceGenderSchema>;
export declare const BgmPresetSchema: z.ZodEnum<["upbeat", "cinematic", "ambient", "lofi", "dramatic", "corporate"]>;
export type BgmPreset = z.infer<typeof BgmPresetSchema>;
export declare const AvatarProviderSchema: z.ZodEnum<["heygen", "did", "liveportrait", "remotion-pip", "mock"]>;
export type AvatarProvider = z.infer<typeof AvatarProviderSchema>;
export declare const AvatarLayoutSchema: z.ZodEnum<["pip_bottom_right", "pip_bottom_left", "fullscreen", "side_by_side", "circular_bubble"]>;
export type AvatarLayout = z.infer<typeof AvatarLayoutSchema>;
export declare const WhiteboardArchetypeSchema: z.ZodEnum<["stickman", "saint", "old man", "founder", "doctor", "teacher", "scientist", "custom"]>;
export type WhiteboardArchetype = z.infer<typeof WhiteboardArchetypeSchema>;
export declare const WhiteboardStyleSchema: z.ZodEnum<["monoline_marker", "blackboard_chalk", "blueprint", "colored_doodle", "sketch_outline"]>;
export type WhiteboardStyle = z.infer<typeof WhiteboardStyleSchema>;
export declare const CameraMotionSchema: z.ZodEnum<["static", "zoom_in", "zoom_out", "pan_left", "pan_right", "orbit", "drone", "tilt_up", "tilt_down"]>;
export type CameraMotion = z.infer<typeof CameraMotionSchema>;
export declare const AIVideoModelSchema: z.ZodUnion<[z.ZodEnum<["kling-v1", "luma-dream", "fal-flux", "alibaba/wan-3.0-prime/text-to-video"]>, z.ZodString]>;
export type AIVideoModel = z.infer<typeof AIVideoModelSchema>;
export declare const ShortsSourceTypeSchema: z.ZodEnum<["url", "transcript", "file"]>;
export type ShortsSourceType = z.infer<typeof ShortsSourceTypeSchema>;
/**
 * Base metadata attached to all responses
 */
export declare const MetadataSchema: z.ZodRecord<z.ZodString, z.ZodUnknown>;
export type Metadata = z.infer<typeof MetadataSchema>;
/**
 * Pagination helper
 */
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
export type Pagination = z.infer<typeof PaginationSchema>;
//# sourceMappingURL=common.d.ts.map