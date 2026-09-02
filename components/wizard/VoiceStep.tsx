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
    <div className="space-y-6">
      {/* Voiceover Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" />
              Voiceover Engine & Model
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select your AI synthesis provider and test speech voices in real-time.
            </p>
          </div>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3 h-3" /> Real-Time Preview
          </span>
        </div>

        {/* Provider Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Synthesis Provider
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {Object.keys(ALL_VOICE_OPTIONS).map((providerName) => {
              const isSelected = w.voiceService === providerName;
              return (
                <button
                  key={providerName}
                  type="button"
                  onClick={() => handleProviderChange(providerName)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all text-center gap-1 ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary shadow-sm font-semibold'
                      : 'border-input bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{providerName}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Voice Cards Grid with Interactive Audio Preview */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Available Voices ({availableVoices.length})
            </label>
            {previewError && (
              <span className="text-xs text-red-500 font-medium">{previewError}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableVoices.map((voiceItem) => {
              const isSelected = w.voice === voiceItem.id;
              const isLoading = loadingVoiceId === voiceItem.id;
              const isPlaying = playingVoiceId === voiceItem.id;

              return (
                <div
                  key={voiceItem.id}
                  onClick={() => w.set('voice', voiceItem.id)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                      : 'border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {voiceItem.name}
                      </span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border">
                        {voiceItem.providerLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border">
                        <Globe className="w-2.5 h-2.5" /> {voiceItem.language}
                      </span>
                      <span className="inline-flex items-center capitalize px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border">
                        {voiceItem.gender}
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
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                      isPlaying
                        ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2 animate-pulse'
                        : isSelected
                        ? 'bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Speed / Rate Setting */}
        <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-foreground">Speech Speed / Pace Rate</span>
            <span className="font-mono text-primary font-semibold">{w.voiceSpeed || 1.0}x</span>
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
      </div>

      <hr className="border-border" />

      {/* Background Music Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Background Soundtrack</h3>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Music Preset
          </label>
          <select 
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
      </div>
    </div>
  );
}
