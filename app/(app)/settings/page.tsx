"use client";

import { useState, useEffect, useRef } from "react";
import {
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  PlayCircle,
  Settings,
  Image as ImageIcon,
  Mic,
  Layout,
  PieChart,
  Palette,
  Database,
  Eye,
  EyeOff,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Server,
  Activity,
  Code2,
  X,
  Plus,
  Play,
  Pause,
  Volume2,
  Globe,
  Radio,
  Search,
  Sliders,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabase, TestConnectionResult } from "@/lib/supabase/context";
import { ApiProviderHub } from "@/components/settings/ApiProviderHub";

interface ApiKeyData {
  isConfigured: boolean;
  maskedValue: string;
  isActive: boolean;
  updatedAt: string;
  name?: string;
  category?: string;
  isCustom?: boolean;
  baseUrl?: string;
}

interface CustomProviderData {
  id: string;
  name: string;
  category: string;
  isConfigured: boolean;
  isActive: boolean;
  maskedValue: string;
  updatedAt: string | null;
}

interface VoiceModelItem {
  id: string;
  name: string;
  provider: 'azure' | 'openai' | 'elevenlabs' | 'google' | 'keyless';
  providerLabel: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  description: string;
  sampleText: string;
}

const BASE_PROVIDERS = [
  // AI Models
  { id: "api_openai", name: "OpenAI (GPT-4o & TTS)", category: "AI Models" },
  { id: "api_gemini", name: "Google Gemini", category: "AI Models" },
  { id: "api_anthropic", name: "Anthropic Claude", category: "AI Models" },
  { id: "api_openrouter", name: "OpenRouter", category: "AI Models" },
  { id: "api_groq", name: "Groq Cloud (Fast Llama)", category: "AI Models" },
  { id: "api_deepseek", name: "DeepSeek API", category: "AI Models" },
  { id: "api_grok", name: "xAI Grok", category: "AI Models" },
  { id: "api_fal", name: "Fal.ai", category: "AI Models" },

  // Stock Media
  { id: "api_pexels", name: "Pexels Video & Images", category: "Stock Media" },
  { id: "api_pixabay", name: "Pixabay Media", category: "Stock Media" },
  { id: "api_kling", name: "Kling Video AI", category: "Stock Media" },
  { id: "api_luma", name: "Luma Dream Machine", category: "Stock Media" },
  { id: "api_huggingface", name: "Hugging Face (Free AI Video)", category: "Stock Media" },

  // Voice & Audio
  { id: "api_azure_speech", name: "Azure Speech Services (Neural TTS)", category: "Voice & Audio" },
  { id: "api_azure_region", name: "Azure Speech Region (e.g. eastus)", category: "Voice & Audio" },
  { id: "api_elevenlabs", name: "ElevenLabs Voice AI", category: "Voice & Audio" },
  { id: "api_google_tts", name: "Google Cloud Text-to-Speech", category: "Voice & Audio" },
  { id: "api_deepgram", name: "Deepgram Audio", category: "Voice & Audio" },
  { id: "api_suno", name: "Suno AI Music", category: "Voice & Audio" },

  // Avatar
  { id: "api_heygen", name: "HeyGen Avatar", category: "Avatar" },
  { id: "api_did", name: "D-ID Avatar", category: "Avatar" },
];

const CATEGORIES = [
  "AI Models",
  "Voice & Audio",
  "Stock Media",
  "Brand Kits",
  "Usage & Quotas",
  "Database & Supabase",
  "API Health Hub",
];

