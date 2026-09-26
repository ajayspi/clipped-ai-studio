import { z } from 'zod';
import { SupportedLanguageSchema, TTSProviderSchema, VoiceGenderSchema } from './common';

/**
 * TTS Request - matches lib/engine/tts.ts TTSRequest
 */
export const TTSRequestSchema = z.object({
  text: z.string().min(1),
  language: SupportedLanguageSchema.optional(),
  provider: TTSProviderSchema.optional(),
  voice: z.string().optional(),
  voiceId: z.string().optional(),
  gender: VoiceGenderSchema.optional(),
  speed: z.number().positive().default(1.0),
  speakingRate: z.number().positive().default(1.0),
  pitch: z.number().default(0.0),
  volume: z.number().min(0).max(200).default(100),
  volumeGainDb: z.number().default(0.0),
  audioFormat: z.enum(['mp3', 'wav', 'ogg']).default('mp3'),
  mock: z.boolean().default(false),
  apiKey: z.string().optional(),
  region: z.string().optional(),
  model: z.string().optional(),
});

export type TTSRequest = z.infer<typeof TTSRequestSchema>;

/**
 * Provider attempt log for fallback tracking
 */
export const ProviderAttemptLogSchema = z.object({
  provider: z.string(),
  status: z.enum(['success', 'failed', 'skipped']),
  error: z.string().optional(),
  latencyMs: z.number().int().nonnegative().optional(),
});

export type ProviderAttemptLog = z.infer<typeof ProviderAttemptLogSchema>;

/**
 * Word-level timestamp for karaoke subtitles
 */
export const WordTimestampSchema = z.object({
  word: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  confidence: z.number().min(0).max(1).optional(),
});

export type WordTimestamp = z.infer<typeof WordTimestampSchema>;

/**
 * TTS Response - matches lib/engine/tts.ts TTSResponse
 */
export const TTSResponseSchema = z.object({
  success: z.boolean(),
  jobId: z.string(),
  audioBuffer: z.instanceof(Buffer).optional(), // Not serialized over API
  audioUrl: z.string(),
  audioBase64: z.string().optional(),
  mimeType: z.string(),
  duration: z.number().positive(),
  providerUsed: z.string(),
  language: z.string(),
  voiceId: z.string(),
  voiceUsed: z.string(),
  format: z.enum(['mp3', 'wav', 'ogg']),
  characterCount: z.number().int().nonnegative(),
  metadata: z.object({
    isDryRun: z.boolean(),
    speakingRate: z.number(),
    providerAttempts: z.array(ProviderAttemptLogSchema),
    generatedAt: z.string().datetime(),
    region: z.string().optional(),
    voiceConfig: z.string().optional(),
    model: z.string().optional(),
  }).passthrough(),
  error: z.string().optional(),
  // Word-level timestamps for karaoke (optional, provider-dependent)
  wordTimestamps: z.array(WordTimestampSchema).optional(),
});

export type TTSResponse = z.infer<typeof TTSResponseSchema>;

/**
 * TTS Voice Option for catalog
 */
export const TTSVoiceOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: TTSProviderSchema,
  language: SupportedLanguageSchema,
  gender: VoiceGenderSchema,
  description: z.string().optional(),
  sampleUrl: z.string().url().optional(),
  previewText: z.string().optional(),
});

export type TTSVoiceOption = z.infer<typeof TTSVoiceOptionSchema>;

/**
 * Resolved voice provider key
 */
export const ResolvedVoiceKeySchema = z.object({
  apiKey: z.string().optional(),
  source: z.enum(['request', 'database', 'environment', 'none']),
  providerCanonical: z.string(),
});

export type ResolvedVoiceKey = z.infer<typeof ResolvedVoiceKeySchema>;

/**
 * Validation helpers
 */
export function validateTTSRequest(data: unknown): TTSRequest {
  return TTSRequestSchema.parse(data);
}

export function safeParseTTSRequest(data: unknown): { success: true; data: TTSRequest } | { success: false; error: z.ZodError } {
  const result = TTSRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}