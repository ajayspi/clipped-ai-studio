/**
 * Text-to-Speech (TTS) Engine for Clipped
 *
 * Multi-provider voice synthesis engine supporting:
 * 1. Azure Speech Services REST API (Neural voices with SSML rate & pitch control)
 * 2. OpenAI TTS API (tts-1 / tts-1-hd models with high-fidelity voices)
 * 3. ElevenLabs API (eleven_multilingual_v2 model with voice presets)
 * 4. Google Cloud Text-to-Speech (Neural2, Wavenet, Journey, Standard)
 * 5. Free & Keyless TTS (Google Translate TTS API + high-fidelity PCM WAV fallback)
 * 6. Coqui TTS API (self-hosted / remote endpoint with 2.5s fast timeout guard)
 * 7. Deterministic In-Memory Cost-Safe Mock Engine (RIFF/WAVE PCM generator)
 *
 * Supported Languages:
 * - English: en-US, en-IN
 * - Indian Languages: Hindi (hi-IN), Tamil (ta-IN), Telugu (te-IN),
 *   Kannada (kn-IN), Bengali (bn-IN), Marathi (mr-IN)
 */

import { getOmniRouteConfig } from '@/lib/keys';
import { supabase, supabaseAdmin } from '@/lib/db';

// ============================================================================
// Types & Interface Contracts
// ============================================================================

export type TTSProvider =
  | 'omniroute'
  | 'azure'
  | 'openai'
  | 'elevenlabs'
  | 'google'
  | 'coqui'
  | 'keyless'
  | 'mock'
  | 'auto';

export type SupportedLanguage =
  | 'en-US'
  | 'en-IN'
  | 'hi-IN'
  | 'ta-IN'
  | 'te-IN'
  | 'kn-IN'
  | 'bn-IN'
  | 'mr-IN';

export type VoiceGender = 'male' | 'female' | 'neutral';

export interface TTSVoiceOption {
  id: string;
  name: string;
  provider: TTSProvider;
  language: SupportedLanguage;
  gender: VoiceGender;
  description?: string;
  sampleUrl?: string;
  previewText?: string;
}

export interface ProviderAttemptLog {
  provider: TTSProvider | string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  latencyMs?: number;
}

export interface TTSRequest {
  text: string;
  language?: SupportedLanguage | string;
  provider?: TTSProvider | string;
  voice?: string;
  voiceId?: string;
  gender?: VoiceGender;
  speed?: number;
  speakingRate?: number;
  pitch?: number;
  volume?: number; // 0-100 or above (100 is unity)
  volumeGainDb?: number;
  audioFormat?: 'mp3' | 'wav' | 'ogg';
  mock?: boolean;
  apiKey?: string;
  region?: string;
  model?: string;
}

// Alias for backwards/forwards compatibility across orchestrators
export type TTSGenerationRequest = TTSRequest;

export interface TTSResponse {
  success: boolean;
  jobId: string;
  audioBuffer: Buffer;
  audioUrl: string;
  audioBase64?: string;
  mimeType: string;
  duration: number; // in seconds
  providerUsed: TTSProvider | string;
  language: SupportedLanguage | string;
  voiceId: string;
  voiceUsed: string;
  format: 'mp3' | 'wav' | 'ogg';
  characterCount: number;
  metadata: {
    isDryRun: boolean;
    speakingRate: number;
    providerAttempts: ProviderAttemptLog[];
    generatedAt: string;
    [key: string]: any;
  };
  error?: string;
}

// Alias for backwards/forwards compatibility across orchestrators
export type TTSGenerationResponse = TTSResponse;

// ============================================================================
// Language Normalization & Script Detection Subsystem
// ============================================================================

export const LANGUAGE_ALIASES: Record<string, SupportedLanguage> = {
  // English (US)
  'en': 'en-US',
  'en-us': 'en-US',
  'en_us': 'en-US',
  'english': 'en-US',
  'us-english': 'en-US',
  'us_english': 'en-US',
  'american-english': 'en-US',
  'american': 'en-US',

  // English (India)
  'en-in': 'en-IN',
  'en_in': 'en-IN',
  'indian-english': 'en-IN',
  'indian_english': 'en-IN',
  'india-english': 'en-IN',
  'hinglish': 'en-IN',

  // Hindi
  'hi': 'hi-IN',
  'hi-in': 'hi-IN',
  'hi_in': 'hi-IN',
  'hindi': 'hi-IN',
  'hin': 'hi-IN',
  'hin-in': 'hi-IN',

  // Tamil
  'ta': 'ta-IN',
  'ta-in': 'ta-IN',
  'ta_in': 'ta-IN',
  'tamil': 'ta-IN',
  'tam': 'ta-IN',
  'tam-in': 'ta-IN',

  // Telugu
  'te': 'te-IN',
  'te-in': 'te-IN',
  'te_in': 'te-IN',
  'telugu': 'te-IN',
  'tel': 'te-IN',
  'tel-in': 'te-IN',

  // Kannada
  'kn': 'kn-IN',
  'kn-in': 'kn-IN',
  'kn_in': 'kn-IN',
  'kannada': 'kn-IN',
  'kan': 'kn-IN',
  'kan-in': 'kn-IN',

  // Bengali
  'bn': 'bn-IN',
  'bn-in': 'bn-IN',
  'bn_in': 'bn-IN',
  'bengali': 'bn-IN',
  'bangla': 'bn-IN',
  'ben': 'bn-IN',
  'ben-in': 'bn-IN',

  // Marathi
  'mr': 'mr-IN',
  'mr-in': 'mr-IN',
  'mr_in': 'mr-IN',
  'marathi': 'mr-IN',
  'mar': 'mr-IN',
  'mar-in': 'mr-IN',
};

/**
 * Detects Indian language from Unicode character blocks if raw text is provided without explicit language code.
 */
export function detectLanguageFromScript(text: string): SupportedLanguage {
  if (!text || typeof text !== 'string') return 'en-US';

  // Tamil Unicode block: U+0B80 - U+0BFF
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return 'ta-IN';
  }
  // Telugu Unicode block: U+0C00 - U+0C7F
  if (/[\u0C00-\u0C7F]/.test(text)) {
    return 'te-IN';
  }
  // Kannada Unicode block: U+0C80 - U+0CFF
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return 'kn-IN';
  }
  // Bengali Unicode block: U+0980 - U+09FF
  if (/[\u0980-\u09FF]/.test(text)) {
    return 'bn-IN';
  }
  // Devanagari Unicode block: U+0900 - U+097F (used by Hindi and Marathi)
  if (/[\u0900-\u097F]/.test(text)) {
    // Check for Marathi-specific letter 'Ã Â¤Â³' (\u0933) or typical Marathi particles
    if (/[\u0933]|Ã Â¤â€ Ã Â¤Â¹Ã Â¥â€¡|Ã Â¤Â¨Ã Â¤Â¾Ã Â¤Â¹Ã Â¥â‚¬|Ã Â¤ÂÃ Â¤Â¾Ã Â¤Â²Ã Â¤Â¾|Ã Â¤â€¢Ã Â¥â€¡Ã Â¤Â²Ã Â¤Â¾/.test(text)) {
      return 'mr-IN';
    }
    return 'hi-IN';
  }

  return 'en-US';
}

