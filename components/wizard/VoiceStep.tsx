"use client";

import { useState, useRef, useEffect } from 'react';
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
  'Google Cloud': [
    { id: 'en-US-Journey-F', name: 'Journey Female (en-US)', provider: 'google', providerLabel: 'Google', gender: 'female', language: 'en-US', sampleText: 'Hello, this is Google Cloud Journey voice with natural intonation.' },
    { id: 'en-US-Journey-D', name: 'Journey Male (en-US)', provider: 'google', providerLabel: 'Google', gender: 'male', language: 'en-US', sampleText: 'Hi, this is Google Cloud Journey male voice.' },
    { id: 'en-IN-Neural2-A', name: 'Neural2 Female (en-IN)', provider: 'google', providerLabel: 'Google', gender: 'female', language: 'en-IN', sampleText: 'Welcome! This is Google Cloud Neural2 Indian English voice.' },
    { id: 'hi-IN-Neural2-A', name: 'Neural2 Female (hi-IN)', provider: 'google', providerLabel: 'Google', gender: 'female', language: 'hi-IN', sampleText: 'नमस्ते! यह गूगल क्लाउड न्यूरल हिंदी आवाज़ है।' },
  ],
  'Free & Keyless': [
    { id: 'free-en-us', name: 'Free English (US)', provider: 'keyless', providerLabel: 'Free / Keyless', gender: 'female', language: 'en-US', sampleText: 'Hello! This is a free, instant keyless voice powered by Clipped AI.' },
    { id: 'free-en-in', name: 'Free Indian English', provider: 'keyless', providerLabel: 'Free / Keyless', gender: 'female', language: 'en-IN', sampleText: 'Namaste! This is the free keyless Indian English voice option.' },
    { id: 'free-hi-in', name: 'Free Hindi Voice', provider: 'keyless', providerLabel: 'Free / Keyless', gender: 'female', language: 'hi-IN', sampleText: 'नमस्ते! यह क्लिप्ड एआई का निःशुल्क वॉयस विकल्प है।' },
  ],
};

export function VoiceStep() {
  const w = useWizardStore();

  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const activeProviderKey = w.voiceService || 'OpenAI TTS';
  const availableVoices = ALL_VOICE_OPTIONS[activeProviderKey] || ALL_VOICE_OPTIONS['OpenAI TTS'];

  // Handle Play/Pause Voice Preview
  const handleTogglePreview = async (voiceItem: VoiceItem) => {
    setPreviewError(null);

    // If already playing this voice, pause it
    if (playingVoiceId === voiceItem.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingVoiceId(null);
      return;
    }

    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingVoiceId(null);
    }

    setLoadingVoiceId(voiceItem.id);

    try {
      const res = await fetch('/api/tts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: voiceItem.sampleText,
          voiceId: voiceItem.id,
          provider: voiceItem.provider,
          language: voiceItem.language,
          speed: w.voiceSpeed || 1.0,
          volume: w.voiceVolume || 100,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.audioUrl) {
        throw new Error(data.error || 'Failed to generate audio preview');
      }

      const audio = new Audio(data.audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingVoiceId(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setPlayingVoiceId(null);
        setPreviewError('Failed to playback audio in browser');
      };

      await audio.play();
      setPlayingVoiceId(voiceItem.id);
    } catch (err: any) {
      console.error('Audio preview error:', err);
      setPreviewError(err.message || 'Error generating preview audio');
    } finally {
      setLoadingVoiceId(null);
    }
  };

  const handleProviderChange = (newProvider: string) => {
    w.set('voiceService', newProvider);
    const newVoices = ALL_VOICE_OPTIONS[newProvider];
    if (newVoices && newVoices.length > 0) {
      w.set('voice', newVoices[0].id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Voiceover Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              Voiceover Engine & Model
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Select your AI synthesis provider and test speech voices in real-time.
            </p>
          </div>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-2.5 h-2.5" /> Real-Time Preview
          </span>
        </div>

        {/* Provider Selector — Compact horizontal pills */}
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(ALL_VOICE_OPTIONS).map((providerName) => {
            const isSelected = w.voiceService === providerName;
            return (
              <button
                key={providerName}
                type="button"
                onClick={() => handleProviderChange(providerName)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                    : 'border border-input bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {providerName}
                {isSelected && <span className="w-1 h-1 rounded-full bg-primary-foreground" />}
              </button>
            );
          })}
        </div>

        {/* Voice Cards — Scrollable grid, max 3 rows visible */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Available Voices ({availableVoices.length})
            </label>
            {previewError && (
              <span className="text-[10px] text-red-500 font-medium">{previewError}</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
            {availableVoices.map((voiceItem) => {
              const isSelected = w.voice === voiceItem.id;
              const isLoading = loadingVoiceId === voiceItem.id;
              const isPlaying = playingVoiceId === voiceItem.id;

              return (
                <div
                  key={voiceItem.id}
                  onClick={() => w.set('voice', voiceItem.id)}
                  className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                      : 'border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-foreground truncate">
                        {voiceItem.name}
                      </span>
                      {isSelected && (
                        <span className="w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                          <Check className="w-2 h-2" />
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted text-muted-foreground border">
                        {voiceItem.providerLabel}
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted text-muted-foreground border">
                        <Globe className="w-2 h-2" /> {voiceItem.language}
                      </span>
                    </div>
                  </div>

                  {/* Play / Pause Preview Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePreview(voiceItem);
                    }}
                    disabled={isLoading}
                    title={isPlaying ? 'Pause Sample Preview' : 'Play Sample Preview'}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 ${
                      isPlaying
                        ? 'bg-primary text-primary-foreground shadow-md animate-pulse'
                        : isSelected
                        ? 'bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-3 h-3 fill-current" />
                    ) : (
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Speech Rate & Volume — Side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 border space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-foreground">Speech Rate (1.0 means 1x speed)</span>
              <span className="font-mono text-primary font-semibold text-[11px]">{w.voiceSpeed || 1.0}</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.5"
              step="0.05"
              value={w.voiceSpeed || 1.0}
              onChange={(e) => w.set('voiceSpeed', parseFloat(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-foreground">Speech Volume (1.0 represents 100%)</span>
              <span className="font-mono text-primary font-semibold text-[11px]">{(w.voiceVolume / 100).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={(w.voiceVolume || 100) / 100}
              onChange={(e) => w.set('voiceVolume', Math.round(parseFloat(e.target.value) * 100))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        </div>

        {/* Background Music — Side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 border space-y-1.5">
            <label className="text-xs font-medium text-foreground block">Background Music</label>
            <select 
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={w.musicSource}
              onChange={(e) => w.set('musicSource', e.target.value)}
            >
              <option>Random Background Music</option>
              <option>Epic / Cinematic</option>
              <option>Lo-Fi / Chill</option>
              <option>Upbeat / Energy</option>
              <option>Ambient / Subtle</option>
              <option>None</option>
            </select>
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-foreground truncate" title="Background Music Volume (0.2 represents 20%, background music should not be too loud)">Music Volume (0.2 represents 20%)</span>
              <span className="font-mono text-primary font-semibold text-[11px]">{(w.musicVolume / 100).toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={(w.musicVolume || 20) / 100}
              onChange={(e) => w.set('musicVolume', Math.round(parseFloat(e.target.value) * 100))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