const STATIC_VOICE_CATALOG: VoiceModelItem[] = [
  // OpenAI
  { id: "alloy", name: "Alloy", provider: "openai", providerLabel: "OpenAI", language: "en-US", gender: "neutral", description: "Balanced, versatile, and natural tone", sampleText: "Hello! I am Alloy, an expressive and versatile voice from OpenAI." },
  { id: "echo", name: "Echo", provider: "openai", providerLabel: "OpenAI", language: "en-US", gender: "male", description: "Warm, resonant, and balanced male tone", sampleText: "Hey there, I am Echo, with a warm and well-rounded male presence." },
  { id: "fable", name: "Fable", provider: "openai", providerLabel: "OpenAI", language: "en-US", gender: "female", description: "Expressive British accent for narratives", sampleText: "Greetings! I am Fable, a British-accented voice crafted for narrative flair." },
  { id: "onyx", name: "Onyx", provider: "openai", providerLabel: "OpenAI", language: "en-US", gender: "male", description: "Deep, authoritative, and powerful male tone", sampleText: "I am Onyx, deep, resonant, and authoritative." },
  { id: "nova", name: "Nova", provider: "openai", providerLabel: "OpenAI", language: "en-US", gender: "female", description: "Energetic, cheerful, and engaging female tone", sampleText: "Hi! I am Nova, energetic, bright, and engaging for vertical shorts." },
  { id: "shimmer", name: "Shimmer", provider: "openai", providerLabel: "OpenAI", language: "en-US", gender: "female", description: "Clear, crisp, and high-clarity female tone", sampleText: "Hello, I am Shimmer, clear, crisp, and high-clarity." },

  // Azure Neural Voices
  { id: "en-US-JennyNeural", name: "Jenny (Neural)", provider: "azure", providerLabel: "Azure", language: "en-US", gender: "female", description: "Natural, conversational US English", sampleText: "Welcome to Clipped AI. I am Jenny, a natural American English voice." },
  { id: "en-US-GuyNeural", name: "Guy (Neural)", provider: "azure", providerLabel: "Azure", language: "en-US", gender: "male", description: "Confident, friendly US English male", sampleText: "Hi, I am Guy, a confident and conversational American English voice." },
  { id: "en-US-AriaNeural", name: "Aria (Neural)", provider: "azure", providerLabel: "Azure", language: "en-US", gender: "female", description: "Versatile, rich expressiveness and dynamic range", sampleText: "Hello! I am Aria, featuring rich expressiveness and dynamic range." },
  { id: "en-IN-NeerjaNeural", name: "Neerja (Neural)", provider: "azure", providerLabel: "Azure", language: "en-IN", gender: "female", description: "Authentic Indian English female", sampleText: "Namaste! I am Neerja, bringing natural Indian English narration." },
  { id: "en-IN-PrabhatNeural", name: "Prabhat (Neural)", provider: "azure", providerLabel: "Azure", language: "en-IN", gender: "male", description: "Professional Indian English male", sampleText: "Hello! I am Prabhat, delivering polished Indian English speech." },
  { id: "hi-IN-SwaraNeural", name: "Swara (Hindi Neural)", provider: "azure", providerLabel: "Azure", language: "hi-IN", gender: "female", description: "Natural, fluent Hindi female", sampleText: "नमस्ते! मैं स्वरा हूँ, आपकी वीडियो के लिए एकदम सटीक आवाज़।" },
  { id: "hi-IN-MadhurNeural", name: "Madhur (Hindi Neural)", provider: "azure", providerLabel: "Azure", language: "hi-IN", gender: "male", description: "Warm, clear Hindi male", sampleText: "नमस्ते! मैं मधुर हूँ, स्पष्ट और प्रभावशाली हिंदी आवाज़।" },
  { id: "ta-IN-PallaviNeural", name: "Pallavi (Tamil Neural)", provider: "azure", providerLabel: "Azure", language: "ta-IN", gender: "female", description: "Expressive Tamil female narration", sampleText: "வணக்கம்! நான் பல்லவி, சிறந்த தமிழ் குரல்." },
  { id: "te-IN-ShrutiNeural", name: "Shruti (Telugu Neural)", provider: "azure", providerLabel: "Azure", language: "te-IN", gender: "female", description: "Fluent Telugu female narration", sampleText: "నమస్కారం! నేను శృతి, తెలుగు వీడియోల కోసం ఉత్తమ స్వరం." },

  // ElevenLabs
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", provider: "elevenlabs", providerLabel: "ElevenLabs", language: "en-US", gender: "female", description: "Calm, natural, and realistic multilingual speech", sampleText: "Hello there, Rachel here with ElevenLabs multilingual ultra-realistic speech." },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", provider: "elevenlabs", providerLabel: "ElevenLabs", language: "en-US", gender: "female", description: "Strong, dynamic, and viral short-form tone", sampleText: "Hi, I am Domi, high-energy and modern for viral social content." },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", provider: "elevenlabs", providerLabel: "ElevenLabs", language: "en-US", gender: "male", description: "Well-rounded and clear documentary tone", sampleText: "Greetings! I am Antoni, a balanced voice tailored for documentaries." },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", provider: "elevenlabs", providerLabel: "ElevenLabs", language: "en-US", gender: "male", description: "Deep, resonant, and high-retention viral voice", sampleText: "Hey everyone, Adam here. Let’s create high-retention vertical clips." },

  // Google Cloud
  { id: "en-US-Journey-F", name: "Journey Female", provider: "google", providerLabel: "Google", language: "en-US", gender: "female", description: "Google Cloud Journey voice with natural intonation", sampleText: "Hello, this is Google Cloud Journey voice with natural intonation." },
  { id: "en-US-Journey-D", name: "Journey Male", provider: "google", providerLabel: "Google", language: "en-US", gender: "male", description: "Google Cloud Journey male voice", sampleText: "Hi, this is Google Cloud Journey male voice." },
  { id: "en-IN-Neural2-A", name: "Neural2 Female (en-IN)", provider: "google", providerLabel: "Google", language: "en-IN", gender: "female", description: "Google Cloud Neural2 Indian English voice", sampleText: "Welcome! This is Google Cloud Neural2 Indian English voice." },

  // Free / Keyless
  { id: "free-en-us", name: "Free English (US)", provider: "keyless", providerLabel: "Free / Keyless", language: "en-US", gender: "female", description: "High-speed zero-cost keyless voice", sampleText: "Hello! This is a free, instant keyless voice powered by Clipped AI." },
  { id: "free-en-in", name: "Free Indian English", provider: "keyless", providerLabel: "Free / Keyless", language: "en-IN", gender: "female", description: "High-speed keyless Indian English", sampleText: "Namaste! This is the free keyless Indian English voice option." },
  { id: "free-hi-in", name: "Free Hindi Voice", provider: "keyless", providerLabel: "Free / Keyless", language: "hi-IN", gender: "female", description: "High-speed keyless Hindi voice", sampleText: "नमस्ते! यह क्लिप्ड एआई का निःशुल्क वॉयस विकल्प है।" },
];

