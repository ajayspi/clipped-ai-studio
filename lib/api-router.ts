/**
 * Smart API Router â€” lib/api-router.ts
 *
 * Provides automatic health-aware failover across all configured AI providers.
 * Each provider is pinged with a lightweight health check before being selected.
 * Priority falls through: highest priority active+healthy provider wins.
 */

import { supabaseAdmin } from '@/lib/db';

// â”€â”€â”€ Provider Registry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ProviderConfig {
  id: string;                     // e.g. "openai"
  name: string;                   // Display name
  category: 'llm' | 'image' | 'voice' | 'media' | 'video' | 'music';
  healthEndpoint: string;         // URL to GET/POST for a fast availability check
  healthMethod?: 'GET' | 'POST';
  healthBody?: object;
  healthAuthHeader?: (key: string) => string; // How to pass the API key
  baseUrl: string;
  isFree?: boolean;               // Keyless/free tier
  defaultPriority: number;        // Higher = preferred (0-100)
  models?: string[];              // Supported model identifiers
}

export const PROVIDER_REGISTRY: ProviderConfig[] = [
  // â”€â”€ LLM Providers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'llm',
    healthEndpoint: 'http://localhost:20128/v1/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'http://localhost:20128/v1',
    defaultPriority: 90,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    category: 'llm',
    healthEndpoint: 'http://localhost:20128/v1/models',
    healthAuthHeader: (k) => ``,  // Uses x-api-key header
    baseUrl: 'http://localhost:20128/v1',
    defaultPriority: 88,
    models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    category: 'llm',
    healthEndpoint: 'http://localhost:20128/v1/models',
    healthAuthHeader: (k) => ``,  // Uses ?key= param
    baseUrl: 'http://localhost:20128/v1',
    defaultPriority: 85,
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    category: 'llm',
    healthEndpoint: 'https://openrouter.ai/api/v1/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultPriority: 80,
    models: ['meta-llama/llama-3.3-70b-instruct', 'mistralai/mistral-large', 'google/gemini-flash-1.5'],
  },
  {
    id: 'omniroute_local_llm',
    name: 'OmniRoute (Local Gateway)',
    category: 'llm',
    healthEndpoint: 'http://localhost:20128/v1/models',
    healthAuthHeader: (k) => `Bearer ${k || 'dummy'}`,
    baseUrl: 'http://localhost:20128/v1',
    defaultPriority: 100, // Highest priority
    models: ['auto', 'auto/coding', 'auto/fast', 'auto/cheap'],
  },
  {
    id: 'groq',
    name: 'Groq (Ultra-Fast)',
    category: 'llm',
    healthEndpoint: 'http://localhost:20128/v1/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'http://localhost:20128/v1',
    defaultPriority: 78,
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  },
  {
    id: 'grok',
    name: 'xAI Grok',
    category: 'llm',
    healthEndpoint: 'https://api.x.ai/v1/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://api.x.ai/v1',
    defaultPriority: 75,
    models: ['grok-2', 'grok-beta'],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    category: 'llm',
    healthEndpoint: 'https://api.mistral.ai/v1/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://api.mistral.ai/v1',
    defaultPriority: 72,
    models: ['mistral-large-latest', 'mistral-small-latest'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    category: 'llm',
    healthEndpoint: 'https://api.deepseek.com/v1/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://api.deepseek.com/v1',
    defaultPriority: 70,
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    category: 'llm',
    healthEndpoint: 'https://api.cerebras.ai/v1/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://api.cerebras.ai/v1',
    defaultPriority: 68,
    models: ['llama3.3-70b', 'llama3.1-8b'],
  },
  {
    id: 'github_models',
    name: 'GitHub Models',
    category: 'llm',
    healthEndpoint: 'https://models.inference.ai.azure.com/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://models.inference.ai.azure.com',
    defaultPriority: 65,
    models: ['gpt-4o', 'Meta-Llama-3.1-70B-Instruct'],
  },
  // â”€â”€ Free / Keyless LLM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'pollinations_text',
    name: 'Pollinations AI (Free)',
    category: 'llm',
    healthEndpoint: 'https://text.pollinations.ai/openai/models',
    baseUrl: 'https://text.pollinations.ai/openai',
    isFree: true,
    defaultPriority: 28,
    models: ['openai-large', 'openai', 'mistral', 'claude-hybridspace', 'gemini', 'llama', 'qwen'],
  },
  {
    id: 'huggingface_free',
    name: 'Hugging Face (Free Inference)',
    category: 'llm',
    healthEndpoint: 'https://api-inference.huggingface.co/status/bigcode/starcoder',
    baseUrl: 'https://api-inference.huggingface.co/models',
    isFree: true,
    defaultPriority: 22,
    models: ['mistralai/Mistral-7B-Instruct-v0.3', 'HuggingFaceH4/zephyr-7b-beta', 'bigscience/bloom'],
  },
  {
    id: 'openrouter_free',
    name: 'OpenRouter (Free Models)',
    category: 'llm',
    healthEndpoint: 'https://openrouter.ai/api/v1/models?supported_parameters=free',
    baseUrl: 'https://openrouter.ai/api/v1',
    isFree: true,
    defaultPriority: 26,
    models: ['google/gemma-3-27b-it:free', 'meta-llama/llama-3.3-70b-instruct:free', 'qwen/qwen3-8b:free', 'mistralai/mistral-7b-instruct:free'],
  },
  {
    id: 'together_free',
    name: 'Together AI (Free Tier)',
    category: 'llm',
    healthEndpoint: 'https://api.together.xyz/v1/models',
    baseUrl: 'https://api.together.xyz/v1',
    isFree: true,
    defaultPriority: 24,
    models: ['meta-llama/Llama-3-8b-chat-hf', 'mistralai/Mistral-7B-Instruct-v0.3'],
  },
  {
    id: 'cohere_free',
    name: 'Cohere (Free Tier)',
    category: 'llm',
    healthEndpoint: 'https://api.cohere.ai/v1/check-api-key',
    baseUrl: 'https://api.cohere.ai/v1',
    isFree: true,
    defaultPriority: 20,
    models: ['command-r', 'command-light'],
  },
  {
    id: 'ollama_local',
    name: 'Ollama (Local â€” Keyless)',
    category: 'llm',
    healthEndpoint: 'http://localhost:11434/api/tags',
    baseUrl: 'http://localhost:11434/api',
    isFree: true,
    defaultPriority: 15,
    models: ['llama3.2', 'mistral', 'gemma3', 'phi3'],
  },
  {
    id: 'lmstudio_local',
    name: 'LM Studio (Local â€” Keyless)',
    category: 'llm',
    healthEndpoint: 'http://localhost:1234/v1/models',
    baseUrl: 'http://localhost:1234/v1',
    isFree: true,
    defaultPriority: 14,
    models: ['local-model'],
  },

  // â”€â”€ Paid Image Providers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'omniroute_local_image',
    name: 'OmniRoute (Local Gateway)',
    category: 'image',
    healthEndpoint: 'http://localhost:20128/v1/models',
    healthAuthHeader: (k) => `Bearer ${k || 'dummy'}`, // OmniRoute doesn't require a key strictly
    baseUrl: 'http://localhost:20128/v1',
    defaultPriority: 100, // Highest priority since it's a local router!
  },
  {
    id: 'pexels',
    name: 'Pexels',
    category: 'image',
    healthEndpoint: 'https://api.pexels.com/v1/curated?per_page=1',
    healthAuthHeader: (k) => k,
    baseUrl: 'https://api.pexels.com/v1',
    defaultPriority: 85,
  },
  {
    id: 'pixabay',
    name: 'Pixabay',
    category: 'image',
    healthEndpoint: 'https://pixabay.com/api/?per_page=3&q=nature',
    baseUrl: 'https://pixabay.com/api',
    defaultPriority: 80,
  },
  {
    id: 'stability',
    name: 'Stability AI (Image Gen)',
    category: 'image',
    healthEndpoint: 'https://api.stability.ai/v1/engines/list',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://api.stability.ai/v1',
    defaultPriority: 82,
    models: ['stable-diffusion-xl-1024-v1-0', 'stable-image-ultra'],
  },

  // â”€â”€ Free / Keyless Image â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'pollinations_image',
    name: 'Pollinations Image (Free)',
    category: 'image',
    healthEndpoint: 'https://image.pollinations.ai/prompt/test?width=8&height=8&nologo=true',
    baseUrl: 'https://image.pollinations.ai/prompt',
    isFree: true,
    defaultPriority: 45,
    models: ['flux', 'turbo', 'stable-diffusion'],
  },
  {
    id: 'unsplash_free',
    name: 'Unsplash (Free)',
    category: 'image',
    healthEndpoint: 'https://source.unsplash.com/random/1x1',
    baseUrl: 'https://source.unsplash.com',
    isFree: true,
    defaultPriority: 38,
  },
  {
    id: 'picsum_free',
    name: 'Lorem Picsum (Free)',
    category: 'image',
    healthEndpoint: 'https://picsum.photos/1/1',
    baseUrl: 'https://picsum.photos',
    isFree: true,
    defaultPriority: 30,
  },
  {
    id: 'lexica_free',
    name: 'Lexica Art (Free Search)',
    category: 'image',
    healthEndpoint: 'https://lexica.art/api/v1/search?q=nature&n=1',
    baseUrl: 'https://lexica.art/api/v1',
    isFree: true,
    defaultPriority: 28,
  },
  {
    id: 'openverse_free',
    name: 'Openverse (CC Media)',
    category: 'image',
    healthEndpoint: 'https://api.openverse.org/v1/images/?q=nature&page_size=1',
    baseUrl: 'https://api.openverse.org/v1',
    isFree: true,
    defaultPriority: 25,
  },
  {
    id: 'waifu_image_free',
    name: 'Waifu.im (Free Anime Art)',
    category: 'image',
    healthEndpoint: 'https://api.waifu.im/search/?included_tags=waifu&limit=1',
    baseUrl: 'https://api.waifu.im',
    isFree: true,
    defaultPriority: 15,
  },

  // â”€â”€ Paid Voice Providers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    category: 'voice',
    healthEndpoint: 'https://api.elevenlabs.io/v1/voices',
    healthAuthHeader: (k) => k,
    baseUrl: 'https://api.elevenlabs.io/v1',
    defaultPriority: 90,
  },
  {
    id: 'deepgram',
    name: 'Deepgram STT/TTS',
    category: 'voice',
    healthEndpoint: 'https://api.deepgram.com/v1/projects',
    healthAuthHeader: (k) => `Token ${k}`,
    baseUrl: 'https://api.deepgram.com/v1',
    defaultPriority: 80,
  },
  {
    id: 'openai_tts',
    name: 'OpenAI TTS (tts-1)',
    category: 'voice',
    healthEndpoint: 'http://localhost:20128/v1/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'http://localhost:20128/v1',
    defaultPriority: 85,
    models: ['tts-1', 'tts-1-hd'],
  },

  // â”€â”€ Free / Keyless Voice â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'azure_tts_free',
    name: 'Azure Neural TTS (Free)',
    category: 'voice',
    healthEndpoint: 'https://eastus.tts.speech.microsoft.com/cognitiveservices/voices/list',
    baseUrl: 'https://eastus.tts.speech.microsoft.com/cognitiveservices',
    isFree: true,
    defaultPriority: 55,
    models: ['en-US-JennyNeural', 'en-US-GuyNeural', 'hi-IN-SwaraNeural', 'ta-IN-PallaviNeural'],
  },
  {
    id: 'pollinations_tts',
    name: 'Pollinations TTS (Free)',
    category: 'voice',
    healthEndpoint: 'https://text.pollinations.ai/openai/models',
    baseUrl: 'https://text.pollinations.ai/openai',
    isFree: true,
    defaultPriority: 42,
    models: ['openai-tts', 'edge-tts'],
  },
  {
    id: 'voicerss_free',
    name: 'VoiceRSS (350/day Free)',
    category: 'voice',
    healthEndpoint: 'https://api.voicerss.org/?key=demo&hl=en-us&src=test&f=44khz_16bit_mono&c=MP3&ssml=false',
    baseUrl: 'https://api.voicerss.org',
    isFree: true,
    defaultPriority: 38,
    models: ['en-us', 'hi-in', 'ta-in', 'te-in'],
  },
  {
    id: 'streamelements_tts',
    name: 'StreamElements TTS (Free)',
    category: 'voice',
    healthEndpoint: 'https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=test',
    baseUrl: 'https://api.streamelements.com/kappa/v2/speech',
    isFree: true,
    defaultPriority: 35,
    models: ['Brian', 'Amy', 'Joanna', 'Matthew', 'Salli'],
  },
  {
    id: 'tiktok_tts_free',
    name: 'TikTok TTS (Free)',
    category: 'voice',
    healthEndpoint: 'https://tiktok-tts.weilnet.workers.dev/api/generation',
    baseUrl: 'https://tiktok-tts.weilnet.workers.dev/api',
    isFree: true,
    defaultPriority: 32,
    models: ['en_us_001', 'en_us_006', 'en_uk_001', 'en_au_001'],
  },
  {
    id: 'edge_tts_free',
    name: 'Microsoft Edge TTS (Free)',
    category: 'voice',
    healthEndpoint: 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4',
    baseUrl: 'https://speech.platform.bing.com',
    isFree: true,
    defaultPriority: 48,
    models: ['en-US-AriaNeural', 'en-US-GuyNeural', 'hi-IN-MadhurNeural', 'en-IN-NeerjaNeural'],
  },

  // â”€â”€ Free Stock Video â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'coverr_free',
    name: 'Coverr (Free Stock Video)',
    category: 'video',
    healthEndpoint: 'https://api.coverr.co/videos?page=1&per_page=1',
    baseUrl: 'https://api.coverr.co',
    isFree: true,
    defaultPriority: 45,
  },
  {
    id: 'mixkit_free',
    name: 'Mixkit (Free HD Video)',
    category: 'video',
    healthEndpoint: 'https://mixkit.co/free-stock-video/',
    baseUrl: 'https://mixkit.co',
    isFree: true,
    defaultPriority: 40,
  },
  {
    id: 'mazwai_free',
    name: 'Mazwai (Free Cinematic)',
    category: 'video',
    healthEndpoint: 'https://mazwai.com/wp-json/wp/v2/posts?per_page=1',
    baseUrl: 'https://mazwai.com',
    isFree: true,
    defaultPriority: 35,
  },
  {
    id: 'videvo_free',
    name: 'Videvo (Free CC Video)',
    category: 'video',
    healthEndpoint: 'https://www.videvo.net/api/v1/footage/?page=1&page_size=1&license_type=all&resolution=all',
    baseUrl: 'https://www.videvo.net/api/v1',
    isFree: true,
    defaultPriority: 30,
  },

  // â”€â”€ Paid Video AI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'kling',
    name: 'Kling Video AI',
    category: 'video',
    healthEndpoint: 'https://api.klingai.com/v1/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://api.klingai.com/v1',
    defaultPriority: 88,
    models: ['kling-v1', 'kling-v1-5'],
  },
  {
    id: 'luma',
    name: 'Luma Dream Machine',
    category: 'video',
    healthEndpoint: 'https://api.lumalabs.ai/dream-machine/v1/generations',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://api.lumalabs.ai/dream-machine/v1',
    defaultPriority: 85,
    models: ['dream-machine'],
  },
  {
    id: 'runway',
    name: 'Runway ML',
    category: 'video',
    healthEndpoint: 'https://api.runwayml.com/v1/organizations',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://api.runwayml.com/v1',
    defaultPriority: 82,
    models: ['gen3a_turbo', 'gen3a'],
  },
  {
    id: 'fal',
    name: 'Fal.ai (Fast AI Video)',
    category: 'video',
    healthEndpoint: 'https://queue.fal.run/fal-ai/fast-svd/health',
    healthAuthHeader: (k) => `Key ${k}`,
    baseUrl: 'https://queue.fal.run',
    defaultPriority: 78,
    models: ['fal-ai/kling-video', 'fal-ai/fast-svd'],
  },
  {
    id: 'huggingface_video',
    name: 'Hugging Face (Free Video)',
    category: 'video',
    healthEndpoint: 'https://api-inference.huggingface.co/status/damo-vilab/text-to-video-ms-1.7b',
    baseUrl: 'https://api-inference.huggingface.co/models',
    isFree: true,
    defaultPriority: 20,
    models: ['damo-vilab/text-to-video-ms-1.7b', 'cerspense/zeroscope_v2_576w'],
  },

  // â”€â”€ Music Providers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'suno',
    name: 'Suno AI Music',
    category: 'music',
    healthEndpoint: 'https://studio-api.prod.suno.com/api/feed/',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://studio-api.prod.suno.com/api',
    defaultPriority: 90,
  },
  {
    id: 'udio',
    name: 'Udio AI Music',
    category: 'music',
    healthEndpoint: 'https://www.udio.com/api/health',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://www.udio.com/api',
    defaultPriority: 85,
  },
  // Free / Keyless Music
  {
    id: 'jamendo_free',
    name: 'Jamendo (Free CC Music)',
    category: 'music',
    healthEndpoint: 'https://api.jamendo.com/v3.0/tracks/?client_id=b6747d04&format=json&limit=1',
    baseUrl: 'https://api.jamendo.com/v3.0',
    isFree: true,
    defaultPriority: 50,
  },
  {
    id: 'freemusicarchive_free',
    name: 'Free Music Archive',
    category: 'music',
    healthEndpoint: 'https://freemusicarchive.org/api/get/tracks.json?api_key=60BLHNQCAOUFPIBZ&limit=1',
    baseUrl: 'https://freemusicarchive.org/api',
    isFree: true,
    defaultPriority: 42,
  },
  {
    id: 'pixabay_music_free',
    name: 'Pixabay Music (Free)',
    category: 'music',
    healthEndpoint: 'https://pixabay.com/api/music/?per_page=3&q=background',
    baseUrl: 'https://pixabay.com/api/music',
    isFree: true,
    defaultPriority: 48,
  },
  {
    id: 'bensound_free',
    name: 'Bensound (Free BGM)',
    category: 'music',
    healthEndpoint: 'https://www.bensound.com',
    baseUrl: 'https://www.bensound.com/bensound-music',
    isFree: true,
    defaultPriority: 35,
  },

  // â”€â”€ Avatar / Talking Head â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'heygen',
    name: 'HeyGen Avatar',
    category: 'media',
    healthEndpoint: 'https://api.heygen.com/v1/video/list',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://api.heygen.com/v1',
    defaultPriority: 88,
    models: ['avatar-v2', 'photo-avatar'],
  },
  {
    id: 'did',
    name: 'D-ID Avatars',
    category: 'media',
    healthEndpoint: 'https://api.d-id.com/talks',
    healthAuthHeader: (k) => `Basic ${k}`,
    baseUrl: 'https://api.d-id.com',
    defaultPriority: 82,
  },
  {
    id: 'synthesia',
    name: 'Synthesia',
    category: 'media',
    healthEndpoint: 'https://api.synthesia.io/v2/avatars',
    healthAuthHeader: (k) => k,
    baseUrl: 'https://api.synthesia.io/v2',
    defaultPriority: 80,
  },
];