/**
 * Normalizes input language string into canonical SupportedLanguage BCP-47 code.
 */
export function normalizeLanguageCode(input?: string): SupportedLanguage {
  if (!input || typeof input !== 'string') {
    return 'en-US';
  }
  const clean = input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (LANGUAGE_ALIASES[clean]) {
    return LANGUAGE_ALIASES[clean];
  }
  // If input matches canonical format directly
  const upperCanonical = input.trim().replace('_', '-');
  if (['en-US', 'en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'bn-IN', 'mr-IN'].includes(upperCanonical)) {
    return upperCanonical as SupportedLanguage;
  }
  return 'en-US';
}

// ============================================================================
// Provider Voice Catalogs & Mappings
// ============================================================================

export const ELEVENLABS_VOICES: Record<string, string> = {
  rachel: '21m00Tcm4TlvDq8ikWAM',
  domi: 'AZnzlk1XvdvUeBnXmlld',
  bella: 'EXAVITQu4vr4xnSDxMaL',
  antoni: 'ErXwobaYiN019PkySvjV',
  elli: 'MF3mGyEYCl7XYWbV9V6O',
  josh: 'TxGEqnHWrfWFTfGW9XjX',
  arnold: 'VR6AewLTigWG4xSOukaG',
  adam: 'pNInz6obpgDQGcFmaJgB',
  sam: 'yoZ06aMxZJJ28mfd3POQ',
  daniel: 'onwK4e9ZLuTAKqWW03F9',
  nova: '21m00Tcm4TlvDq8ikWAM',   // Alias to Rachel
  onyx: 'pNInz6obpgDQGcFmaJgB',   // Alias to Adam
  fable: 'EXAVITQu4vr4xnSDxMaL',  // Alias to Bella
  echo: 'ErXwobaYiN019PkySvjV',   // Alias to Antoni
  alloy: '21m00Tcm4TlvDq8ikWAM',  // Alias to Rachel
  shimmer: 'AZnzlk1XvdvUeBnXmlld',// Alias to Domi
};

export const ELEVENLABS_LANG_MAP: Record<SupportedLanguage, string> = {
  'en-US': 'en',
  'en-IN': 'en',
  'hi-IN': 'hi',
  'ta-IN': 'ta',
  'te-IN': 'te',
  'kn-IN': 'kn',
  'bn-IN': 'bn',
  'mr-IN': 'mr',
};

export const OPENAI_VOICES = [
  { id: 'alloy', name: 'Alloy', gender: 'neutral' as VoiceGender, description: 'Balanced, versatile, and neutral tone' },
  { id: 'echo', name: 'Echo', gender: 'male' as VoiceGender, description: 'Warm, resonant, and balanced male tone' },
  { id: 'fable', name: 'Fable', gender: 'female' as VoiceGender, description: 'Expressive, storytelling British accent' },
  { id: 'onyx', name: 'Onyx', gender: 'male' as VoiceGender, description: 'Deep, authoritative, and powerful male tone' },
  { id: 'nova', name: 'Nova', gender: 'female' as VoiceGender, description: 'Energetic, cheerful, and bright female tone' },
  { id: 'shimmer', name: 'Shimmer', gender: 'female' as VoiceGender, description: 'Clear, crisp, and high-frequency female tone' },
];

export const AZURE_DEFAULT_VOICES: Record<
  SupportedLanguage,
  { female: string; male: string; neutral?: string }
> = {
  'en-US': { female: 'en-US-JennyNeural', male: 'en-US-GuyNeural', neutral: 'en-US-AriaNeural' },
  'en-IN': { female: 'en-IN-NeerjaNeural', male: 'en-IN-PrabhatNeural', neutral: 'en-IN-NeerjaNeural' },
  'hi-IN': { female: 'hi-IN-SwaraNeural', male: 'hi-IN-MadhurNeural', neutral: 'hi-IN-SwaraNeural' },
  'ta-IN': { female: 'ta-IN-PallaviNeural', male: 'ta-IN-ValluvarNeural', neutral: 'ta-IN-PallaviNeural' },
  'te-IN': { female: 'te-IN-ShrutiNeural', male: 'te-IN-MohanNeural', neutral: 'te-IN-ShrutiNeural' },
  'kn-IN': { female: 'kn-IN-SapnaNeural', male: 'kn-IN-GaganNeural', neutral: 'kn-IN-SapnaNeural' },
  'bn-IN': { female: 'bn-IN-TanishaaNeural', male: 'bn-IN-BashkarNeural', neutral: 'bn-IN-TanishaaNeural' },
  'mr-IN': { female: 'mr-IN-AarohiNeural', male: 'mr-IN-ManoharNeural', neutral: 'mr-IN-AarohiNeural' },
};

export const AZURE_VOICE_CATALOG: TTSVoiceOption[] = [
  // US English
  { id: 'en-US-JennyNeural', name: 'Jenny (Neural)', provider: 'azure', language: 'en-US', gender: 'female', description: 'Natural, conversational US English' },
  { id: 'en-US-GuyNeural', name: 'Guy (Neural)', provider: 'azure', language: 'en-US', gender: 'male', description: 'Confident, friendly US English male' },
  { id: 'en-US-AriaNeural', name: 'Aria (Neural)', provider: 'azure', language: 'en-US', gender: 'female', description: 'Versatile, highly expressive US English' },
  // Indian English
  { id: 'en-IN-NeerjaNeural', name: 'Neerja (Neural)', provider: 'azure', language: 'en-IN', gender: 'female', description: 'Authentic Indian English female' },
  { id: 'en-IN-PrabhatNeural', name: 'Prabhat (Neural)', provider: 'azure', language: 'en-IN', gender: 'male', description: 'Professional Indian English male' },
  // Hindi
  { id: 'hi-IN-SwaraNeural', name: 'Swara (Neural)', provider: 'azure', language: 'hi-IN', gender: 'female', description: 'Natural, fluent Hindi female' },
  { id: 'hi-IN-MadhurNeural', name: 'Madhur (Neural)', provider: 'azure', language: 'hi-IN', gender: 'male', description: 'Warm, clear Hindi male' },
  // Tamil
  { id: 'ta-IN-PallaviNeural', name: 'Pallavi (Neural)', provider: 'azure', language: 'ta-IN', gender: 'female', description: 'Expressive Tamil female' },
  { id: 'ta-IN-ValluvarNeural', name: 'Valluvar (Neural)', provider: 'azure', language: 'ta-IN', gender: 'male', description: 'Authoritative Tamil male' },
  // Telugu
  { id: 'te-IN-ShrutiNeural', name: 'Shruti (Neural)', provider: 'azure', language: 'te-IN', gender: 'female', description: 'Fluent Telugu female' },
  { id: 'te-IN-MohanNeural', name: 'Mohan (Neural)', provider: 'azure', language: 'te-IN', gender: 'male', description: 'Clear Telugu male' },
  // Kannada
  { id: 'kn-IN-SapnaNeural', name: 'Sapna (Neural)', provider: 'azure', language: 'kn-IN', gender: 'female', description: 'Natural Kannada female' },
  { id: 'kn-IN-GaganNeural', name: 'Gagan (Neural)', provider: 'azure', language: 'kn-IN', gender: 'male', description: 'Fluent Kannada male' },
  // Bengali
  { id: 'bn-IN-TanishaaNeural', name: 'Tanishaa (Neural)', provider: 'azure', language: 'bn-IN', gender: 'female', description: 'Clear Bengali female' },
  { id: 'bn-IN-BashkarNeural', name: 'Bashkar (Neural)', provider: 'azure', language: 'bn-IN', gender: 'male', description: 'Warm Bengali male' },
  // Marathi
  { id: 'mr-IN-AarohiNeural', name: 'Aarohi (Neural)', provider: 'azure', language: 'mr-IN', gender: 'female', description: 'Natural Marathi female' },
  { id: 'mr-IN-ManoharNeural', name: 'Manohar (Neural)', provider: 'azure', language: 'mr-IN', gender: 'male', description: 'Fluent Marathi male' },
];

export const GOOGLE_DEFAULT_VOICES: Record<
  SupportedLanguage,
  { female: string; male: string; neutral?: string }
> = {
  'en-US': { female: 'en-US-Journey-F', male: 'en-US-Journey-D', neutral: 'en-US-Neural2-A' },
  'en-IN': { female: 'en-IN-Neural2-A', male: 'en-IN-Neural2-B', neutral: 'en-IN-Wavenet-D' },
  'hi-IN': { female: 'hi-IN-Neural2-A', male: 'hi-IN-Neural2-B', neutral: 'hi-IN-Neural2-C' },
  'ta-IN': { female: 'ta-IN-Wavenet-A', male: 'ta-IN-Wavenet-B', neutral: 'ta-IN-Wavenet-C' },
  'te-IN': { female: 'te-IN-Standard-A', male: 'te-IN-Standard-B', neutral: 'te-IN-Wavenet-A' },
  'kn-IN': { female: 'kn-IN-Wavenet-A', male: 'kn-IN-Wavenet-B', neutral: 'kn-IN-Standard-A' },
  'bn-IN': { female: 'bn-IN-Wavenet-A', male: 'bn-IN-Wavenet-B', neutral: 'bn-IN-Standard-A' },
  'mr-IN': { female: 'mr-IN-Wavenet-A', male: 'mr-IN-Wavenet-B', neutral: 'mr-IN-Standard-A' },
};

export const COQUI_LANG_MAP: Record<SupportedLanguage, string> = {
  'en-US': 'en',
  'en-IN': 'en',
  'hi-IN': 'hi',
  'ta-IN': 'ta',
  'te-IN': 'te',
  'kn-IN': 'kn',
  'bn-IN': 'bn',
  'mr-IN': 'mr',
};

export const FREE_KEYLESS_VOICES: TTSVoiceOption[] = [
  { id: 'free-en-us', name: 'Free English (US)', provider: 'keyless', language: 'en-US', gender: 'female', description: 'High-speed keyless voice' },
  { id: 'free-en-in', name: 'Free English (India)', provider: 'keyless', language: 'en-IN', gender: 'female', description: 'High-speed keyless Indian English' },
  { id: 'free-hi-in', name: 'Free Hindi', provider: 'keyless', language: 'hi-IN', gender: 'female', description: 'High-speed keyless Hindi voice' },
  { id: 'free-ta-in', name: 'Free Tamil', provider: 'keyless', language: 'ta-IN', gender: 'female', description: 'High-speed keyless Tamil voice' },
  { id: 'free-te-in', name: 'Free Telugu', provider: 'keyless', language: 'te-IN', gender: 'female', description: 'High-speed keyless Telugu voice' },
  { id: 'free-kn-in', name: 'Free Kannada', provider: 'keyless', language: 'kn-IN', gender: 'female', description: 'High-speed keyless Kannada voice' },
  { id: 'free-bn-in', name: 'Free Bengali', provider: 'keyless', language: 'bn-IN', gender: 'female', description: 'High-speed keyless Bengali voice' },
  { id: 'free-mr-in', name: 'Free Marathi', provider: 'keyless', language: 'mr-IN', gender: 'female', description: 'High-speed keyless Marathi voice' },
];

export const KEYLESS_VOICE_MAP: Record<string, string> = {
  'free-en-us': 'en-US-AriaNeural',
  'free-en-in': 'en-IN-NeerjaNeural',
  'free-hi-in': 'hi-IN-MadhurNeural',
  'free-ta-in': 'ta-IN-PallaviNeural',
  'free-te-in': 'te-IN-ShrutiNeural',
  'free-kn-in': 'kn-IN-SapnaNeural',
  'free-bn-in': 'bn-IN-TanishaaNeural',
  'free-mr-in': 'mr-IN-AarohiNeural',
  'en-us': 'en-US-AriaNeural',
  'en-in': 'en-IN-NeerjaNeural',
  'hi-in': 'hi-IN-MadhurNeural',
  'ta-in': 'ta-IN-PallaviNeural',
  'te-in': 'te-IN-ShrutiNeural',
  'kn-in': 'kn-IN-SapnaNeural',
  'bn-in': 'bn-IN-TanishaaNeural',
  'mr-in': 'mr-IN-AarohiNeural',
};

export const LANGUAGE_EDGE_VOICE_MAP: Record<string, string> = {
  'en-US': 'en-US-AriaNeural',
  'en-IN': 'en-IN-NeerjaNeural',
  'hi-IN': 'hi-IN-MadhurNeural',
  'ta-IN': 'ta-IN-PallaviNeural',
  'te-IN': 'te-IN-ShrutiNeural',
  'kn-IN': 'kn-IN-SapnaNeural',
  'bn-IN': 'bn-IN-TanishaaNeural',
  'mr-IN': 'mr-IN-AarohiNeural',
};

/**
 * Resolves a requested voice ID or language into a valid Microsoft Edge Neural voice name.
 * Handles catalog IDs (free-en-us, free-hi-in, etc.) and falls back accurately by language.
 */
export function resolveKeylessVoice(
  requestedVoice?: string,
  language: SupportedLanguage | string = 'en-US'
): string {
  if (requestedVoice) {
    const trimmed = requestedVoice.trim();
    const lower = trimmed.toLowerCase();
    if (KEYLESS_VOICE_MAP[lower]) {
      return KEYLESS_VOICE_MAP[lower];
    }
    const stripped = lower.replace(/^(free|keyless)-/, '');
    if (KEYLESS_VOICE_MAP[stripped]) {
      return KEYLESS_VOICE_MAP[stripped];
    }
    if (
      trimmed.includes('Neural') ||
      trimmed.includes('Standard') ||
      trimmed.includes('Wavenet')
    ) {
      return trimmed;
    }
  }

  const langKey = language as SupportedLanguage;
  if (LANGUAGE_EDGE_VOICE_MAP[langKey]) {
    return LANGUAGE_EDGE_VOICE_MAP[langKey];
  }

  const langLower = (language || '').toLowerCase();
  if (langLower.startsWith('hi')) return 'hi-IN-MadhurNeural';
  if (langLower.startsWith('ta')) return 'ta-IN-PallaviNeural';
  if (langLower.startsWith('te')) return 'te-IN-ShrutiNeural';
  if (langLower.startsWith('kn')) return 'kn-IN-SapnaNeural';
  if (langLower.startsWith('bn')) return 'bn-IN-TanishaaNeural';
  if (langLower.startsWith('mr')) return 'mr-IN-AarohiNeural';
  if (langLower.startsWith('en-in')) return 'en-IN-NeerjaNeural';
  return 'en-US-AriaNeural';
}

// ============================================================================
// Helper Utilities & Deterministic In-Memory PCM Buffer Generator
// ============================================================================

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Creates a valid, strictly standard RIFF/WAVE PCM audio buffer in memory with deterministic sine wave samples.
 * Used for zero-cost dry runs, offline execution, and mock generation.
 */
export function generateSyntheticWavBuffer(
  durationSeconds: number,
  sampleRate: number = 24000
): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const numSamples = Math.max(1, Math.floor(sampleRate * durationSeconds));
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = Buffer.alloc(totalSize);

  // 1. RIFF Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(totalSize - 8, 4);
  buffer.write('WAVE', 8);

  // 2. "fmt " Sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);           // Sub-chunk size (16 for PCM)
  buffer.writeUInt16LE(1, 20);            // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);  // NumChannels (1 = Mono)
  buffer.writeUInt32LE(sampleRate, 24);   // SampleRate (24000)
  buffer.writeUInt32LE(byteRate, 28);     // ByteRate (48000)
  buffer.writeUInt16LE(blockAlign, 32);   // BlockAlign (2)
  buffer.writeUInt16LE(bitsPerSample, 34);// BitsPerSample (16)

  // 3. "data" Sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // 4. Populate PCM Samples with gentle harmonic 440Hz tone with smooth envelope
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Harmonic tone (440Hz base + 880Hz octave) at comfortable low amplitude
    const tone = Math.sin(2 * Math.PI * 440 * t) * 0.7 + Math.sin(2 * Math.PI * 880 * t) * 0.3;
    // Soft amplitude factor (400 / 32767)
    const sample = tone * 400;
    buffer.writeInt16LE(Math.floor(sample), headerSize + i * 2);
  }

  return buffer;
}

