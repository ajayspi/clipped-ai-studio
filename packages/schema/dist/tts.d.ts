import { z } from 'zod';
/**
 * TTS Request - matches lib/engine/tts.ts TTSRequest
 */
export declare const TTSRequestSchema: z.ZodObject<{
    text: z.ZodString;
    language: z.ZodOptional<z.ZodEnum<["en-US", "en-IN", "hi-IN", "ta-IN", "te-IN", "kn-IN", "bn-IN", "mr-IN"]>>;
    provider: z.ZodOptional<z.ZodEnum<["omniroute", "azure", "openai", "elevenlabs", "google", "coqui", "keyless", "mock", "auto"]>>;
    voice: z.ZodOptional<z.ZodString>;
    voiceId: z.ZodOptional<z.ZodString>;
    gender: z.ZodOptional<z.ZodEnum<["male", "female", "neutral"]>>;
    speed: z.ZodDefault<z.ZodNumber>;
    speakingRate: z.ZodDefault<z.ZodNumber>;
    pitch: z.ZodDefault<z.ZodNumber>;
    volume: z.ZodDefault<z.ZodNumber>;
    volumeGainDb: z.ZodDefault<z.ZodNumber>;
    audioFormat: z.ZodDefault<z.ZodEnum<["mp3", "wav", "ogg"]>>;
    mock: z.ZodDefault<z.ZodBoolean>;
    apiKey: z.ZodOptional<z.ZodString>;
    region: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    mock: boolean;
    text: string;
    speed: number;
    speakingRate: number;
    pitch: number;
    volume: number;
    volumeGainDb: number;
    audioFormat: "mp3" | "wav" | "ogg";
    voice?: string | undefined;
    language?: "en-US" | "en-IN" | "hi-IN" | "ta-IN" | "te-IN" | "kn-IN" | "bn-IN" | "mr-IN" | undefined;
    provider?: "auto" | "omniroute" | "azure" | "openai" | "elevenlabs" | "google" | "coqui" | "keyless" | "mock" | undefined;
    voiceId?: string | undefined;
    gender?: "male" | "female" | "neutral" | undefined;
    apiKey?: string | undefined;
    region?: string | undefined;
    model?: string | undefined;
}, {
    text: string;
    mock?: boolean | undefined;
    voice?: string | undefined;
    language?: "en-US" | "en-IN" | "hi-IN" | "ta-IN" | "te-IN" | "kn-IN" | "bn-IN" | "mr-IN" | undefined;
    provider?: "auto" | "omniroute" | "azure" | "openai" | "elevenlabs" | "google" | "coqui" | "keyless" | "mock" | undefined;
    voiceId?: string | undefined;
    gender?: "male" | "female" | "neutral" | undefined;
    speed?: number | undefined;
    speakingRate?: number | undefined;
    pitch?: number | undefined;
    volume?: number | undefined;
    volumeGainDb?: number | undefined;
    audioFormat?: "mp3" | "wav" | "ogg" | undefined;
    apiKey?: string | undefined;
    region?: string | undefined;
    model?: string | undefined;
}>;
export type TTSRequest = z.infer<typeof TTSRequestSchema>;
/**
 * Provider attempt log for fallback tracking
 */
export declare const ProviderAttemptLogSchema: z.ZodObject<{
    provider: z.ZodString;
    status: z.ZodEnum<["success", "failed", "skipped"]>;
    error: z.ZodOptional<z.ZodString>;
    latencyMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "failed" | "success" | "skipped";
    provider: string;
    error?: string | undefined;
    latencyMs?: number | undefined;
}, {
    status: "failed" | "success" | "skipped";
    provider: string;
    error?: string | undefined;
    latencyMs?: number | undefined;
}>;
export type ProviderAttemptLog = z.infer<typeof ProviderAttemptLogSchema>;
/**
 * Word-level timestamp for karaoke subtitles
 */