// â”€â”€â”€ Health Check Cache â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface HealthStatus {
  providerId: string;
  isHealthy: boolean;
  latencyMs: number;
  checkedAt: number;
  error?: string;
}

const healthCache = new Map<string, HealthStatus>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// â”€â”€â”€ Health Check Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function checkProviderHealth(
  providerId: string,
  apiKey?: string,
): Promise<HealthStatus> {
  const cached = healthCache.get(providerId);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return cached;
  }

  const config = PROVIDER_REGISTRY.find((p) => p.id === providerId);
  if (!config) {
    return { providerId, isHealthy: false, latencyMs: 0, checkedAt: Date.now(), error: 'Unknown provider' };
  }

  const startMs = Date.now();
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'ClippedAI/1.0',
    };

    // Build auth headers
    if (apiKey && config.healthAuthHeader) {
      const authVal = config.healthAuthHeader(apiKey);
      if (authVal) {
        if (providerId === 'anthropic') {
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
        } else if (providerId === 'pexels') {
          headers['Authorization'] = apiKey;
        } else if (providerId === 'deepgram') {
          headers['Authorization'] = `Token ${apiKey}`;
        } else if (providerId === 'elevenlabs') {
          headers['xi-api-key'] = apiKey;
        } else {
          headers['Authorization'] = authVal;
        }
      }
    }

    // Build URL â€” some providers use ?key= param instead of headers
    let url = config.healthEndpoint;
    if (providerId === 'gemini' && apiKey) {
      url += `?key=${apiKey}`;
    } else if (providerId === 'pixabay' && apiKey) {
      url += `&key=${apiKey}`;
    }

    const res = await fetch(url, {
      method: config.healthMethod || 'GET',
      headers,
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    const latencyMs = Date.now() - startMs;
    const isHealthy = res.status < 500;

    const status: HealthStatus = {
      providerId,
      isHealthy,
      latencyMs,
      checkedAt: Date.now(),
      error: isHealthy ? undefined : `HTTP ${res.status}`,
    };
    healthCache.set(providerId, status);
    return status;
  } catch (err: any) {
    const status: HealthStatus = {
      providerId,
      isHealthy: false,
      latencyMs: Date.now() - startMs,
      checkedAt: Date.now(),
      error: err.message || 'Timeout',
    };
    healthCache.set(providerId, status);
    return status;
  }
}

