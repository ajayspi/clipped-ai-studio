"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useWizardStore } from './wizard-store';
import { Play, Pause, Loader2, Volume2, Sparkles, Check, Globe } from 'lucide-react';

interface VoiceItem {
  id: string;
  name: string;
  provider: 'openai' | 'azure' | 'elevenlabs' | 'google' | 'keyless';
  providerLabel: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  sampleText: string;
}

const ALL_VOICE_OPTIONS: Record<string, VoiceItem[]> = {
  'OpenAI TTS': [
    { id: 'alloy', name: 'Alloy', provider: 'openai', providerLabel: 'OpenAI', gender: 'neutral', language: 'en-US', sampleText: 'Hello! I am Alloy, an expressive and versatile voice from OpenAI.' },
    { id: 'echo', name: 'Echo', provider: 'openai', providerLabel: 'OpenAI', gender: 'male', language: 'en-US', sampleText: 'Hey there, I am Echo, with a warm and well-rounded male presence.' },
    { id: 'fable', name: 'Fable', provider: 'openai', providerLabel: 'OpenAI', gender: 'female', language: 'en-US', sampleText: 'Greetings! I am Fable, a British-accented voice crafted for narrative flair.' },
    { id: 'onyx', name: 'Onyx', provider: 'openai', providerLabel: 'OpenAI', gender: 'male', language: 'en-US', sampleText: 'I am Onyx, deep, resonant, and authoritative.' },
    { id: 'nova', name: 'Nova', provider: 'openai', providerLabel: 'OpenAI', gender: 'female', language: 'en-US', sampleText: 'Hi! I am Nova, energetic, bright, and engaging for vertical shorts.' },
    { id: 'shimmer', name: 'Shimmer', provider: 'openai', providerLabel: 'OpenAI', gender: 'female', language: 'en-US', sampleText: 'Hello, I am Shimmer, clear, crisp, and high-clarity.' },
  ],
  'Azure Speech (Neural)': [
    { id: 'en-US-JennyNeural', name: 'Jenny (Neural)', provider: 'azure', providerLabel: 'Azure', gender: 'female', language: 'en-US', sampleText: 'Welcome to Clipped AI. I am Jenny, a natural American English voice.' },
    { id: 'en-US-GuyNeural', name: 'Guy (Neural)', provider: 'azure', providerLabel: 'Azure', gender: 'male', language: 'en-US', sampleText: 'Hi, I am Guy, a confident and conversational American English voice.' },
    { id: 'en-US-AriaNeural', name: 'Aria (Neural)', provider: 'azure', providerLabel: 'Azure', gender: 'female', language: 'en-US', sampleText: 'Hello! I am Aria, featuring rich expressiveness and dynamic range.' },
    { id: 'en-IN-NeerjaNeural', name: 'Neerja (Neural)', provider: 'azure', providerLabel: 'Azure', gender: 'female', language: 'en-IN', sampleText: 'Namaste! I am Neerja, bringing natural Indian English narration.' },
    { id: 'en-IN-PrabhatNeural', name: 'Prabhat (Neural)', provider: 'azure', providerLabel: 'Azure', gender: 'male', language: 'en-IN', sampleText: 'Hello! I am Prabhat, delivering polished Indian English speech.' },
    { id: 'hi-IN-SwaraNeural', name: 'Swara (Hindi Neural)', provider: 'azure', providerLabel: 'Azure', gender: 'female', language: 'hi-IN', sampleText: 'नमस्ते! मैं स्वरा हूँ, आपकी वीडियो के लिए एकदम सटीक आवाज़।' },
    { id: 'hi-IN-MadhurNeural', name: 'Madhur (Hindi Neural)', provider: 'azure', providerLabel: 'Azure', gender: 'male', language: 'hi-IN', sampleText: 'नमस्ते! मैं मधुर हूँ, स्पष्ट और प्रभावशाली हिंदी आवाज़।' },
  ],
  'ElevenLabs': [
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Calm & Natural)', provider: 'elevenlabs', providerLabel: 'ElevenLabs', gender: 'female', language: 'en-US', sampleText: 'Hello there, Rachel here with ElevenLabs multilingual ultra-realistic speech.' },
    { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (Strong & Dynamic)', provider: 'elevenlabs', providerLabel: 'ElevenLabs', gender: 'female', language: 'en-US', sampleText: 'Hi, I am Domi, high-energy and modern for viral social content.' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Soft & Narration)', provider: 'elevenlabs', providerLabel: 'ElevenLabs', gender: 'female', language: 'en-US', sampleText: 'Hello, I am Bella, soft-spoken and ideal for story-driven videos.' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Well-Rounded)', provider: 'elevenlabs', providerLabel: 'ElevenLabs', gender: 'male', language: 'en-US', sampleText: 'Greetings! I am Antoni, a balanced voice tailored for documentaries.' },
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Deep & Viral)', provider: 'elevenlabs', providerLabel: 'ElevenLabs', gender: 'male', language: 'en-US', sampleText: 'Hey everyone, Adam here. Let’s create high-retention vertical clips.' },
  ],
  'Keyless / Free Fallbacks': [
    { id: 'free-en-us', name: 'US English (Edge Neural)', provider: 'keyless', providerLabel: 'Edge TTS', gender: 'female', language: 'en-US', sampleText: 'Hello from Microsoft Edge TTS! High quality narration, zero cost.' },
    { id: 'free-en-in', name: 'Indian English (Edge Neural)', provider: 'keyless', providerLabel: 'Edge TTS', gender: 'female', language: 'en-IN', sampleText: 'Namaste from Microsoft Edge TTS! Authentic Indian English voice, zero cost.' },
    { id: 'free-hi-in', name: 'Hindi (Edge Neural)', provider: 'keyless', providerLabel: 'Edge TTS', gender: 'female', language: 'hi-IN', sampleText: 'नमस्ते! यह माइक्रोसॉफ्ट एज टीटीएस है, उच्च गुणवत्ता की हिंदी आवाज़ बिना किसी शुल्क के।' },
  ]
};