const SCHEMA_DDL_SQL = `-- =========================================================================
-- Clipped AI Studio - Complete PostgreSQL Schema & RLS Setup
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    tier TEXT DEFAULT 'free',
    niches TEXT[],
    storage_preference TEXT DEFAULT 'cloud',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Videos table
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    script TEXT,
    workflow TEXT DEFAULT 'standard',
    status TEXT DEFAULT 'draft',
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Render Jobs table
CREATE TABLE IF NOT EXISTS public.render_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    logs TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. API Credits table
CREATE TABLE IF NOT EXISTS public.api_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    free_quota INTEGER DEFAULT 0,
    used_this_month INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Published Videos table
CREATE TABLE IF NOT EXISTS public.published_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    platform_id TEXT,
    url TEXT,
    view_count INTEGER DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Settings table (API Keys and Configuration)
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, provider)
);

-- 7. Scheduled Posts table
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES public.render_jobs(id) ON DELETE CASCADE,
    platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
    caption TEXT,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    result_urls JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status_time ON public.scheduled_posts(status, scheduled_for);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_videos_modtime ON public.videos;
CREATE TRIGGER update_videos_modtime 
BEFORE UPDATE ON public.videos 
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_api_credits_modtime ON public.api_credits;
CREATE TRIGGER update_api_credits_modtime 
BEFORE UPDATE ON public.api_credits 
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_settings_modtime ON public.settings;
CREATE TRIGGER update_settings_modtime 
BEFORE UPDATE ON public.settings 
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Row Level Security (RLS) Setup
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own videos" ON public.videos FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.api_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own credits" ON public.api_credits FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own settings" ON public.settings FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own posts" ON public.scheduled_posts FOR ALL USING (true);
`;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("AI Models");
  const [keys, setKeys] = useState<Record<string, ApiKeyData>>({});
  const [customProviders, setCustomProviders] = useState<CustomProviderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});

  // Voice Catalog State
  const [voiceFilter, setVoiceFilter] = useState<string>("All");
  const [voiceSearch, setVoiceSearch] = useState<string>("");
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voicePreviewError, setVoicePreviewError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Custom Provider Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customCategory, setCustomCategory] = useState("AI Models");
  const [savingCustom, setSavingCustom] = useState(false);
  const [customModalError, setCustomModalError] = useState<string | null>(null);

  // Supabase Context & State
  const {
    url: activeSupabaseUrl,
    anonKey: activeSupabaseAnonKey,
    isCustom,
    status: supabaseStatus,
    latencyMs,
    schemaStatus,
    setCustomConfig,
    resetToDefault,
    testConnection,
  } = useSupabase();

  const [dbUrlInput, setDbUrlInput] = useState(activeSupabaseUrl);
  const [dbKeyInput, setDbKeyInput] = useState(activeSupabaseAnonKey);
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [savingDb, setSavingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<TestConnectionResult | null>(null);
  const [showDdlModal, setShowDdlModal] = useState(false);
  const [ddlCopied, setDdlCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [dbFeedback, setDbFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  useEffect(() => {
    fetchKeys();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setDbUrlInput(activeSupabaseUrl);
    setDbKeyInput(activeSupabaseAnonKey);
  }, [activeSupabaseUrl, activeSupabaseAnonKey]);

  async function fetchKeys() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/keys");
      const data = await res.json();
      if (data.keys) {
        setKeys(data.keys);
      }
      if (data.customProviders) {
        setCustomProviders(data.customProviders);
      }
    } catch (err) {
      console.error("Failed to load keys", err);
    } finally {
      setLoading(false);
    }
  }

  async function testKey(providerId: string) {
    setTesting(providerId);
    try {
      const res = await fetch("/api/settings/keys/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [providerId]: { success: data.success, message: data.message || data.error },
      }));
      return data.success;
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: { success: false, message: "Network error" },
      }));
      return false;
    } finally {
      setTesting(null);
    }
  }

  async function testAll() {
    setTestingAll(true);
    const allKnown = getAllProvidersForActiveTab();
    const promises = allKnown.filter((p) => keys[p.id]?.isConfigured).map((p) => testKey(p.id));
    await Promise.all(promises);
    setTestingAll(false);
  }

  async function saveKey(providerId: string) {
    const value = inputs[providerId];
    if (!value) return;

    setSaving(providerId);
    try {
      const res = await fetch("/api/settings/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId, apiKey: value }),
      });

      if (res.ok) {
        setInputs((prev) => ({ ...prev, [providerId]: "" }));
        await fetchKeys();
      }
    } catch (err) {
      console.error("Failed to save key", err);
    } finally {
      setSaving(null);
    }
  }

  async function handleAddCustomProvider() {
    if (!customName.trim()) {
      setCustomModalError("Provider name is required");
      return;
    }

    setSavingCustom(true);
    setCustomModalError(null);

    const providerId = `custom_${customName.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;

    try {
      const res = await fetch("/api/settings/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: providerId,
          name: customName.trim(),
          apiKey: customKey.trim(),
          category: customCategory,
          baseUrl: customBaseUrl.trim() || undefined,
          isActive: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save custom provider");
      }

      setShowCustomModal(false);
      setCustomName("");
      setCustomKey("");
      setCustomBaseUrl("");
      await fetchKeys();
    } catch (err: any) {
      setCustomModalError(err.message || "Failed to save custom provider");
    } finally {
      setSavingCustom(false);
    }
  }

  // Voice Preview Play / Pause Controller
  const handleToggleVoicePreview = async (voice: VoiceModelItem) => {
    setVoicePreviewError(null);

    if (playingVoiceId === voice.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingVoiceId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingVoiceId(null);
    }

    setLoadingVoiceId(voice.id);

    try {
      const res = await fetch("/api/tts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: voice.sampleText,
          voiceId: voice.id,
          provider: voice.provider,
          language: voice.language,
          speed: 1.0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.audioUrl) {
        throw new Error(data.error || "Failed to synthesize sample audio");
      }

      const audio = new Audio(data.audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingVoiceId(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setPlayingVoiceId(null);
        setVoicePreviewError("Audio playback failed in browser");
      };

      await audio.play();
      setPlayingVoiceId(voice.id);
    } catch (err: any) {
      console.error("Preview error:", err);
      setVoicePreviewError(err.message || "Could not play voice preview");
    } finally {
      setLoadingVoiceId(null);
    }
  };

  // Combine static and dynamic custom providers
  function getAllProvidersForActiveTab() {
    const staticForTab = BASE_PROVIDERS.filter((p) => p.category === activeTab);
    const dynamicForTab = customProviders
      .filter((cp) => cp.category === activeTab)
      .map((cp) => ({
        id: cp.id,
        name: `${cp.name} (Custom)`,
        category: cp.category,
      }));

    return [...staticForTab, ...dynamicForTab];
  }

  // Filtered voice models
  const filteredVoices = STATIC_VOICE_CATALOG.filter((voice) => {
    const matchesFilter =
      voiceFilter === "All" ||
      (voiceFilter === "Azure" && voice.provider === "azure") ||
      (voiceFilter === "OpenAI" && voice.provider === "openai") ||
      (voiceFilter === "ElevenLabs" && voice.provider === "elevenlabs") ||
      (voiceFilter === "Google" && voice.provider === "google") ||
      (voiceFilter === "Free/Keyless" && voice.provider === "keyless");

    const matchesSearch =
      !voiceSearch.trim() ||
      voice.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
      voice.language.toLowerCase().includes(voiceSearch.toLowerCase()) ||
      voice.description.toLowerCase().includes(voiceSearch.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Database Tab Actions
  async function handleTestDbConnection() {
    setTestingDb(true);
    setDbFeedback(null);
    try {
      const result = await testConnection(dbUrlInput, dbKeyInput);
      setDbTestResult(result);
      if (result.reachable) {
        setDbFeedback({
          type: result.schema?.isHealthy ? "success" : "info",
          message: result.message,
        });
      } else {
        setDbFeedback({
          type: "error",
          message: result.message || "Failed to reach Supabase project.",
        });
      }
    } catch (err: any) {
      setDbFeedback({
        type: "error",
        message: err.message || "Network test failed.",
      });
    } finally {
      setTestingDb(false);
    }
  }

  async function handleSaveDbConnection() {
    setSavingDb(true);
    setDbFeedback(null);
    try {
      const result = await setCustomConfig(dbUrlInput, dbKeyInput);
      setDbTestResult(result);
      if (result.reachable) {
        setDbFeedback({
          type: "success",
          message: "Custom Supabase credentials saved and active across Studio!",
        });
      } else {
        setDbFeedback({
          type: "error",
          message: result.message || "Credentials could not be verified.",
        });
      }
    } catch (err: any) {
      setDbFeedback({
        type: "error",
        message: err.message || "Failed to save configuration.",
      });
    } finally {
      setSavingDb(false);
    }
  }

  function handleResetDbConnection() {
    resetToDefault();
    setDbTestResult(null);
    setDbFeedback({
      type: "info",
      message: "Reset to default environment Supabase configuration.",
    });
  }

  function handleCopyDdl() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(SCHEMA_DDL_SQL);
      setDdlCopied(true);
      setTimeout(() => setDdlCopied(false), 2500);
    }
  }

  function handleCopyUrl(urlToCopy: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(urlToCopy);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentTabProviders = getAllProvidersForActiveTab();

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your AI synthesis engines, voice models, custom LLMs, and cloud database.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCustomModal(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 h-10 px-4 py-2"
          >
            <Plus className="w-4 h-4" />
            Add Custom API
          </button>
          <button
            onClick={testAll}
            disabled={testingAll}
            className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 h-10 px-5 py-2 disabled:opacity-50"
          >
            {testingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            Run System Diagnostics
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Vertical Tabs Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-4 md:pb-0 relative">
            {CATEGORIES.map((category) => {
              const isActive = activeTab === category;
              return (
                <button
                  key={category}
                  onClick={() => setActiveTab(category)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-tab"
                      className="absolute inset-0 bg-primary/10 rounded-md -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {category === "AI Models" && <Settings className="w-4 h-4" />}
                    {category === "Voice & Audio" && <Mic className="w-4 h-4" />}
                    {category === "Stock Media" && <ImageIcon className="w-4 h-4" />}
                    {category === "Brand Kits" && <Layout className="w-4 h-4" />}
                    {category === "Usage & Quotas" && <PieChart className="w-4 h-4" />}
                    {category === "Database & Supabase" && <Database className="w-4 h-4" />}
                    {category}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Tab Content Area */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "Voice & Audio" ? (
                <div className="space-y-8">
                  {/* Voice API Keys Card */}
                  <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-muted/20">
                      <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                          <Mic className="w-5 h-5 text-primary" />
                          Voice Synthesis Credentials
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Configure API keys for Azure Speech, OpenAI TTS, ElevenLabs, and Google Cloud.
                        </p>
                      </div>
                    </div>

                    <div className="divide-y">
                      {currentTabProviders.map((provider) => {
                        const keyData = keys[provider.id];
                        const isConfigured = keyData?.isConfigured;
                        const testState = testResults[provider.id];
                        const isTesting = testing === provider.id || testingAll;

                        return (
                          <div
                            key={provider.id}
                            className="p-5 flex flex-col xl:flex-row gap-5 items-start xl:items-center justify-between hover:bg-muted/30 transition-colors"
                          >
                            <div className="space-y-1 min-w-[200px]">
                              <div className="font-medium text-sm flex items-center gap-2">
                                {provider.name}
                                {isConfigured ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {isConfigured
                                  ? `Configured (${keyData?.source || "database"})`
                                  : "Not configured"}
                              </div>
                              {testState && (
                                <div
                                  className={`text-xs mt-1 font-medium ${
                                    testState.success ? "text-green-500" : "text-red-500"
                                  }`}
                                >
                                  {testState.message}
                                </div>
                              )}
                            </div>

                            <div className="flex-1 w-full max-w-xl flex flex-col gap-2">
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <div className="relative flex-1">
                                  <input
                                    type="password"
                                    placeholder={isConfigured ? keyData?.maskedValue : "Enter API Key / Region"}
                                    value={inputs[provider.id] || ""}
                                    onChange={(e) =>
                                      setInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))
                                    }
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveKey(provider.id)}
                                    disabled={!inputs[provider.id] || saving === provider.id}
                                    className="inline-flex items-center justify-center rounded-md text-xs font-semibold bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 disabled:opacity-50"
                                  >
                                    {saving === provider.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                                  </button>
                                  <button
                                    onClick={() => testKey(provider.id)}
                                    disabled={!isConfigured || isTesting}
                                    className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3.5 disabled:opacity-50"
                                  >
                                    {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test API"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Voice Model Catalog with Live Previews */}
                  <div className="rounded-xl border bg-card shadow-sm p-6 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Volume2 className="w-5 h-5 text-primary" />
                          Voice Model Catalog
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Explore, audition, and test voice models across all integrated engines.
                        </p>
                      </div>

                      {voicePreviewError && (
                        <span className="text-xs text-red-500 font-medium">{voicePreviewError}</span>
                      )}
                    </div>

                    {/* Filter Pills & Search */}
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                      {/* Filter Pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {["All", "Azure", "OpenAI", "ElevenLabs", "Google", "Free/Keyless"].map((pill) => {
                          const isSelected = voiceFilter === pill;
                          return (
                            <button
                              key={pill}
                              onClick={() => setVoiceFilter(pill)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                isSelected
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                              }`}
                            >
                              {pill}
                            </button>
                          );
                        })}
                      </div>

                      {/* Search Input */}
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search voices or language..."
                          value={voiceSearch}
                          onChange={(e) => setVoiceSearch(e.target.value)}
                          className="flex h-9 w-full rounded-full border border-input bg-background pl-8 pr-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    </div>

                    {/* Voices Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {filteredVoices.map((voice) => {
                        const isLoading = loadingVoiceId === voice.id;
                        const isPlaying = playingVoiceId === voice.id;

                        return (
                          <div
                            key={voice.id}
                            className={`p-4 rounded-xl border flex flex-col justify-between gap-3 bg-muted/10 hover:bg-muted/20 transition-all ${
                              isPlaying ? "ring-1 ring-primary border-primary bg-primary/5 shadow-sm" : ""
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-semibold text-sm text-foreground">{voice.name}</h4>
                                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                                    {voice.description}
                                  </p>
                                </div>

                                {/* Interactive Play/Pause Button */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleVoicePreview(voice)}
                                  disabled={isLoading}
                                  title={isPlaying ? "Pause Preview" : "Play Preview"}
                                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                    isPlaying
                                      ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2 animate-pulse"
                                      : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
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
                            </div>

                            {/* Badges Footer */}
                            <div className="flex items-center justify-between border-t pt-2.5 text-[10px]">
                              <div className="flex flex-wrap gap-1.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-background border text-foreground">
                                  {voice.providerLabel}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium bg-background border text-muted-foreground">
                                  <Globe className="w-2.5 h-2.5" /> {voice.language}
                                </span>
                                <span className="inline-flex items-center capitalize px-2 py-0.5 rounded font-medium bg-background border text-muted-foreground">
                                  {voice.gender}
                                </span>
                              </div>

                              {isPlaying && (
                                <span className="flex items-center gap-1 text-primary font-mono font-medium animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Playing
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : activeTab === "Database & Supabase" ? (
                <div className="space-y-6">
                  {/* Connection Overview Card */}
                  <div className="rounded-xl border bg-card shadow-sm p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
                      <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                          <Database className="w-5 h-5 text-primary" />
                          Supabase Project Routing
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">
                          Seamlessly switch between Clipped default cloud storage and your custom Supabase PostgreSQL backend.
                        </p>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2">
                        {supabaseStatus === "testing" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Testing Connection...
                          </span>
                        ) : supabaseStatus === "unreachable" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            🔴 Unreachable
                          </span>
                        ) : isCustom ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            🟢 Custom Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            🔵 Default Cloud Project
                          </span>
                        )}

                        {latencyMs !== null && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono bg-muted text-muted-foreground border">
                            <Activity className="w-3 h-3 text-emerald-500" />
                            {latencyMs}ms
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Active Endpoint Banner */}
                    <div className="p-3.5 rounded-lg bg-muted/40 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Server className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground font-medium shrink-0">Active Endpoint:</span>
                        <span className="font-mono truncate select-all">{activeSupabaseUrl}</span>
                      </div>
                      <button
                        onClick={() => handleCopyUrl(activeSupabaseUrl)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-background border hover:bg-muted transition-colors shrink-0"
                      >
                        {urlCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        {urlCopied ? "Copied" : "Copy URL"}
                      </button>
                    </div>

                    {/* Feedback Alert Banner */}
                    {dbFeedback && (
                      <div
                        className={`p-4 rounded-lg text-xs flex items-start gap-2.5 border ${
                          dbFeedback.type === "success"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : dbFeedback.type === "error"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        }`}
                      >
                        {dbFeedback.type === "success" ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : dbFeedback.type === "error" ? (
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <Activity className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <span>{dbFeedback.message}</span>
                      </div>
                    )}

                    {/* Credentials Input Fields */}
                    <div className="space-y-4 max-w-2xl">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          Supabase Project URL (NEXT_PUBLIC_SUPABASE_URL)
                        </label>
                        <input
                          type="url"
                          placeholder="https://your-project.supabase.co"
                          value={dbUrlInput}
                          onChange={(e) => setDbUrlInput(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 font-mono text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Found in Supabase Project Settings &rarr; API &rarr; Project URL.
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          Public Anon Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
                        </label>
                        <div className="relative">
                          <input
                            type={showAnonKey ? "text" : "password"}
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            value={dbKeyInput}
                            onChange={(e) => setDbKeyInput(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 pr-10 py-1 font-mono text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAnonKey(!showAnonKey)}
                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                          >
                            {showAnonKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Safe client-side anon key. Service role keys are never stored in the browser.
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons Bar */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={handleTestDbConnection}
                        disabled={testingDb || !dbUrlInput.trim()}
                        className="inline-flex items-center gap-2 rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 disabled:opacity-50"
                      >
                        {testingDb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                        Test Connection
                      </button>

                      <button
                        onClick={handleSaveDbConnection}
                        disabled={savingDb || !dbUrlInput.trim() || !dbKeyInput.trim()}
                        className="inline-flex items-center gap-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 disabled:opacity-50"
                      >
                        {savingDb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Save & Apply Connection
                      </button>

                      <button
                        onClick={handleResetDbConnection}
                        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted h-9 px-3 py-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset to Default
                      </button>

                      <div className="ml-auto">
                        <button
                          onClick={() => setShowDdlModal(true)}
                          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors border border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 h-9 px-3.5 py-2"
                        >
                          <Code2 className="w-4 h-4" />
                          View Schema DDL
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Schema Diagnostic & Health Card */}
                  <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        Core Schema Table Health Checklist
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        Required by Video Generation & Studio Engines
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                      {[
                        { name: "users", desc: "User accounts & storage prefs" },
                        { name: "videos", desc: "Generated video projects" },
                        { name: "render_jobs", desc: "Background render queue" },
                        { name: "api_credits", desc: "Quota & token tracking" },
                        { name: "settings", desc: "API keys & provider settings" },
                        { name: "scheduled_posts", desc: "Multi-platform planner" },
                      ].map((table) => {
                        const tableInfo = (dbTestResult?.schema || schemaStatus)?.tables?.[table.name];
                        const isMissing = (dbTestResult?.schema || schemaStatus)?.missingTables?.includes(table.name);
                        const isChecked = Boolean(tableInfo || dbTestResult || schemaStatus);
                        const exists = tableInfo?.exists && !isMissing;

                        return (
                          <div
                            key={table.name}
                            className="p-3 rounded-lg border bg-muted/20 flex items-start justify-between gap-3"
                          >
                            <div>
                              <div className="font-mono font-semibold text-xs text-foreground flex items-center gap-1.5">
                                {table.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">{table.desc}</div>
                            </div>
                            <div>
                              {isChecked ? (
                                exists ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                                    <Check className="w-3 h-3" /> Ready
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-500 bg-red-500/10 px-2 py-0.5 rounded">
                                    <X className="w-3 h-3" /> Missing
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                  Untested
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : activeTab === "Usage & Quotas" ? (
                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-primary" />
                      Monthly Usage & Quotas
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="p-6 border rounded-xl flex flex-col items-center justify-center text-center">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-muted/20"
                              strokeWidth="3"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className="text-primary"
                              strokeDasharray="66, 100"
                              strokeWidth="3"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span className="text-2xl font-bold">2/3</span>
                          </div>
                        </div>
                        <h3 className="mt-4 font-semibold">Video Generations</h3>
                        <p className="text-sm text-muted-foreground">Free Tier Limit</p>
                      </div>

                      <div className="p-6 border rounded-xl flex flex-col items-center justify-center text-center">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-muted/20"
                              strokeWidth="3"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className="text-blue-500"
                              strokeDasharray="30, 100"
                              strokeWidth="3"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span className="text-xl font-bold">1.2M</span>
                          </div>
                        </div>
                        <h3 className="mt-4 font-semibold">LLM Tokens</h3>
                        <p className="text-sm text-muted-foreground">Across all models</p>
                      </div>
                    </div>
                    <div className="mt-6 p-4 bg-muted/20 rounded-lg text-sm text-muted-foreground text-center">
                      Quotas automatically reset on the 1st of every month. Upgrade your plan to increase limits.
                    </div>
                  </div>
                </div>
              ) : activeTab === "Brand Kits" ? (
                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Palette className="w-5 h-5 text-primary" />
                      Brand Kits
                    </h2>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="space-y-4 max-w-xl">
                      <div>
                        <label className="text-sm font-medium">Global Primary Color</label>
                        <p className="text-xs text-muted-foreground mb-2">Used for subtitles and highlights.</p>
                        <div className="flex gap-4 items-center">
                          <input
                            type="color"
                            className="w-12 h-12 rounded border p-1 cursor-pointer"
                            defaultValue="#ffffff"
                          />
                          <span className="font-mono text-sm border px-3 py-1.5 rounded-md">#FFFFFF</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Default Subtitle Preset</label>
                        <p className="text-xs text-muted-foreground mb-2">
                          The default styling applied to new generated videos.
                        </p>
                        <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                          <option>Hormozi Pop</option>
                          <option>Cyber Neon</option>
                          <option>Minimalist Clean</option>
                          <option>Cinematic Boxed</option>
                          <option>Bold Impact</option>
                          <option>Retro Karaoke</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Default Subtitle Position</label>
                        <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring mt-2">
                          <option>Bottom (Recommended)</option>
                          <option>Center</option>
                          <option>Top</option>
                        </select>
                      </div>

                      <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium shadow hover:bg-primary/90">
                        Save Brand Kit
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* AI Models, Stock Media, and Avatar tabs with Dynamic Custom Provider support */
                <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
                  <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20">
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Key className="w-5 h-5 text-primary" />
                        {activeTab} Integrations
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Manage API keys and custom model endpoints for {activeTab.toLowerCase()}.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setCustomCategory(activeTab);
                        setShowCustomModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Custom Provider
                    </button>
                  </div>

                  <div className="divide-y">
                    {currentTabProviders.map((provider) => {
                      const keyData = keys[provider.id];
                      const isConfigured = keyData?.isConfigured;
                      const testState = testResults[provider.id];
                      const isTesting = testing === provider.id || testingAll;

                      return (
                        <div
                          key={provider.id}
                          className="p-6 flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between hover:bg-muted/30 transition-colors"
                        >
                          <div className="space-y-1 min-w-[200px]">
                            <div className="font-medium flex items-center gap-2 text-sm">
                              {provider.name}
                              {isConfigured ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {isConfigured
                                ? `Configured (${keyData?.source || "database"})`
                                : "Not configured"}
                            </div>
                            {testState && (
                              <div
                                className={`text-xs mt-1 font-medium ${
                                  testState.success ? "text-green-500" : "text-red-500"
                                }`}
                              >
                                {testState.message}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 w-full max-w-xl flex flex-col gap-2">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <div className="relative flex-1">
                                <input
                                  type="password"
                                  placeholder={isConfigured ? keyData?.maskedValue : "Enter API Key / Token"}
                                  value={inputs[provider.id] || ""}
                                  onChange={(e) =>
                                    setInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))
                                  }
                                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveKey(provider.id)}
                                  disabled={!inputs[provider.id] || saving === provider.id}
                                  className="inline-flex items-center justify-center rounded-md text-xs font-semibold bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 disabled:opacity-50"
                                >
                                  {saving === provider.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    "Save"
                                  )}
                                </button>
                                <button
                                  onClick={() => testKey(provider.id)}
                                  disabled={!isConfigured || isTesting}
                                  className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3.5 disabled:opacity-50"
                                >
                                  {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test API"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Add Custom API Integration Modal */}
      <AnimatePresence>
        {showCustomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCustomModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10"
            >
              <div className="flex items-center justify-between p-5 border-b bg-muted/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Add Custom API Integration</h3>
                    <p className="text-xs text-muted-foreground">
                      Connect any OpenAI-compatible, custom LLM, or self-hosted endpoint.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCustomModal(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {customModalError && (
                  <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-xs flex items-center gap-2 border border-red-500/20">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{customModalError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Provider Name (e.g. Grok, DeepSeek, Ollama, Cerebras)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DeepSeek V3 / Ollama"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Integration Category
                  </label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="AI Models">AI Models</option>
                    <option value="Voice & Audio">Voice & Audio</option>
                    <option value="Stock Media">Stock Media</option>
                    <option value="Avatar">Avatar</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    API Key / Secret Token
                  </label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Base URL (Optional for self-hosted / proxies)
                  </label>
                  <input
                    type="url"
                    placeholder="https://api.deepseek.com or http://localhost:11434"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 p-4 border-t bg-muted/20">
                <button
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium border bg-background hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomProvider}
                  disabled={savingCustom || !customName.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow transition-all disabled:opacity-50"
                >
                  {savingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Custom API
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schema DDL Modal */}
      <AnimatePresence>
        {showDdlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDdlModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-3xl max-h-[85vh] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10"
            >
              <div className="flex items-center justify-between p-5 border-b bg-muted/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/20 flex items-center justify-center">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Supabase PostgreSQL Schema (DDL)</h3>
                    <p className="text-xs text-muted-foreground">
                      Complete database schema, triggers, and Row Level Security (RLS) policies.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDdlModal(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto bg-zinc-950 text-zinc-100 font-mono text-xs leading-relaxed select-all">
                <pre className="whitespace-pre overflow-x-auto">{SCHEMA_DDL_SQL}</pre>
              </div>

              <div className="flex items-center justify-between p-4 border-t bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  Paste directly into Supabase &rarr; SQL Editor &rarr; New Query
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyDdl}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow transition-all active:scale-[0.98]"
                  >
                    {ddlCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    {ddlCopied ? "Copied to Clipboard!" : "Copy SQL Script"}
                  </button>
                  <button
                    onClick={() => setShowDdlModal(false)}
                    className="px-3.5 py-2 rounded-lg text-xs font-medium border bg-background hover:bg-muted transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── API Health Hub Panel ─────────────────────────────────────────── */}
      {activeCategory === "API Health Hub" && (
        <div className="mt-2">
          <div className="mb-5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              API Health Hub
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Live status of every connected API. The Smart Router automatically selects the fastest healthy provider for each category.
            </p>
          </div>
          <ApiProviderHub />
        </div>
      )}
    </div>
  );
}