// â”€â”€â”€ Smart Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface RouterResult {
  providerId: string;
  providerName: string;
  apiKey: string;
  baseUrl: string;
  latencyMs: number;
  isFallback: boolean;
}

/**
 * Get the best available provider for a given category.
 * Checks health in order of priority, returns the first healthy one.
 */
export async function getBestProvider(
  category: 'llm' | 'image' | 'voice' | 'media' | 'video' | 'music',
  preferred?: string,
): Promise<RouterResult | null> {
  // Load all active providers + keys from Supabase
  const { data: settings } = await supabaseAdmin
    .from('settings')
    .select('provider, api_key, is_active, priority')
    .eq('is_active', true);

  const activeKeys = new Map<string, { key: string; priority: number }>();
  for (const row of settings || []) {
    const id = row.provider?.replace(/^api_/, '');
    if (id && row.api_key) {
      activeKeys.set(id, { key: row.api_key, priority: row.priority ?? 0 });
    }
  }

  // Get providers in this category sorted by user priority then default priority
  let candidates = PROVIDER_REGISTRY
    .filter((p) => p.category === category)
    .filter((p) => p.isFree || activeKeys.has(p.id))
    .sort((a, b) => {
      const aPri = (activeKeys.get(a.id)?.priority ?? 0) + a.defaultPriority;
      const bPri = (activeKeys.get(b.id)?.priority ?? 0) + b.defaultPriority;
      return bPri - aPri;
    });

  // Move preferred to front
  if (preferred) {
    candidates = [
      ...candidates.filter((c) => c.id === preferred),
      ...candidates.filter((c) => c.id !== preferred),
    ];
  }

  // Try each in order, return first healthy
  for (const provider of candidates) {
    const key = activeKeys.get(provider.id)?.key || '';
    const health = await checkProviderHealth(provider.id, key);
    if (health.isHealthy) {
      return {
        providerId: provider.id,
        providerName: provider.name,
        apiKey: key,
        baseUrl: provider.baseUrl,
        latencyMs: health.latencyMs,
        isFallback: provider.id !== (preferred || candidates[0]?.id),
      };
    }
  }

  return null; // All offline
}

/**
 * Get health status for all providers in a category (for UI display)
 */
export async function getAllProviderHealth(
  apiKeys: Map<string, string>,
): Promise<Array<ProviderConfig & HealthStatus & { apiKey?: string }>> {
  const results = await Promise.allSettled(
    PROVIDER_REGISTRY.map(async (p) => {
      const key = apiKeys.get(p.id) || '';
      const health = await checkProviderHealth(p.id, key);
      return { ...p, ...health, apiKey: key ? 'â€¢â€¢â€¢â€¢' : undefined };
    }),
  );

  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<any>).value);
}