export declare const WordTimestampSchema: z.ZodObject<{
    word: z.ZodString;
    start: z.ZodNumber;
    end: z.ZodNumber;
    confidence: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    word: string;
    start: number;
    end: number;
    confidence?: number | undefined;
}, {
    word: string;
    start: number;
    end: number;
    confidence?: number | undefined;
}>;
export type WordTimestamp = z.infer<typeof WordTimestampSchema>;
/**
 * TTS Response - matches lib/engine/tts.ts TTSResponse
 */
export declare const TTSResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    jobId: z.ZodString;
    audioBuffer: z.ZodOptional<z.ZodType<Buffer<ArrayBufferLike>, z.ZodTypeDef, Buffer<ArrayBufferLike>>>;
    audioUrl: z.ZodString;
    audioBase64: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodString;
    duration: z.ZodNumber;
    providerUsed: z.ZodString;
    language: z.ZodString;
    voiceId: z.ZodString;
    voiceUsed: z.ZodString;
    format: z.ZodEnum<["mp3", "wav", "ogg"]>;
    characterCount: z.ZodNumber;
    metadata: z.ZodObject<{
        isDryRun: z.ZodBoolean;
        speakingRate: z.ZodNumber;
        providerAttempts: z.ZodArray<z.ZodObject<{
            provider: z.ZodString;
            status: z.ZodEnum<["success", "failed", "skipped"]>;
            error: z.ZodOptional<z.ZodString>;
            latencyMs: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            status: "failed" | "success" | "skipped";
            provider: string;
            error?: string | undefined;
            latencyMs?: number | undefined;
        }, {
            status: "failed" | "success" | "skipped";
            provider: string;
            error?: string | undefined;
            latencyMs?: number | undefined;
        }>, "many">;
        generatedAt: z.ZodString;
        region: z.ZodOptional<z.ZodString>;
        voiceConfig: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        isDryRun: z.ZodBoolean;
        speakingRate: z.ZodNumber;
        providerAttempts: z.ZodArray<z.ZodObject<{
            provider: z.ZodString;
            status: z.ZodEnum<["success", "failed", "skipped"]>;
            error: z.ZodOptional<z.ZodString>;
            latencyMs: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            status: "failed" | "success" | "skipped";
            provider: string;
            error?: string | undefined;
            latencyMs?: number | undefined;
        }, {
            status: "failed" | "success" | "skipped";
            provider: string;
            error?: string | undefined;
            latencyMs?: number | undefined;
        }>, "many">;
        generatedAt: z.ZodString;
        region: z.ZodOptional<z.ZodString>;
        voiceConfig: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        isDryRun: z.ZodBoolean;
        speakingRate: z.ZodNumber;
        providerAttempts: z.ZodArray<z.ZodObject<{
            provider: z.ZodString;
            status: z.ZodEnum<["success", "failed", "skipped"]>;
            error: z.ZodOptional<z.ZodString>;
            latencyMs: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            status: "failed" | "success" | "skipped";
            provider: string;
            error?: string | undefined;
            latencyMs?: number | undefined;
        }, {
            status: "failed" | "success" | "skipped";
            provider: string;
            error?: string | undefined;
            latencyMs?: number | undefined;
        }>, "many">;
        generatedAt: z.ZodString;
        region: z.ZodOptional<z.ZodString>;
        voiceConfig: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    error: z.ZodOptional<z.ZodString>;
    wordTimestamps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        word: z.ZodString;
        start: z.ZodNumber;
        end: z.ZodNumber;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        word: string;
        start: number;
        end: number;
        confidence?: number | undefined;
    }, {
        word: string;
        start: number;
        end: number;
        confidence?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    duration: number;
    language: string;
    voiceId: string;
    success: boolean;
    jobId: string;
    audioUrl: string;
    mimeType: string;
    providerUsed: string;
    voiceUsed: string;
    format: "mp3" | "wav" | "ogg";
    characterCount: number;
    metadata: {
        speakingRate: number;
        isDryRun: boolean;
        providerAttempts: {
            status: "failed" | "success" | "skipped";
            provider: string;
            error?: string | undefined;
            latencyMs?: number | undefined;
        }[];
        generatedAt: string;
        region?: string | undefined;
        model?: string | undefined;
        voiceConfig?: string | undefined;
    } & {
        [k: string]: unknown;
    };
    wordTimestamps?: {
        word: string;
        start: number;
        end: number;
        confidence?: number | undefined;
    }[] | undefined;
    error?: string | undefined;
    audioBuffer?: Buffer<ArrayBufferLike> | undefined;
    audioBase64?: string | undefined;
}, {
    duration: number;
    language: string;
    voiceId: string;
    success: boolean;
    jobId: string;
    audioUrl: string;
    mimeType: string;
    providerUsed: string;
    voiceUsed: string;
    format: "mp3" | "wav" | "ogg";
    characterCount: number;
    metadata: {
        speakingRate: number;
        isDryRun: boolean;
        providerAttempts: {
            status: "failed" | "success" | "skipped";
            provider: string;
            error?: string | undefined;
            latencyMs?: number | undefined;
        }[];
        generatedAt: string;
        region?: string | undefined;
        model?: string | undefined;
        voiceConfig?: string | undefined;
    } & {
        [k: string]: unknown;
    };
    wordTimestamps?: {
        word: string;
        start: number;
        end: number;
        confidence?: number | undefined;
    }[] | undefined;
    error?: string | undefined;
    audioBuffer?: Buffer<ArrayBufferLike> | undefined;
    audioBase64?: string | undefined;
}>;
export type TTSResponse = z.infer<typeof TTSResponseSchema>;
/**
 * TTS Voice Option for catalog
 */
