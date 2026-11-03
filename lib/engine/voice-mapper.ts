/**
 * Voice Mapping Engine for Micro-Drama & Multi-Character Pipelines
 * 
 * Maps character voice slugs (e.g. onyx, nova, echo, shimmer, fable)
 * to authentic high-fidelity Edge TTS neural voice models.
 * Ensures zero-cost, $0 compute offline dialogue synthesis.
 */

export interface VoicePreset {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  edgeVoice: string;
  openAiSlug: string;
  elevenLabsId?: string;
  description: string;
  archetype: string;
}

export const DRAMA_VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'onyx',
    name: 'Onyx',
    gender: 'male',
    edgeVoice: 'en-US-GuyNeural',
    openAiSlug: 'onyx',
    elevenLabsId: 'ErXwobaYiN019PkySvjV',
    archetype: 'Gritty Noir Detective',
    description: 'Deep, gravelly, stoic protagonist tone with dramatic weight',
  },
  {
    id: 'nova',
    name: 'Nova',
    gender: 'female',
    edgeVoice: 'en-US-JennyNeural',
    openAiSlug: 'nova',
    elevenLabsId: 'EXAVITQu4vr4xnSDxMaL',
    archetype: 'Sharp Neuroscientist / Executive',
    description: 'Crisp, articulate, confident female presence',
  },
  {
    id: 'echo',
    name: 'Echo',
    gender: 'male',
    edgeVoice: 'en-US-ChristopherNeural',
    openAiSlug: 'echo',
    elevenLabsId: '21m00Tcm4TlvDq8ikWAM',
    archetype: 'Calm Analyst / Hacker',
    description: 'Measured, intellectual, analytical pacing',
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    gender: 'female',
    edgeVoice: 'en-US-AriaNeural',
    openAiSlug: 'shimmer',
    elevenLabsId: 'AZnzlk1XvdvUeBnXmlld',
    archetype: 'Empathetic / Melodramatic Lead',
    description: 'Warm, emotional, expressive character dialogue',
  },
  {
    id: 'fable',
    name: 'Fable',
    gender: 'male',
    edgeVoice: 'en-GB-RyanNeural',
    openAiSlug: 'fable',
    elevenLabsId: 'CYw3kZ02Hs0563khs1Fj',
    archetype: 'British Mastermind / Antagonist',
    description: 'Sophisticated, cunning, British-accented villain',
  },
  {
    id: 'alloy',
    name: 'Alloy',
    gender: 'neutral',
    edgeVoice: 'en-US-EricNeural',
    openAiSlug: 'alloy',
    archetype: 'Balanced Narrator / Bystander',
    description: 'Neutral, dynamic, versatile conversational speech',
  },
];

const VOICE_LOOKUP: Record<string, string> = {
  onyx: 'en-US-GuyNeural',
  nova: 'en-US-JennyNeural',
  echo: 'en-US-ChristopherNeural',
  shimmer: 'en-US-AriaNeural',
  fable: 'en-GB-RyanNeural',
  alloy: 'en-US-EricNeural',
  guy: 'en-US-GuyNeural',
  jenny: 'en-US-JennyNeural',
  christopher: 'en-US-ChristopherNeural',
  aria: 'en-US-AriaNeural',
  ryan: 'en-GB-RyanNeural',
};

/**
 * Resolves a character's voice setting to an authoritative Edge TTS neural voice ID.
 * If already an explicit neural voice ID (e.g. en-US-GuyNeural), passes through directly.
 */
export function resolveVoiceForCharacter(voiceKey?: string, defaultGender: 'male' | 'female' = 'male'): string {
  if (!voiceKey || !voiceKey.trim()) {
    return defaultGender === 'female' ? 'en-US-JennyNeural' : 'en-US-GuyNeural';
  }

  const clean = voiceKey.trim();

  // If already full Edge voice identifier (contains 'Neural' or locale tag)
  if (clean.includes('Neural') || clean.includes('-')) {
    return clean;
  }

  const normalized = clean.toLowerCase();
  if (VOICE_LOOKUP[normalized]) {
    return VOICE_LOOKUP[normalized];
  }

  return defaultGender === 'female' ? 'en-US-JennyNeural' : 'en-US-GuyNeural';
}