export function VoiceStep() {
  const w = useWizardStore();
  const [selectedProvider, setSelectedProvider] = useState<string>('OpenAI TTS');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const voices = useMemo(() => ALL_VOICE_OPTIONS[selectedProvider] || [], [selectedProvider]);

  const handleSelectVoice = useCallback((v: VoiceItem) => {
    w.updateData({ voice: v.id, voiceProvider: v.provider });
  }, [w]);

  const handlePlayPreview = useCallback(async (e: React.MouseEvent, voice: VoiceItem) => {
    e.stopPropagation();

    if (playingVoiceId === voice.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingVoiceId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setIsLoadingAudio(voice.id);

    try {
      const res = await fetch('/api/tts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: voice.sampleText,
          voiceId: voice.id,
          provider: voice.provider,
          language: voice.language
        })
      });

      const data = await res.json();
      if (!data.audioUrl) throw new Error("No audio returned");

      const audio = new Audio(data.audioUrl);
      audioRef.current = audio;
      audio.volume = volume;

      audio.onended = () => setPlayingVoiceId(null);

      await audio.play();
      setPlayingVoiceId(voice.id);
    } catch (err) {
      console.error("Preview playback failed", err);
    } finally {
      setIsLoadingAudio(null);
    }
  }, [playingVoiceId, volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
          <Volume2 className="h-6 w-6 text-purple-400" /> Voice Synthesis
        </h2>
        <p className="text-white/50 text-sm">Select a highly realistic AI voice for narration</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {Object.keys(ALL_VOICE_OPTIONS).map(provider => (
          <button
            key={provider}
            onClick={() => setSelectedProvider(provider)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all \${
              selectedProvider === provider
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-white/5 text-white/60 border border-white/5 hover:bg-white/10 hover:text-white/90'
            }`}
          >
            {provider}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {voices.map((v) => {
          const isSelected = w.voice === v.id;
          const isPlaying = playingVoiceId === v.id;
          const isLoading = isLoadingAudio === v.id;

          return (
            <div
              key={v.id}
              onClick={() => handleSelectVoice(v)}
              className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer \${
                isSelected
                  ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => handlePlayPreview(e, v)}
                  disabled={isLoadingAudio !== null && !isLoading}
                  className={`h-10 w-10 rounded-full flex items-center justify-center transition-all \${
                    isPlaying || isLoading
                      ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5" />
                  )}
                </button>
                <div className="flex flex-col">
                  <span className={`text-sm font-medium transition-colors \${isSelected ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>
                    {v.name}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      {v.gender === 'female' ? '♀' : v.gender === 'male' ? '♂' : '⚥'} {v.gender}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {v.language}
                    </span>
                  </div>
                </div>
              </div>

              {isSelected && (
                <div className="h-6 w-6 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                  <Check className="h-3.5 w-3.5 text-purple-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-medium text-white/80">Voice Adjustments</h3>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-xs text-white/50">Playback Speed</label>
              <span className="text-xs text-purple-400 font-medium">{w.voiceSpeed}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={w.voiceSpeed}
              onChange={(e) => w.updateData({ voiceSpeed: parseFloat(e.target.value) })}
              className="w-full accent-purple-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-xs text-white/50">Preview Volume</label>
              <span className="text-xs text-purple-400 font-medium">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-purple-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

    </div>
  );
}