export declare const TTSVoiceOptionSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    provider: z.ZodEnum<["omniroute", "azure", "openai", "elevenlabs", "google", "coqui", "keyless", "mock", "auto"]>;
    language: z.ZodEnum<["en-US", "en-IN", "hi-IN", "ta-IN", "te-IN", "kn-IN", "bn-IN", "mr-IN"]>;
    gender: z.ZodEnum<["male", "female", "neutral"]>;
    description: z.ZodOptional<z.ZodString>;
    sampleUrl: z.ZodOptional<z.ZodString>;
    previewText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    language: "en-US" | "en-IN" | "hi-IN" | "ta-IN" | "te-IN" | "kn-IN" | "bn-IN" | "mr-IN";
    provider: "auto" | "omniroute" | "azure" | "openai" | "elevenlabs" | "google" | "coqui" | "keyless" | "mock";
    gender: "male" | "female" | "neutral";
    name: string;
    description?: string | undefined;
    sampleUrl?: string | undefined;
    previewText?: string | undefined;
}, {
    id: string;
    language: "en-US" | "en-IN" | "hi-IN" | "ta-IN" | "te-IN" | "kn-IN" | "bn-IN" | "mr-IN";
    provider: "auto" | "omniroute" | "azure" | "openai" | "elevenlabs" | "google" | "coqui" | "keyless" | "mock";
    gender: "male" | "female" | "neutral";
    name: string;
    description?: string | undefined;
    sampleUrl?: string | undefined;
    previewText?: string | undefined;
}>;
export type TTSVoiceOption = z.infer<typeof TTSVoiceOptionSchema>;
/**
 * Resolved voice provider key
 */
export declare const ResolvedVoiceKeySchema: z.ZodObject<{
    apiKey: z.ZodOptional<z.ZodString>;
    source: z.ZodEnum<["request", "database", "environment", "none"]>;
    providerCanonical: z.ZodString;
}, "strip", z.ZodTypeAny, {
    source: "request" | "database" | "environment" | "none";
    providerCanonical: string;
    apiKey?: string | undefined;
}, {
    source: "request" | "database" | "environment" | "none";
    providerCanonical: string;
    apiKey?: string | undefined;
}>;
export type ResolvedVoiceKey = z.infer<typeof ResolvedVoiceKeySchema>;
/**
 * Validation helpers
 */
export declare function validateTTSRequest(data: unknown): TTSRequest;
export declare function safeParseTTSRequest(data: unknown): {
    success: true;
    data: TTSRequest;
} | {
    success: false;
    error: z.ZodError;
};
//# sourceMappingURL=tts.d.ts.map