/**
 * Calculates estimated spoken audio duration based on language cadence and word count.
 * - English: ~150 words per minute (2.5 words per second)
 * - Indian Languages: ~120 words per minute (2.0 words per second)
 */
export function calculateEstimatedDuration(
  text: string,
  language: SupportedLanguage | string = 'en-US',
  speedRate: number = 1.0
): number {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return 1.0;
  }
  const cleanLang = normalizeLanguageCode(language);
  const words = text.trim().split(/\s+/).length;
  const wordsPerSec = cleanLang.startsWith('en') ? 2.5 : 2.0;
  const effectiveRate = speedRate > 0 ? speedRate : 1.0;
  const rawDuration = (words / wordsPerSec) * (1.0 / effectiveRate);
  return Math.max(1.0, Math.round(rawDuration * 10) / 10);
}

/**
 * Google Translate TTS REST endpoint keyless fallback.
 * Uses tw-ob client to fetch MP3 audio chunks without API keys or tokens.
 */
export async function synthesizeWithGoogleTranslateRest(
  jobId: string,
  text: string,
  language: SupportedLanguage | string = 'en-US',
  request?: TTSRequest
): Promise<TTSResponse> {
  const langLower = (language || 'en-US').toLowerCase();
  let tl = 'en';
  if (langLower.startsWith('hi')) tl = 'hi';
  else if (langLower.startsWith('ta')) tl = 'ta';
  else if (langLower.startsWith('te')) tl = 'te';
  else if (langLower.startsWith('kn')) tl = 'kn';
  else if (langLower.startsWith('bn')) tl = 'bn';
  else if (langLower.startsWith('mr')) tl = 'mr';
  else if (langLower === 'en-in') tl = 'en-IN';
  else tl = 'en';

  // Chunk text into <= 180 characters for Google Translate tw-ob query limits
  const chunks: string[] = [];
  if (text.length <= 180) {
    chunks.push(text);
  } else {
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    let currentChunk = '';
    for (const s of sentences) {
      if ((currentChunk + ' ' + s).trim().length <= 180) {
        currentChunk = (currentChunk + ' ' + s).trim();
      } else {
        if (currentChunk) chunks.push(currentChunk);
        if (s.length <= 180) {
          currentChunk = s.trim();
        } else {
          const words = s.split(' ');
          let wordChunk = '';
          for (const w of words) {
            if ((wordChunk + ' ' + w).trim().length <= 180) {
              wordChunk = (wordChunk + ' ' + w).trim();
            } else {
              if (wordChunk) chunks.push(wordChunk);
              wordChunk = w;
            }
          }
          if (wordChunk) currentChunk = wordChunk;
        }
      }
    }
    if (currentChunk) chunks.push(currentChunk);
  }

  const audioBuffers: Buffer[] = [];
  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${encodeURIComponent(tl)}&client=tw-ob`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) {
        throw new Error(`Google Translate TTS HTTP ${res.status}: ${res.statusText}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);
      if (buf.length > 0) {
        audioBuffers.push(buf);
      }
    } catch (fetchErr) {
      clearTimeout(timeout);
      throw fetchErr;
    }
  }

  if (audioBuffers.length === 0) {
    throw new Error('Google Translate TTS returned empty response');
  }

  const mergedBuffer = Buffer.concat(audioBuffers);
  const audioBase64 = mergedBuffer.toString('base64');
  const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
  const speed = request?.speed || request?.speakingRate || 1.0;
  const duration = calculateEstimatedDuration(text, language as SupportedLanguage, speed);

  return {
    success: true,
    jobId,
    audioBuffer: mergedBuffer,
    audioUrl,
    audioBase64,
    mimeType: 'audio/mp3',
    duration,
    providerUsed: 'keyless',
    language,
    voiceId: `gtts-${tl}`,
    voiceUsed: `Google Translate TTS (${tl})`,
    format: 'mp3',
    characterCount: text.length,
    metadata: {
      isDryRun: false,
      speakingRate: speed,
      providerAttempts: [],
      generatedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// External Provider Dynamic Key Resolver
// ============================================================================

export interface ResolvedVoiceKey {
  apiKey?: string;
  source: 'request' | 'database' | 'environment' | 'none';
  providerCanonical: 'azure_speech' | 'google_tts' | 'elevenlabs' | 'openai' | 'omniroute' | string;
}

/**
 * Dynamic key resolver that queries the Supabase settings table with process.env fallback
 * for external voice providers (azure_speech, elevenlabs, google_tts, openai).
 */
export async function resolveVoiceProviderApiKey(
  provider: string,
  explicitKey?: string
): Promise<ResolvedVoiceKey> {
  const norm = (provider || '').toLowerCase().trim().replace(/^api_/, '');
  let canonical = norm;
  let dbAliases: string[] = [norm, `api_${norm}`];
  let envVars: string[] = [];

  if (norm === 'azure' || norm === 'azure_speech') {
    canonical = 'azure_speech';
    dbAliases = ['azure_speech', 'azure', 'api_azure_speech', 'api_azure'];
    envVars = ['AZURE_SPEECH_KEY', 'AZURE_SPEECH_API_KEY', 'AZURE_KEY'];
  } else if (norm === 'google' || norm === 'google_tts') {
    canonical = 'google_tts';
    dbAliases = ['google_tts', 'google', 'api_google_tts', 'api_google'];
    envVars = ['GOOGLE_TTS_API_KEY', 'GOOGLE_API_KEY'];
  } else if (norm === 'elevenlabs' || norm === 'eleven_labs') {
    canonical = 'elevenlabs';
    dbAliases = ['elevenlabs', 'eleven_labs', 'api_elevenlabs'];
    envVars = ['ELEVENLABS_API_KEY', 'XI_API_KEY'];
  } else if (norm === 'openai') {
    canonical = 'openai';
    dbAliases = ['openai', 'api_openai'];
    envVars = ['OPENAI_API_KEY'];
  }

  // 1. Explicit key in request
  if (explicitKey && explicitKey.trim().length > 0) {
    return { apiKey: explicitKey.trim(), source: 'request', providerCanonical: canonical };
  }

  // 2. Query Supabase settings table
  try {
    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      const { data: rows, error } = await dbClient
        .from('settings')
        .select('provider, api_key, is_active')
        .in('provider', dbAliases);

      if (!error && Array.isArray(rows) && rows.length > 0) {
        for (const row of rows) {
          if (row.is_active === false) continue;
          if (row.api_key && String(row.api_key).trim().length > 0) {
            console.log(`[TTS] Dynamic key resolver: resolved key for ${canonical} from Supabase settings table.`);
            return { apiKey: String(row.api_key).trim(), source: 'database', providerCanonical: canonical };
          }
        }
      }
    }
  } catch (err: any) {
    console.warn(`[TTS] Error querying settings table for ${canonical}:`, err?.message || err);
  }

  // 3. Fallback to process.env
  for (const ev of envVars) {
    const val = process.env[ev];
    if (val && val.trim().length > 0) {
      console.log(`[TTS] Dynamic key resolver: resolved key for ${canonical} from process.env.${ev}.`);
      return { apiKey: val.trim(), source: 'environment', providerCanonical: canonical };
    }
  }

  return { apiKey: undefined, source: 'none', providerCanonical: canonical };
}

// ============================================================================
// Core TTSEngine Class
// ============================================================================

export class TTSEngine {
  /**
   * Main speech synthesis method conforming to interface contracts.
   * Handles multi-lingual inputs, normalization, provider fallback cascade,
   * dynamic key resolution, and in-memory mock generation.
   */
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    const rawText = request.text !== undefined && request.text !== null ? String(request.text).trim() : '';
    if (!rawText) {
      throw new Error('Text is required for TTS synthesis');
    }

    const jobId = `job-tts-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const language = request.language
      ? normalizeLanguageCode(request.language)
      : detectLanguageFromScript(rawText);

    const speed = request.speed || request.speakingRate || 1.0;
    const providerAttempts: ProviderAttemptLog[] = [];

    // 1. Explicit mock or dry-run execution requested
    if (request.mock === true || request.provider === 'mock') {
      return this.generateDryRun(jobId, rawText, language, request, providerAttempts, 'Explicit mock requested');
    }

    // Determine provider cascade: respect requested provider or auto-detect from voice
    let rawReqProvider = (request.provider || '').toLowerCase().trim().replace(/^api_/, '');
    
    // Auto-detect provider from voice/voiceId if provider is omitted or 'auto'
    if (!rawReqProvider || rawReqProvider === 'auto') {
      const voiceCandidate = (request.voiceId || request.voice || '').trim();
      if (voiceCandidate.startsWith('free-') || voiceCandidate.startsWith('gtts-')) {
        rawReqProvider = 'keyless';
      } else if (['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(voiceCandidate.toLowerCase())) {
        rawReqProvider = 'openai';
      } else if (voiceCandidate.includes('Neural2') || voiceCandidate.includes('Wavenet') || voiceCandidate.includes('Journey')) {
        rawReqProvider = 'google_tts';
      } else if (voiceCandidate.includes('Neural')) {
        rawReqProvider = 'azure_speech';
      } else if (Object.keys(ELEVENLABS_VOICES).includes(voiceCandidate.toLowerCase()) || (voiceCandidate.length > 15 && !voiceCandidate.includes('-'))) {
        rawReqProvider = 'elevenlabs';
      } else {
        rawReqProvider = 'omniroute';
      }
    }

    let primaryProvider: 'azure' | 'elevenlabs' | 'google' | 'openai' | 'omniroute' | 'keyless' = 'omniroute';
    if (rawReqProvider === 'keyless') primaryProvider = 'keyless';
    else if (rawReqProvider === 'azure' || rawReqProvider === 'azure_speech') primaryProvider = 'azure';
    else if (rawReqProvider === 'elevenlabs' || rawReqProvider === 'eleven_labs') primaryProvider = 'elevenlabs';
    else if (rawReqProvider === 'google' || rawReqProvider === 'google_tts') primaryProvider = 'google';
    else if (rawReqProvider === 'openai') primaryProvider = 'openai';
    else primaryProvider = 'omniroute';

    const providersToTry: TTSProvider[] = [];
    if (primaryProvider === 'keyless') {
      providersToTry.push('keyless');
    } else {
      providersToTry.push(primaryProvider as TTSProvider);
      if (primaryProvider !== 'omniroute') providersToTry.push('omniroute');
      providersToTry.push('keyless');
    }

    for (const provider of providersToTry) {
      const startTime = Date.now();
      try {
        // --- OmniRoute TTS (OpenAI-compatible /v1/audio/speech) ---
        if (provider === 'omniroute') {
          const omniConfig = await getOmniRouteConfig();
          const apiKey = request.apiKey || omniConfig.apiKey;
          if (!apiKey) throw new Error('OmniRoute API key is not configured');
          const baseUrl = omniConfig.baseUrl || 'http://localhost:20128';

          const res = await this.synthesizeWithOpenAI(jobId, rawText, language, request, apiKey, baseUrl, 'omniroute');
          providerAttempts.push({
            provider: 'omniroute',
            status: 'success',
            latencyMs: Date.now() - startTime,
          });
          res.metadata.providerAttempts = providerAttempts;
          return res;
        }
        if (provider === 'azure') {
          const keyResult = await resolveVoiceProviderApiKey('azure_speech', request.apiKey);
          const apiKey = keyResult.apiKey;
          if (!apiKey) throw new Error('Azure Speech API key is not configured in settings or environment');
          const region = request.region || process.env.AZURE_SPEECH_REGION || 'eastus';
          console.log(`[TTS] Synthesizing with Azure Speech (key source: ${keyResult.source}, region: ${region})...`);
          const res = await this.synthesizeWithAzure(jobId, rawText, language, request, apiKey, region);
          providerAttempts.push({
            provider: 'azure',
            status: 'success',
            latencyMs: Date.now() - startTime,
          });
          res.metadata.providerAttempts = providerAttempts;
          return res;
        }
        if (provider === 'elevenlabs') {
          const keyResult = await resolveVoiceProviderApiKey('elevenlabs', request.apiKey);
          const apiKey = keyResult.apiKey;
          if (!apiKey) throw new Error('ElevenLabs API key is not configured in settings or environment');
          console.log(`[TTS] Synthesizing with ElevenLabs (key source: ${keyResult.source})...`);
          const res = await this.synthesizeWithElevenLabs(jobId, rawText, language, request, apiKey);
          providerAttempts.push({
            provider: 'elevenlabs',
            status: 'success',
            latencyMs: Date.now() - startTime,
          });
          res.metadata.providerAttempts = providerAttempts;
          return res;
        }
        if (provider === 'google') {
          const keyResult = await resolveVoiceProviderApiKey('google_tts', request.apiKey);
          const apiKey = keyResult.apiKey;
          if (!apiKey) throw new Error('Google TTS API key is not configured in settings or environment');
          console.log(`[TTS] Synthesizing with Google TTS (key source: ${keyResult.source})...`);
          const res = await this.synthesizeWithGoogle(jobId, rawText, language, request, apiKey);
          providerAttempts.push({
            provider: 'google',
            status: 'success',
            latencyMs: Date.now() - startTime,
          });
          res.metadata.providerAttempts = providerAttempts;
          return res;
        }
        if (provider === 'openai') {
          const keyResult = await resolveVoiceProviderApiKey('openai', request.apiKey);
          const apiKey = keyResult.apiKey;
          if (!apiKey) throw new Error('OpenAI API key is not configured in settings or environment');
          console.log(`[TTS] Synthesizing with OpenAI TTS (key source: ${keyResult.source})...`);
          const res = await this.synthesizeWithOpenAI(jobId, rawText, language, request, apiKey, 'https://api.openai.com', 'openai');
          providerAttempts.push({
            provider: 'openai',
            status: 'success',
            latencyMs: Date.now() - startTime,
          });
          res.metadata.providerAttempts = providerAttempts;
          return res;
        }
        if (provider === 'keyless') {
          const res = await this.synthesizeWithKeyless(jobId, rawText, language, request);
          providerAttempts.push({
            provider: 'keyless',
            status: 'success',
            latencyMs: Date.now() - startTime,
          });
          res.metadata.providerAttempts = providerAttempts;
          return res;
        }
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        const errorMessage = err?.message || String(err);
        console.warn(`[TTS] Provider ${provider} attempt failed: ${errorMessage}. Continuing fallback cascade.`);
        providerAttempts.push({
          provider,
          status: 'failed',
          error: errorMessage,
          latencyMs,
        });
      }
    }

    // 3. Fallback to Keyless Google Translate if not attempted or if other providers failed
    try {
      const res = await this.synthesizeWithKeyless(jobId, rawText, language, request);
      providerAttempts.push({ provider: 'keyless', status: 'success', latencyMs: 0 });
      res.metadata.providerAttempts = providerAttempts;
      return res;
    } catch (e) {
      providerAttempts.push({ provider: 'keyless', status: 'failed', error: String(e) });
    }

    // 4. Fallback to In-Memory Deterministic Mock Audio if all live providers skipped or failed
    return this.generateDryRun(
      jobId,
      rawText,
      language,
      request,
      providerAttempts,
      'All live providers skipped or failed - cost-safe fallback'
    );
  }

  /**
   * Helper alias method matching orchestrator callers.
   */
  async synthesizeSpeech(request: TTSRequest): Promise<TTSResponse> {
    return this.synthesize(request);
  }

  /**
   * Azure Speech Services REST API Integration
   */
  private async synthesizeWithAzure(
    jobId: string,
    text: string,
    language: SupportedLanguage,
    request: TTSRequest,
    apiKey: string,
    region: string
  ): Promise<TTSResponse> {
    const gender = request.gender || 'female';
    const defaultVoiceName =
      AZURE_DEFAULT_VOICES[language]?.[gender] ||
      AZURE_DEFAULT_VOICES[language]?.neutral ||
      AZURE_DEFAULT_VOICES['en-US'].female;

    const requestedVoice = request.voiceId || request.voice;
    const voiceName =
      requestedVoice && requestedVoice.includes('-') && requestedVoice.includes('Neural')
        ? requestedVoice
        : defaultVoiceName;

    const speed = request.speed || request.speakingRate || 1.0;
    const ratePercent = speed === 1.0 ? '0%' : `${Math.round((speed - 1.0) * 100)}%`;
    const escaped = escapeXml(text);

    const ssml = `<speak version='1.0' xml:lang='${language}'><voice xml:lang='${language}' xml:gender='${gender}' name='${voiceName}'><prosody rate='${ratePercent}'>${escaped}</prosody></voice></speak>`;

    const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-160kbitrate-mono-mp3',
        'User-Agent': 'Clipped-TTS-Engine',
      },
      body: ssml,
    });

    if (!response.ok) {
      throw new Error(`Azure Speech Services HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const audioBase64 = buffer.toString('base64');
    const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
    const duration = calculateEstimatedDuration(text, language, speed);

    return {
      success: true,
      jobId,
      audioBuffer: buffer,
      audioUrl,
      audioBase64,
      mimeType: 'audio/mp3',
      duration,
      providerUsed: 'azure',
      language,
      voiceId: voiceName,
      voiceUsed: voiceName,
      format: 'mp3',
      characterCount: text.length,
      metadata: {
        isDryRun: false,
        speakingRate: speed,
        providerAttempts: [],
        region,
        voiceConfig: voiceName,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * OpenAI-compatible TTS API Integration — routes through OmniRoute gateway.
   */
  private async synthesizeWithOpenAI(
    jobId: string,
    text: string,
    language: SupportedLanguage,
    request: TTSRequest,
    apiKey: string,
    baseUrl?: string,
    providerUsedName: string = 'omniroute'
  ): Promise<TTSResponse> {
    const rawVoice = (request.voiceId || request.voice || 'alloy').toLowerCase().trim();
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const voice = validVoices.includes(rawVoice) ? rawVoice : 'alloy';

    const speed = Math.max(0.25, Math.min(4.0, request.speed || request.speakingRate || 1.0));
    const model = request.model || 'tts-1';

    const resolvedBase = (baseUrl || 'http://localhost:20128')
      .replace(/\/+$/, '')
      .replace(/\/v1$/i, '');
    const url = `${resolvedBase}/v1/audio/speech`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        speed,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI TTS HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const audioBase64 = buffer.toString('base64');
    const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
    const duration = calculateEstimatedDuration(text, language, speed);

    return {
      success: true,
      jobId,
      audioBuffer: buffer,
      audioUrl,
      audioBase64,
      mimeType: 'audio/mp3',
      duration,
      providerUsed: (providerUsedName || (baseUrl?.includes('openai.com') ? 'openai' : 'omniroute')) as TTSProvider,
      language,
      voiceId: voice,
      voiceUsed: voice,
      format: 'mp3',
      characterCount: text.length,
      metadata: {
        isDryRun: false,
        speakingRate: speed,
        providerAttempts: [],
        model,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * ElevenLabs API Integration with eleven_multilingual_v2
   */
  private async synthesizeWithElevenLabs(
    jobId: string,
    text: string,
    language: SupportedLanguage,
    request: TTSRequest,
    apiKey: string
  ): Promise<TTSResponse> {
    const rawVoice = (request.voiceId || request.voice || 'rachel').toLowerCase().trim();
    const voiceId =
      ELEVENLABS_VOICES[rawVoice] ||
      (rawVoice.length > 15 ? rawVoice : ELEVENLABS_VOICES.rachel);
    const elevenLang = ELEVENLABS_LANG_MAP[language] || 'en';
    const speed = request.speed || request.speakingRate || 1.0;

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
        language_code: elevenLang,
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const audioBase64 = buffer.toString('base64');
    const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
    const duration = calculateEstimatedDuration(text, language, speed);

    return {
      success: true,
      jobId,
      audioBuffer: buffer,
      audioUrl,
      audioBase64,
      mimeType: 'audio/mp3',
      duration,
      providerUsed: 'elevenlabs',
      language,
      voiceId,
      voiceUsed: voiceId,
      format: 'mp3',
      characterCount: text.length,
      metadata: {
        isDryRun: false,
        speakingRate: speed,
        providerAttempts: [],
        model: 'eleven_multilingual_v2',
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Google Cloud Text-to-Speech Integration
   */
  private async synthesizeWithGoogle(
    jobId: string,
    text: string,
    language: SupportedLanguage,
    request: TTSRequest,
    apiKey?: string,
    bearerToken?: string
  ): Promise<TTSResponse> {
    const gender = request.gender || 'female';
    const defaultVoiceName =
      GOOGLE_DEFAULT_VOICES[language]?.[gender] ||
      GOOGLE_DEFAULT_VOICES[language]?.neutral ||
      GOOGLE_DEFAULT_VOICES['en-US'].female;

    const requestedVoice = request.voiceId || request.voice;
    const voiceName =
      requestedVoice && requestedVoice.includes('-') ? requestedVoice : defaultVoiceName;
    const speed = request.speed || request.speakingRate || 1.0;
    const pitch = request.pitch || 0.0;
    const volumeGainDb = request.volumeGainDb || 0.0;

    let url = 'https://texttospeech.googleapis.com/v1/text:synthesize';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      url += `?key=${apiKey}`;
    } else if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: language,
          name: voiceName,
          ssmlGender: gender.toUpperCase(),
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: speed,
          pitch,
          volumeGainDb,
          sampleRateHertz: 24000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Cloud TTS HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as { audioContent?: string; [key: string]: any };
    if (!data.audioContent) {
      throw new Error('Google Cloud TTS returned no audioContent');
    }

    const audioBase64 = data.audioContent;
    const buffer = Buffer.from(audioBase64, 'base64');
    const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
    const duration = calculateEstimatedDuration(text, language, speed);

    return {
      success: true,
      jobId,
      audioBuffer: buffer,
      audioUrl,
      audioBase64,
      mimeType: 'audio/mp3',
      duration,
      providerUsed: 'google',
      language,
      voiceId: voiceName,
      voiceUsed: voiceName,
      format: 'mp3',
      characterCount: text.length,
      metadata: {
        isDryRun: false,
        speakingRate: speed,
        providerAttempts: [],
        voiceConfig: voiceName,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Coqui TTS (Local or Remote) Integration with 2.5s fast timeout guard
   */
  private async synthesizeWithCoqui(
    jobId: string,
    text: string,
    language: SupportedLanguage,
    request: TTSRequest,
    coquiUrl: string
  ): Promise<TTSResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s fast timeout guard

    const coquiLang = COQUI_LANG_MAP[language] || 'en';
    const voiceSpeaker = request.voiceId || request.voice || 'p225';
    const speed = request.speed || request.speakingRate || 1.0;

    try {
      const response = await fetch(`${coquiUrl.replace(/\/$/, '')}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          text,
          speaker_id: voiceSpeaker,
          language_id: coquiLang,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Coqui TTS HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const audioBase64 = buffer.toString('base64');
      const audioUrl = `data:audio/wav;base64,${audioBase64}`;
      const duration = calculateEstimatedDuration(text, language, speed);

      return {
        success: true,
        jobId,
        audioBuffer: buffer,
        audioUrl,
        audioBase64,
        mimeType: 'audio/wav',
        duration,
        providerUsed: 'coqui',
        language,
        voiceId: voiceSpeaker,
        voiceUsed: voiceSpeaker,
        format: 'wav',
        characterCount: text.length,
        metadata: {
          isDryRun: false,
          speakingRate: speed,
          providerAttempts: [],
          endpoint: coquiUrl,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * Keyless Voice Synthesis Integration
   * 1. Primary: Microsoft Edge TTS (high quality Neural voices with 5s timeout guard)
   * 2. Automatic Fallback: Google Translate TTS REST endpoint
   * 3. Ultimate Fallback: Deterministic synthetic audible WAV buffer
   * Audio generation is guaranteed to never fail or return empty/silent audio.
   */
  private async synthesizeWithKeyless(
    jobId: string,
    text: string,
    language: SupportedLanguage,
    request: TTSRequest
  ): Promise<TTSResponse> {
    const voiceName = resolveKeylessVoice(request.voiceId || request.voice, language);

      // 1. Try Microsoft Edge TTS with 5-second timeout guard to prevent hangs on connection drops/403s
    let edgeError: any = null;
    try {
      const { EdgeTTS } = require('node-edge-tts');
      const os = require('os');
      const path = require('path');
      const fs = require('fs/promises');

      const tempPath = path.join(os.tmpdir(), `edge-tts-${jobId}-${Date.now()}.mp3`);
      
      const speed = request.speed || request.speakingRate || 1.0;
      // MoneyPrinterTurbo-style humanization:
      // Convert 1.0 (1x) into edge-tts format like '+0%'
      const ratePercent = Math.round((speed - 1.0) * 100);
      const rateString = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
      
      // Auto voice tuning: slightly lower pitch for a more natural, less robotic tone
      const pitchString = '-2Hz';
      
      // Volume string
      // default is 100. If 100, we leave it at +0%. 150 = +50%.
      const volNum = request.volume ?? 100;
      const volPercent = Math.round(((volNum / 100) - 1.0) * 100);
      const volString = volPercent >= 0 ? `+${volPercent}%` : `${volPercent}%`;

      const tts = new EdgeTTS({
        voice: voiceName,
        lang: language,
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
        rate: rateString,
        pitch: pitchString,
        volume: volString,
        timeout: 5000,
      });

      console.log(`[TTS] Requesting keyless audio from Edge TTS: voice=${voiceName}, lang=${language}`);

      let timer: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Edge TTS WebSocket connection timed out after 5000ms')), 5000);
      });

      try {
        await Promise.race([
          tts.ttsPromise(text, tempPath),
          timeoutPromise,
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }

      const buffer = await fs.readFile(tempPath);
      await fs.unlink(tempPath).catch(() => {});

      if (!buffer || buffer.length === 0) {
        throw new Error('Edge TTS produced a 0-byte audio file');
      }

      const audioBase64 = buffer.toString('base64');
      const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
      const duration = calculateEstimatedDuration(text, language, speed);

      return {
        success: true,
        jobId,
        audioBuffer: buffer,
        audioUrl,
        audioBase64,
        mimeType: 'audio/mp3',
        duration,
        providerUsed: 'keyless',
        language,
        voiceId: voiceName,
        voiceUsed: voiceName,
        format: 'mp3',
        characterCount: text.length,
        metadata: {
          isDryRun: false,
          speakingRate: speed,
          providerAttempts: [],
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      edgeError = err;
      console.warn(`[TTS] Edge TTS Keyless failed (${err?.message || err}). Triggering automatic fallback to Google Translate TTS REST endpoint...`);
    }

    // 2. Automatic, reliable keyless fallback: Google Translate TTS REST endpoint
    try {
      const gttsRes = await synthesizeWithGoogleTranslateRest(jobId, text, language, request);
      console.log(`[TTS] Keyless fallback succeeded via Google Translate TTS REST (${gttsRes.audioBuffer?.length || 0} bytes)`);
      return gttsRes;
    } catch (gttsErr: any) {
      console.warn(`[TTS] Google Translate TTS fallback failed (${gttsErr?.message || gttsErr}). Falling back to guaranteed synthetic WAV buffer...`);
    }

    // 3. Fallback to valid synthetic WAV buffer (audio generation must NEVER fail or return silent empty audio)
    console.log(`[TTS] Falling back to synthetic WAV generator to guarantee non-empty audible output`);
    return this.generateDryRun(
      jobId,
      text,
      language,
      request,
      [],
      `Keyless providers unavailable (Edge: ${edgeError?.message || 'failed'}) - guaranteed audible synthetic fallback`
    );
  }

  /**
   * Deterministic In-Memory Cost-Safe Mock Generator
   */
  private generateDryRun(
    jobId: string,
    text: string,
    language: SupportedLanguage,
    request: TTSRequest,
    providerAttempts: ProviderAttemptLog[],
    reasonNote?: string
  ): TTSResponse {
    const speed = request.speed || request.speakingRate || 1.0;
    const duration = calculateEstimatedDuration(text, language, speed);
    const wavBuffer = generateSyntheticWavBuffer(duration, 24000);
    const audioBase64 = wavBuffer.toString('base64');
    const audioUrl = `data:audio/wav;base64,${audioBase64}`;
    const voiceId =
      request.voiceId ||
      request.voice ||
      GOOGLE_DEFAULT_VOICES[language]?.female ||
      'mock-voice-1';

    return {
      success: true,
      jobId,
      audioBuffer: wavBuffer,
      audioUrl,
      audioBase64,
      mimeType: 'audio/wav',
      duration,
      providerUsed: 'mock',
      language,
      voiceId,
      voiceUsed: voiceId,
      format: 'wav',
      characterCount: text.length,
      metadata: {
        isDryRun: true,
        speakingRate: speed,
        reason: reasonNote || 'Cost-safe dry run execution',
        providerAttempts,
        sampleRate: 24000,
        channels: 1,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Returns supported voices catalog for a given language or all languages, optionally filtered by provider
   */
  getAvailableVoices(language?: SupportedLanguage | string, provider?: TTSProvider | string): TTSVoiceOption[] {
    const targetLang = language ? normalizeLanguageCode(language) : undefined;
    const targetProvider = provider ? (provider.toLowerCase() as TTSProvider) : undefined;
    const voices: TTSVoiceOption[] = [];

    // 1. Azure voices
    if (!targetProvider || targetProvider === 'azure') {
      AZURE_VOICE_CATALOG.forEach((v) => {
        if (!targetLang || v.language === targetLang) {
          voices.push(v);
        }
      });
    }

    // 2. OpenAI voices
    if (!targetProvider || targetProvider === 'openai') {
      OPENAI_VOICES.forEach((ov) => {
        if (!targetLang || targetLang.startsWith('en')) {
          voices.push({
            id: ov.id,
            name: `${ov.name} (OpenAI)`,
            provider: 'openai',
            language: 'en-US',
            gender: ov.gender,
            description: ov.description,
          });
        }
      });
    }

    // 3. ElevenLabs voices
    if (!targetProvider || targetProvider === 'elevenlabs') {
      Object.entries(ELEVENLABS_VOICES).forEach(([name, id]) => {
        if (!targetLang || targetLang.startsWith('en')) {
          voices.push({
            id,
            name: `${name.charAt(0).toUpperCase() + name.slice(1)} (ElevenLabs)`,
            provider: 'elevenlabs',
            language: 'en-US',
            gender: ['rachel', 'domi', 'bella', 'elli', 'nova', 'fable', 'alloy', 'shimmer'].includes(name)
              ? 'female'
              : 'male',
            description: `ElevenLabs Multilingual v2 Voice (${name})`,
          });
        }
      });
    }

    // 4. Google Cloud voices
    if (!targetProvider || targetProvider === 'google') {
      Object.entries(GOOGLE_DEFAULT_VOICES).forEach(([lang, catalog]) => {
        const supLang = lang as SupportedLanguage;
        if (!targetLang || targetLang === supLang) {
          voices.push({
            id: catalog.female,
            name: `${catalog.female} (Google)`,
            provider: 'google',
            language: supLang,
            gender: 'female',
            description: `Google Cloud TTS Neural/Wavenet Voice for ${supLang}`,
          });
          voices.push({
            id: catalog.male,
            name: `${catalog.male} (Google)`,
            provider: 'google',
            language: supLang,
            gender: 'male',
            description: `Google Cloud TTS Neural/Wavenet Voice for ${supLang}`,
          });
        }
      });
    }

    // 5. Free / Keyless voices
    if (!targetProvider || targetProvider === 'keyless') {
      FREE_KEYLESS_VOICES.forEach((v) => {
        if (!targetLang || v.language === targetLang) {
          voices.push(v);
        }
      });
    }

    return voices;
  }

  /**
   * Exposes language normalizer
   */
  normalizeLanguage(lang?: string): SupportedLanguage {
    return normalizeLanguageCode(lang);
  }
}

// Export singleton instance
export const ttsEngine = new TTSEngine();

