/**
 * Text-to-Speech (TTS) Engine for Clipped
 *
 * Multi-provider voice synthesis engine supporting:
 * 1. Google Cloud Text-to-Speech (Neural2, Wavenet, Journey, Standard)
 * 2. ElevenLabs API (eleven_multilingual_v2 model with voice presets)
 * 3. Coqui TTS API (self-hosted / remote endpoint with 2.5s fast timeout guard)
 * 4. Deterministic In-Memory Cost-Safe Mock Engine (RIFF/WAVE PCM generator)
 *
 * Supported Languages:
 * - English: en-US, en-IN
 * - Indian Languages: Hindi (hi-IN), Tamil (ta-IN), Telugu (te-IN),
 *   Kannada (kn-IN), Bengali (bn-IN), Marathi (mr-IN)
 */

// ============================================================================
// Types & Interface Contracts
// ============================================================================

export type TTSProvider = 'elevenlabs' | 'google' | 'coqui' | 'mock' | 'auto';

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
}

export interface ProviderAttemptLog {
  provider: TTSProvider;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  latencyMs?: number;
}

export interface TTSRequest {
  text: string;
  language?: SupportedLanguage | string;
  provider?: TTSProvider | 'auto';
  voice?: string;
  voiceId?: string;
  gender?: VoiceGender;
  speed?: number;
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
  audioFormat?: 'mp3' | 'wav' | 'ogg';
  mock?: boolean;
  apiKey?: string;
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
    // Check for Marathi-specific letter 'ळ' (\u0933) or typical Marathi particles
    if (/[\u0933]|आहे|नाही|झाला|केला/.test(text)) {
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

// ============================================================================
// Deterministic In-Memory RIFF/WAVE PCM Buffer Generator
// ============================================================================

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

// ============================================================================
// Core TTSEngine Class
// ============================================================================

export class TTSEngine {
  /**
   * Main speech synthesis method conforming to interface contracts.
   * Handles multi-lingual inputs, normalization, provider fallback cascade,
   * and in-memory mock generation.
   */
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    const rawText = request.text ? String(request.text).trim() : '';
    if (!rawText) {
      throw new Error('Text is required for TTS synthesis');
    }

    const jobId = `job-tts-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const language = request.language
      ? normalizeLanguageCode(request.language)
      : detectLanguageFromScript(rawText);

    const gender: VoiceGender = request.gender || 'female';
    const speed = request.speed || request.speakingRate || 1.0;
    const providerAttempts: ProviderAttemptLog[] = [];

    // 1. Explicit mock or dry-run execution requested
    if (request.mock === true) {
      return this.generateDryRun(jobId, rawText, language, request, providerAttempts, 'Explicit mock requested');
    }

    // 2. Cascade Chain determination
    const requestedProvider = request.provider && request.provider !== 'auto' ? request.provider : undefined;
    
    // Priority order: Requested Provider (if given) -> ElevenLabs -> Google -> Coqui -> Mock
    let providersToTry: TTSProvider[] = [];
    if (requestedProvider === 'google') {
      providersToTry = ['google', 'elevenlabs', 'coqui'];
    } else if (requestedProvider === 'coqui') {
      providersToTry = ['coqui', 'elevenlabs', 'google'];
    } else if (requestedProvider === 'elevenlabs') {
      providersToTry = ['elevenlabs', 'google', 'coqui'];
    } else {
      // Default auto cascade
      providersToTry = ['elevenlabs', 'google', 'coqui'];
    }

    for (const provider of providersToTry) {
      const startTime = Date.now();
      try {
        if (provider === 'elevenlabs') {
          const apiKey = request.apiKey || process.env.ELEVENLABS_API_KEY;
          if (!apiKey) {
            providerAttempts.push({
              provider: 'elevenlabs',
              status: 'skipped',
              error: 'Missing ELEVENLABS_API_KEY',
            });
            continue;
          }
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
          const apiKey =
            request.apiKey ||
            process.env.GOOGLE_TTS_API_KEY ||
            process.env.GOOGLE_API_KEY;
          const bearerToken = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_TTS_BEARER_TOKEN;

          if (!apiKey && !bearerToken) {
            providerAttempts.push({
              provider: 'google',
              status: 'skipped',
              error: 'Missing GOOGLE_TTS_API_KEY or credentials',
            });
            continue;
          }
          const res = await this.synthesizeWithGoogle(jobId, rawText, language, request, apiKey, bearerToken);
          providerAttempts.push({
            provider: 'google',
            status: 'success',
            latencyMs: Date.now() - startTime,
          });
          res.metadata.providerAttempts = providerAttempts;
          return res;
        }

        if (provider === 'coqui') {
          const coquiUrl = process.env.COQUI_TTS_URL || 'http://localhost:5002';
          // Skip if local coqui is not running
          try {
             await fetch(`${coquiUrl.replace(/\/$/, '')}/api/tts`, { method: 'HEAD', signal: AbortSignal.timeout(500) });
          } catch(e) {
             providerAttempts.push({ provider: 'coqui', status: 'skipped', error: 'Coqui unreachable' });
             continue;
          }
          const res = await this.synthesizeWithCoqui(jobId, rawText, language, request, coquiUrl);
          providerAttempts.push({
            provider: 'coqui',
            status: 'success',
            latencyMs: Date.now() - startTime,
          });
          res.metadata.providerAttempts = providerAttempts;
          return res;
        }
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        const errorMessage = err?.message || String(err);
        providerAttempts.push({
          provider,
          status: 'failed',
          error: errorMessage,
          latencyMs,
        });
      }
    }
    
    // 3. Fallback to Keyless Google Translate TTS API
    try {
      console.log("Triggering Free Keyless TTS for: ", rawText.substring(0, 30));
      const textToSpeak = rawText.substring(0, 200); // Max 200 chars for free Google Translate TTS
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(textToSpeak)}`;
      const res = await fetch(url);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const audioBase64 = buffer.toString('base64');
        const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
        const speed = request.speed || request.speakingRate || 1.0;
        const duration = calculateEstimatedDuration(rawText, language, speed);
        
        providerAttempts.push({ provider: 'auto', status: 'success', latencyMs: 0 });
        
        return {
          success: true,
          jobId,
          audioBuffer: buffer,
          audioUrl,
          audioBase64,
          mimeType: 'audio/mp3',
          duration,
          providerUsed: 'keyless-google',
          language,
          voiceId: 'keyless',
          voiceUsed: 'keyless',
          format: 'mp3',
          characterCount: rawText.length,
          metadata: {
            isDryRun: false,
            speakingRate: speed,
            providerAttempts,
            generatedAt: new Date().toISOString(),
          },
        };
      }
    } catch (e) {
       console.error("Keyless TTS Failed", e);
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
   * Returns supported voices catalog for a given language or all languages
   */
  getAvailableVoices(language?: SupportedLanguage | string): TTSVoiceOption[] {
    const targetLang = language ? normalizeLanguageCode(language) : undefined;
    const voices: TTSVoiceOption[] = [];

    // ElevenLabs voices
    Object.entries(ELEVENLABS_VOICES).forEach(([name, id]) => {
      if (!targetLang || targetLang.startsWith('en')) {
        voices.push({
          id,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          provider: 'elevenlabs',
          language: 'en-US',
          gender: ['rachel', 'domi', 'bella', 'elli', 'nova', 'fable', 'alloy', 'shimmer'].includes(name)
            ? 'female'
            : 'male',
          description: `ElevenLabs Multilingual v2 Voice (${name})`,
        });
      }
    });

    // Google voices
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
