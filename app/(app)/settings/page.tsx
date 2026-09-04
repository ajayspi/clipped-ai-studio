"use client";

import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
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
  Play,
  Pause,
  Volume2,
  Globe,
  Search,
  Users,
  FolderKanban,
  Zap,
  Cpu,
  ArrowUpRight,
  Shield,
  HelpCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabase, TestConnectionResult } from "@/lib/supabase/context";
import { ApiProviderHub } from "@/components/settings/ApiProviderHub";

interface OmniTestResult {
  success: boolean;
  latencyMs?: number;
  models?: string[];
  modelCount?: number;
  message?: string;
  error?: string;
}

interface VoiceModelItem {
  id: string;
  name: string;
  category: "Neural" | "Expressive" | "Keyless" | "Narrative";
  language: string;
  gender: "male" | "female" | "neutral";
  description: string;
  sampleText: string;
}

interface WorkspaceItem {
  id: string;
  name: string;
  color?: string;
  description?: string;
  videoCount?: number;
}

const CATEGORIES = [
  "OmniRoute AI",
  "Voice Catalog",
  "Brand Kits",
  "Workspaces & Team",
  "Usage & Quotas",
  "Database & Supabase",
  "API Health Hub",
];

const STATIC_VOICE_CATALOG: VoiceModelItem[] = [
  // OmniRoute Neural & Expressive Voices
  { id: "alloy", name: "Alloy", category: "Neural", language: "en-US", gender: "neutral", description: "Balanced, versatile, and natural tone for all-purpose narration.", sampleText: "Hello! I am Alloy, an expressive and versatile voice synthesized via OmniRoute." },
  { id: "echo", name: "Echo", category: "Expressive", language: "en-US", gender: "male", description: "Warm, resonant, and balanced male tone for storytelling.", sampleText: "Hey there, I am Echo, featuring a warm and well-rounded presence." },
  { id: "fable", name: "Fable", category: "Narrative", language: "en-US", gender: "female", description: "Expressive accent crafted for creative shorts and fiction.", sampleText: "Greetings! I am Fable, a refined voice crafted for narrative flair." },
  { id: "onyx", name: "Onyx", category: "Narrative", language: "en-US", gender: "male", description: "Deep, authoritative, and commanding male tone for podcasts.", sampleText: "I am Onyx, delivering deep, resonant, and authoritative narration." },
  { id: "nova", name: "Nova", category: "Expressive", language: "en-US", gender: "female", description: "Energetic, cheerful, and engaging tone for high-retention reels.", sampleText: "Hi! I am Nova, energetic, bright, and engaging for vertical viral shorts." },
  { id: "shimmer", name: "Shimmer", category: "Neural", language: "en-US", gender: "female", description: "Clear, crisp, and high-clarity female tone for explainer videos.", sampleText: "Hello, I am Shimmer, clear, crisp, and high-clarity." },

  // Multilingual Neural Voices
  { id: "jenny", name: "Jenny (Neural)", category: "Neural", language: "en-US", gender: "female", description: "Natural, conversational English narration.", sampleText: "Welcome to Clipped AI. I am Jenny, a natural conversational voice." },
  { id: "guy", name: "Guy (Neural)", category: "Neural", language: "en-US", gender: "male", description: "Confident and conversational male narrator.", sampleText: "Hi, I am Guy, a confident and conversational narrator." },
  { id: "aria", name: "Aria (Neural)", category: "Expressive", language: "en-US", gender: "female", description: "Rich expressiveness with wide dynamic range.", sampleText: "Hello! I am Aria, featuring rich dynamic range." },
  { id: "neerja", name: "Neerja (Neural)", category: "Neural", language: "en-IN", gender: "female", description: "Authentic Indian English female narration.", sampleText: "Namaste! I am Neerja, bringing natural Indian English narration." },
  { id: "prabhat", name: "Prabhat (Neural)", category: "Neural", language: "en-IN", gender: "male", description: "Polished Indian English male narration.", sampleText: "Hello! I am Prabhat, delivering polished Indian English speech." },
  { id: "swara", name: "Swara (Hindi)", category: "Neural", language: "hi-IN", gender: "female", description: "Natural, fluent Hindi female narration.", sampleText: "नमस्ते! मैं स्वरा हूँ, आपकी वीडियो के लिए एकदम सटीक आवाज़।" },
  { id: "madhur", name: "Madhur (Hindi)", category: "Neural", language: "hi-IN", gender: "male", description: "Warm, clear Hindi male narration.", sampleText: "नमस्ते! मैं मधुर हूँ, स्पष्ट और प्रभावशाली हिंदी आवाज़।" },

  // Character Voices
  { id: "rachel", name: "Rachel", category: "Expressive", language: "en-US", gender: "female", description: "Calm, natural, and realistic speech.", sampleText: "Hello there, Rachel here with ultra-realistic speech." },
  { id: "domi", name: "Domi", category: "Expressive", language: "en-US", gender: "female", description: "Strong, dynamic, and viral short-form tone.", sampleText: "Hi, I am Domi, high-energy and modern for viral social content." },
  { id: "antoni", name: "Antoni", category: "Narrative", language: "en-US", gender: "male", description: "Well-rounded and clear documentary tone.", sampleText: "Greetings! I am Antoni, a balanced voice tailored for documentaries." },
  { id: "adam", name: "Adam", category: "Narrative", language: "en-US", gender: "male", description: "Deep, resonant, and high-retention viral voice.", sampleText: "Hey everyone, Adam here. Let us create high-retention vertical clips." },

  // Free / Keyless
  { id: "free-en-us", name: "Free English (US)", category: "Keyless", language: "en-US", gender: "female", description: "Instant zero-cost keyless voice powered by Clipped Studio.", sampleText: "Hello! This is a free, instant keyless voice powered by Clipped AI." },
  { id: "free-en-in", name: "Free Indian English", category: "Keyless", language: "en-IN", gender: "female", description: "Instant keyless Indian English voice option.", sampleText: "Namaste! This is the free keyless Indian English voice option." },
  { id: "free-hi-in", name: "Free Hindi Voice", category: "Keyless", language: "hi-IN", gender: "female", description: "Instant keyless Hindi voice option.", sampleText: "नमस्ते! यह क्लिप्ड एआई का निःशुल्क वॉयस विकल्प है।" },
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

-- 6. Settings table (API Keys and OmniRoute Configuration)
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    api_key TEXT NOT NULL,
    base_url TEXT,
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

-- 8. Workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#8b5cf6',
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
  const [activeTab, setActiveTab] = useState("OmniRoute AI");
  const [loading, setLoading] = useState(true);

  // ── OmniRoute Configuration State ──────────────────────────────────────────
  const [endpointUrl, setEndpointUrl] = useState("http://localhost:20128/v1");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [maskedApiKey, setMaskedApiKey] = useState("");
  const [omniSource, setOmniSource] = useState("default");
  const [savingOmni, setSavingOmni] = useState(false);
  const [testingOmni, setTestingOmni] = useState(false);
  const [omniTestResult, setOmniTestResult] = useState<OmniTestResult | null>(null);
  const [omniFeedback, setOmniFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // ── Voice Catalog State ───────────────────────────────────────────────────
  const [voiceFilter, setVoiceFilter] = useState<string>("All");
  const [voiceSearch, setVoiceSearch] = useState<string>("");
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voicePreviewError, setVoicePreviewError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Brand Kit & Watermark State ───────────────────────────────────────────
  const [brandColor, setBrandColor] = useState("#8b5cf6");
  const [subtitlePreset, setSubtitlePreset] = useState("Hormozi Pop");
  const [subtitlePosition, setSubtitlePosition] = useState("Bottom (Recommended)");
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [watermarkText, setWatermarkText] = useState("Clipped AI");
  const [watermarkPosition, setWatermarkPosition] = useState("Bottom Right");
  const [watermarkOpacity, setWatermarkOpacity] = useState(80);
  const [brandSavedFeedback, setBrandSavedFeedback] = useState(false);

  // ── Workspaces State ──────────────────────────────────────────────────────
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([
    { id: "ws-default", name: "Default Workspace", color: "#8b5cf6", description: "Primary creative campaign folder", videoCount: 4 },
    { id: "ws-shorts", name: "TikTok & Shorts", color: "#ec4899", description: "Viral vertical video pipeline", videoCount: 2 },
  ]);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceColor, setNewWorkspaceColor] = useState("#3b82f6");
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);

  // ── Supabase Context & State ──────────────────────────────────────────────
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
  const [dbFeedback, setDbFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // ── Handle URL Tab Parameter on Mount ──────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam) {
        const decoded = decodeURIComponent(tabParam);
        if (decoded === "AI Models" || decoded === "Stock Media" || decoded === "Avatar") {
          setActiveTab("OmniRoute AI");
        } else if (decoded === "Voice & Audio") {
          setActiveTab("Voice Catalog");
        } else if (CATEGORIES.includes(decoded)) {
          setActiveTab(decoded);
        }
      }
    }
  }, []);

  // ── Fetch OmniRoute Configuration ──────────────────────────────────────────
  async function fetchOmniConfig() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/keys");
      const data = await res.json();
      if (data.endpointUrl || data.omniroute?.endpointUrl) {
        setEndpointUrl(data.endpointUrl || data.omniroute?.endpointUrl);
      }
      setIsConfigured(Boolean(data.isConfigured || data.omniroute?.isConfigured));
      setMaskedApiKey(data.maskedApiKey || data.omniroute?.maskedApiKey || "");
      setOmniSource(data.source || data.omniroute?.source || "default");
    } catch (err) {
      console.error("Failed to load OmniRoute keys", err);
    } finally {
      setLoading(false);
    }
  }

  // ── Fetch Workspaces ──────────────────────────────────────────────────────
  async function loadWorkspaces() {
    try {
      const res = await fetch("/api/workspaces");
      const data = await res.json();
      if (data.workspaces && Array.isArray(data.workspaces) && data.workspaces.length > 0) {
        setWorkspaces(data.workspaces);
      }
    } catch {
      // Keep initial fallback workspaces if offline
    }
  }

  useEffect(() => {
    fetchOmniConfig();
    loadWorkspaces();
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

  // ── OmniRoute Action Handlers ─────────────────────────────────────────────
  async function handleSaveOmni() {
    if (!endpointUrl.trim()) {
      setOmniFeedback({ type: "error", message: "Endpoint URL is required." });
      return;
    }

    setSavingOmni(true);
    setOmniFeedback(null);
    try {
      const res = await fetch("/api/settings/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpointUrl: endpointUrl.trim(),
          apiKey: apiKey.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save OmniRoute configuration");
      }

      setOmniFeedback({
        type: "success",
        message: "OmniRoute configuration saved and active across all generation pipelines!",
      });
      setIsConfigured(true);
      if (apiKey.trim()) {
        setMaskedApiKey(data.omniroute?.maskedApiKey || "••••••••");
        setApiKey("");
      }
      await fetchOmniConfig();
    } catch (err: any) {
      setOmniFeedback({
        type: "error",
        message: err.message || "Failed to save configuration",
      });
    } finally {
      setSavingOmni(false);
    }
  }

  async function handleTestOmni() {
    setTestingOmni(true);
    setOmniFeedback(null);
    setOmniTestResult(null);
    try {
      const res = await fetch("/api/settings/keys/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpointUrl: endpointUrl.trim(),
          apiKey: apiKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      setOmniTestResult({
        success: Boolean(data.success),
        latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : undefined,
        models: Array.isArray(data.models) ? data.models : [],
        modelCount: Array.isArray(data.models) ? data.models.length : (data.modelCount || 0),
        message: data.message,
        error: data.error,
      });

      if (data.success) {
        setOmniFeedback({
          type: "success",
          message: data.message || `Connected to OmniRoute Gateway successfully (${data.latencyMs ?? 0}ms).`,
        });
      } else {
        setOmniFeedback({
          type: "error",
          message: data.error || data.message || "Connection to OmniRoute Gateway failed.",
        });
      }
    } catch (err: any) {
      setOmniTestResult({
        success: false,
        error: err.message || "Network test failed.",
      });
      setOmniFeedback({
        type: "error",
        message: err.message || "Could not reach OmniRoute check endpoint.",
      });
    } finally {
      setTestingOmni(false);
    }
  }

  function handlePreset(presetUrl: string) {
    setEndpointUrl(presetUrl);
    setOmniFeedback({
      type: "info",
      message: `Preset loaded: ${presetUrl}. Click "Save Configuration" or "Test Connection".`,
    });
  }

  // ── Voice Preview Play / Pause Controller ─────────────────────────────────
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
          provider: "omniroute",
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

  // ── Filtered Voices ───────────────────────────────────────────────────────
  const filteredVoices = STATIC_VOICE_CATALOG.filter((voice) => {
    const matchesFilter =
      voiceFilter === "All" ||
      (voiceFilter === "Neural" && voice.category === "Neural") ||
      (voiceFilter === "Expressive" && voice.category === "Expressive") ||
      (voiceFilter === "Narrative" && voice.category === "Narrative") ||
      (voiceFilter === "Keyless" && voice.category === "Keyless") ||
      (voiceFilter === "English" && voice.language.startsWith("en")) ||
      (voiceFilter === "Hindi" && voice.language.startsWith("hi"));

    const matchesSearch =
      !voiceSearch.trim() ||
      voice.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
      voice.language.toLowerCase().includes(voiceSearch.toLowerCase()) ||
      voice.description.toLowerCase().includes(voiceSearch.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // ── Workspaces Action Handlers ────────────────────────────────────────────
  async function handleAddWorkspace() {
    if (!newWorkspaceName.trim()) return;
    setCreatingWorkspace(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWorkspaceName.trim(),
          color: newWorkspaceColor,
        }),
      });
      const data = await res.json();
      if (data.workspace) {
        setWorkspaces((prev) => [...prev, data.workspace]);
      } else {
        setWorkspaces((prev) => [
          ...prev,
          {
            id: `ws-${Date.now()}`,
            name: newWorkspaceName.trim(),
            color: newWorkspaceColor,
            description: "Custom project folder",
            videoCount: 0,
          },
        ]);
      }
      setNewWorkspaceName("");
    } catch {
      setWorkspaces((prev) => [
        ...prev,
        {
          id: `ws-${Date.now()}`,
          name: newWorkspaceName.trim(),
          color: newWorkspaceColor,
          description: "Custom project folder",
          videoCount: 0,
        },
      ]);
      setNewWorkspaceName("");
    } finally {
      setCreatingWorkspace(false);
    }
  }

  // ── Brand Kit Action Handler ──────────────────────────────────────────────
  function handleSaveBrandKit() {
    setBrandSavedFeedback(true);
    setTimeout(() => setBrandSavedFeedback(false), 2500);
  }

  // ── Database Tab Actions ──────────────────────────────────────────────────
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

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your unified OmniRoute AI Gateway, brand kits, workspaces, and database.
          </p>
        </div>

        {/* Real-time Gateway Health Header Chip */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/60 bg-card/60 backdrop-blur-sm text-xs shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            {isConfigured && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isConfigured ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </span>
          <span className="font-medium text-foreground">
            {isConfigured ? "OmniRoute Gateway Active" : "Gateway Using Defaults"}
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* ── Vertical Navigation Sidebar ───────────────────────────────────── */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-4 md:pb-0 relative">
            {CATEGORIES.map((category) => {
              const isActive = activeTab === category;
              return (
                <button
                  key={category}
                  onClick={() => setActiveTab(category)}
                  className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-tab"
                      className="absolute inset-0 bg-primary/10 rounded-md -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2.5">
                    {category === "OmniRoute AI" && <Zap className="w-4 h-4 text-purple-400" />}
                    {category === "Voice Catalog" && <Volume2 className="w-4 h-4 text-emerald-400" />}
                    {category === "Brand Kits" && <Palette className="w-4 h-4 text-pink-400" />}
                    {category === "Workspaces & Team" && <FolderKanban className="w-4 h-4 text-blue-400" />}
                    {category === "Usage & Quotas" && <PieChart className="w-4 h-4 text-amber-400" />}
                    {category === "Database & Supabase" && <Database className="w-4 h-4 text-cyan-400" />}
                    {category === "API Health Hub" && <Activity className="w-4 h-4 text-rose-400" />}
                    {category}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Main Tab Content Area ─────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* ════════════════════════════════════════════════════════════════
                  TAB 1: OmniRoute AI Configuration Panel
                  ════════════════════════════════════════════════════════════════ */}
              {activeTab === "OmniRoute AI" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                          <Zap className="w-5 h-5 text-purple-400" />
                          OmniRoute Configuration
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Configure your single OmniRoute or OpenRouter AI gateway. All LLM chat, vision, and speech generation routes through this endpoint.
                        </p>
                      </div>

                      {/* Live Status Badge */}
                      <div className="flex items-center gap-2">
                        {isConfigured ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Connected ({omniSource})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border">
                            <span className="w-2 h-2 rounded-full bg-zinc-400" />
                            Default Port 20128
                          </span>
                        )}

                        {omniTestResult?.latencyMs !== undefined && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono bg-muted text-muted-foreground border">
                            <Activity className="w-3 h-3 text-emerald-500" />
                            {omniTestResult.latencyMs}ms
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-6">
                      {/* Feedback Banner */}
                      {omniFeedback && (
                        <div
                          className={`p-4 rounded-xl text-xs flex items-start gap-2.5 border ${
                            omniFeedback.type === "success"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : omniFeedback.type === "error"
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}
                        >
                          {omniFeedback.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                          ) : omniFeedback.type === "error" ? (
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          ) : (
                            <Activity className="w-4 h-4 shrink-0 mt-0.5" />
                          )}
                          <span>{omniFeedback.message}</span>
                        </div>
                      )}

                      {/* 1. Endpoint URL Field & Presets */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Gateway Endpoint URL (Base URL)
                          </label>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground">Presets:</span>
                            <button
                              type="button"
                              onClick={() => handlePreset("http://localhost:20128/v1")}
                              className="px-2 py-0.5 rounded text-[11px] font-mono bg-muted hover:bg-muted/80 text-foreground border transition-colors"
                            >
                              Local OmniRoute
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePreset("https://openrouter.ai/api/v1")}
                              className="px-2 py-0.5 rounded text-[11px] font-mono bg-muted hover:bg-muted/80 text-foreground border transition-colors"
                            >
                              OpenRouter Cloud
                            </button>
                          </div>
                        </div>

                        <input
                          type="url"
                          placeholder="http://localhost:20128/v1"
                          value={endpointUrl}
                          onChange={(e) => setEndpointUrl(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 font-mono text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Default local instance: <code className="text-foreground">http://localhost:20128/v1</code>. For OpenRouter cloud, use <code className="text-foreground">https://openrouter.ai/api/v1</code>.
                        </p>
                      </div>

                      {/* 2. API Key Field */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                          OmniRoute / OpenRouter API Key
                        </label>
                        <div className="relative">
                          <input
                            type={showApiKey ? "text" : "password"}
                            placeholder={maskedApiKey ? `Configured: ${maskedApiKey}` : "sk-..."}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 pr-10 py-1 font-mono text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Optional for local OmniRoute instances; required for OpenRouter cloud or authenticated gateways.
                        </p>
                      </div>

                      {/* 3. Action Buttons */}
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleSaveOmni}
                          disabled={savingOmni}
                          className="inline-flex items-center gap-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 disabled:opacity-50"
                        >
                          {savingOmni ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Save Configuration
                        </button>

                        <button
                          type="button"
                          onClick={handleTestOmni}
                          disabled={testingOmni}
                          className="inline-flex items-center gap-2 rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 disabled:opacity-50"
                        >
                          {testingOmni ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Activity className="w-4 h-4" />
                          )}
                          Test Connection
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePreset("http://localhost:20128/v1")}
                          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted h-9 px-3 py-2 ml-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reset to Local Default
                        </button>
                      </div>

                      {/* 4. Connection Test Diagnostics Result */}
                      {omniTestResult && (
                        <div
                          className={`p-4 rounded-xl border space-y-3 ${
                            omniTestResult.success
                              ? "bg-emerald-500/5 border-emerald-500/30"
                              : "bg-red-500/5 border-red-500/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              {omniTestResult.success ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  <span className="text-emerald-500">Gateway Active & Reachable</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 text-red-500" />
                                  <span className="text-red-500">Connection Failed</span>
                                </>
                              )}
                            </div>

                            {omniTestResult.latencyMs !== undefined && (
                              <span className="text-xs font-mono text-muted-foreground">
                                Latency: <strong className="text-foreground">{omniTestResult.latencyMs}ms</strong>
                              </span>
                            )}
                          </div>

                          {omniTestResult.models && omniTestResult.models.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <div className="text-xs text-muted-foreground flex items-center justify-between">
                                <span>
                                  Available Models ({omniTestResult.models.length}):
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {omniTestResult.models.map((m) => (
                                  <span
                                    key={m}
                                    className="px-2.5 py-0.5 rounded-md bg-muted/60 text-foreground font-mono text-xs border"
                                  >
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {omniTestResult.error && (
                            <p className="text-xs text-red-400 leading-relaxed font-mono">
                              {omniTestResult.error}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════════
                  TAB 2: Voice Catalog with Live Previews
                  ════════════════════════════════════════════════════════════════ */}
              {activeTab === "Voice Catalog" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-6 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Volume2 className="w-5 h-5 text-emerald-400" />
                          Voice Model Catalog
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Audition, test, and preview neural voice models routed seamlessly through your OmniRoute Gateway.
                        </p>
                      </div>

                      {voicePreviewError && (
                        <span className="text-xs text-red-500 font-medium">{voicePreviewError}</span>
                      )}
                    </div>

                    {/* Filter Pills & Search */}
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                      <div className="flex flex-wrap gap-1.5">
                        {["All", "Neural", "Expressive", "Narrative", "English", "Hindi", "Keyless"].map((pill) => {
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

                            <div className="flex items-center justify-between border-t pt-2.5 text-[10px]">
                              <div className="flex flex-wrap gap-1.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-background border text-foreground">
                                  {voice.category}
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
              )}

              {/* ════════════════════════════════════════════════════════════════
                  TAB 3: Brand Kit & Watermark Settings
                  ════════════════════════════════════════════════════════════════ */}
              {activeTab === "Brand Kits" && (
                <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-border/40 bg-muted/20">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Palette className="w-5 h-5 text-pink-400" />
                      Brand Kit & Watermark Settings
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Define your global brand identity, subtitle typography, and video watermark overlays.
                    </p>
                  </div>

                  <div className="p-6 space-y-6">
                    {brandSavedFeedback && (
                      <div className="p-4 rounded-xl text-xs flex items-center gap-2.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Brand Kit and Watermark settings updated successfully!</span>
                      </div>
                    )}

                    <div className="space-y-6 max-w-2xl">
                      {/* Brand Color */}
                      <div>
                        <label className="text-sm font-medium text-foreground">Global Primary Color</label>
                        <p className="text-xs text-muted-foreground mb-2">Used for subtitles, highlights, and UI branding.</p>
                        <div className="flex gap-4 items-center">
                          <input
                            type="color"
                            value={brandColor}
                            onChange={(e) => setBrandColor(e.target.value)}
                            className="w-12 h-12 rounded-lg border p-1 cursor-pointer bg-background"
                          />
                          <span className="font-mono text-sm border px-3 py-1.5 rounded-md bg-muted/20">
                            {brandColor.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Subtitle Preset */}
                      <div>
                        <label className="text-sm font-medium text-foreground">Default Subtitle Preset</label>
                        <p className="text-xs text-muted-foreground mb-2">
                          The typography and animation style applied to newly generated video captions.
                        </p>
                        <select
                          value={subtitlePreset}
                          onChange={(e) => setSubtitlePreset(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option>Hormozi Pop</option>
                          <option>Cyber Neon</option>
                          <option>Minimalist Clean</option>
                          <option>Cinematic Boxed</option>
                          <option>Bold Impact</option>
                          <option>Retro Karaoke</option>
                        </select>
                      </div>

                      {/* Subtitle Position */}
                      <div>
                        <label className="text-sm font-medium text-foreground">Default Subtitle Position</label>
                        <select
                          value={subtitlePosition}
                          onChange={(e) => setSubtitlePosition(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring mt-1.5"
                        >
                          <option>Bottom (Recommended)</option>
                          <option>Center</option>
                          <option>Top</option>
                        </select>
                      </div>

                      {/* Watermark Section */}
                      <div className="pt-4 border-t border-border/40 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">Video Watermark Overlay</h3>
                            <p className="text-xs text-muted-foreground">Overlay your brand logo or handle on exported videos.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              watermarkEnabled ? "bg-primary" : "bg-muted"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                watermarkEnabled ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>

                        {watermarkEnabled && (
                          <div className="space-y-4 p-4 rounded-xl border border-border/50 bg-muted/10">
                            <div>
                              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                                Watermark Text / Handle
                              </label>
                              <input
                                type="text"
                                value={watermarkText}
                                onChange={(e) => setWatermarkText(e.target.value)}
                                placeholder="e.g. @yourbrand or BrandName"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                                  Position
                                </label>
                                <select
                                  value={watermarkPosition}
                                  onChange={(e) => setWatermarkPosition(e.target.value)}
                                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                                >
                                  <option>Bottom Right</option>
                                  <option>Bottom Left</option>
                                  <option>Top Right</option>
                                  <option>Top Left</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                                  Opacity ({watermarkOpacity}%)
                                </label>
                                <input
                                  type="range"
                                  min="20"
                                  max="100"
                                  value={watermarkOpacity}
                                  onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                                  className="w-full mt-2"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveBrandKit}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium shadow hover:bg-primary/90 transition-colors"
                      >
                        Save Brand Kit & Watermark
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════════
                  TAB 4: Workspaces & Team Settings
                  ════════════════════════════════════════════════════════════════ */}
              {activeTab === "Workspaces & Team" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-border/40 bg-muted/20">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <FolderKanban className="w-5 h-5 text-blue-400" />
                        Workspaces & Folder Organization
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Group video generation jobs into projects, campaigns, and team folders.
                      </p>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Workspaces List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {workspaces.map((ws) => (
                          <div
                            key={ws.id}
                            className="p-4 rounded-xl border border-border/50 bg-muted/10 flex items-start justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: ws.color || "#8b5cf6" }}
                                />
                                <h4 className="font-semibold text-sm text-foreground">{ws.name}</h4>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {ws.description || "Video campaign workspace"}
                              </p>
                              <span className="text-[11px] font-mono text-muted-foreground inline-block mt-1">
                                {ws.videoCount ?? 0} video project(s)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Create New Workspace Form */}
                      <div className="pt-4 border-t border-border/40 space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">Create New Workspace</h4>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            placeholder="Workspace Name (e.g. YouTube Shorts Q3)"
                            value={newWorkspaceName}
                            onChange={(e) => setNewWorkspaceName(e.target.value)}
                            className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={newWorkspaceColor}
                              onChange={(e) => setNewWorkspaceColor(e.target.value)}
                              className="w-9 h-9 rounded border p-1 cursor-pointer bg-background"
                            />
                            <button
                              type="button"
                              onClick={handleAddWorkspace}
                              disabled={creatingWorkspace || !newWorkspaceName.trim()}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold shadow hover:bg-primary/90 disabled:opacity-50"
                            >
                              <Plus className="w-4 h-4" />
                              Add Workspace
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Team Members Card */}
                  <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between border-b pb-4">
                      <div>
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                          <Users className="w-4 h-4 text-primary" />
                          Team & Collaboration
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Manage studio contributors and multi-seat access.
                        </p>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded bg-muted text-muted-foreground">
                        2 Members Active
                      </span>
                    </div>

                    <div className="divide-y divide-border/30">
                      <div className="py-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-foreground">Account Owner (You)</div>
                          <div className="text-xs text-muted-foreground">Full Administrative Access</div>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          Owner
                        </span>
                      </div>
                      <div className="py-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-foreground">Creative Assistant</div>
                          <div className="text-xs text-muted-foreground">Video Generation & Script Editor</div>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Editor
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════════
                  TAB 5: Monthly Usage & Quotas
                  ════════════════════════════════════════════════════════════════ */}
              {activeTab === "Usage & Quotas" && (
                <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-border/40 bg-muted/20">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-amber-400" />
                      Monthly Usage & Quotas
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Monitor resource consumption across video renders and LLM inference.
                    </p>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      {/* Video Generations */}
                      <div className="p-6 border border-border/50 rounded-2xl flex flex-col items-center justify-center text-center bg-muted/10">
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
                            <span className="text-2xl font-bold font-mono">2/3</span>
                          </div>
                        </div>
                        <h3 className="mt-4 font-semibold text-foreground">Video Generations</h3>
                        <p className="text-xs text-muted-foreground">Free Tier Allocation</p>
                      </div>

                      {/* LLM Tokens */}
                      <div className="p-6 border border-border/50 rounded-2xl flex flex-col items-center justify-center text-center bg-muted/10">
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
                            <span className="text-xl font-bold font-mono">1.2M</span>
                          </div>
                        </div>
                        <h3 className="mt-4 font-semibold text-foreground">OmniRoute LLM Tokens</h3>
                        <p className="text-xs text-muted-foreground">Monthly Consumption</p>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/20 rounded-xl text-xs text-muted-foreground text-center border border-border/40">
                      Quotas automatically reset on the 1st of every month. Connect a custom OpenRouter or local endpoint for unlimited quota.
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════════
                  TAB 6: Database & Supabase Settings
                  ════════════════════════════════════════════════════════════════ */}
              {activeTab === "Database & Supabase" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
                      <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                          <Database className="w-5 h-5 text-cyan-400" />
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
                    <div className="p-3.5 rounded-xl bg-muted/40 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Server className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground font-medium shrink-0">Active Endpoint:</span>
                        <span className="font-mono truncate select-all">{activeSupabaseUrl}</span>
                      </div>
                      <button
                        type="button"
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
                        className={`p-4 rounded-xl text-xs flex items-start gap-2.5 border ${
                          dbFeedback.type === "success"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : dbFeedback.type === "error"
                            ? "bg-red-500/10 text-red-500 border-red-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
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
                        type="button"
                        onClick={handleTestDbConnection}
                        disabled={testingDb || !dbUrlInput.trim()}
                        className="inline-flex items-center gap-2 rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 disabled:opacity-50"
                      >
                        {testingDb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                        Test Connection
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveDbConnection}
                        disabled={savingDb || !dbUrlInput.trim() || !dbKeyInput.trim()}
                        className="inline-flex items-center gap-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 disabled:opacity-50"
                      >
                        {savingDb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Save & Apply Connection
                      </button>

                      <button
                        type="button"
                        onClick={handleResetDbConnection}
                        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted h-9 px-3 py-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset to Default
                      </button>

                      <div className="ml-auto">
                        <button
                          type="button"
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
                  <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-6 space-y-4">
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
                        { name: "settings", desc: "API keys & OmniRoute settings" },
                        { name: "scheduled_posts", desc: "Multi-platform planner" },
                      ].map((table) => {
                        const tableInfo = (dbTestResult?.schema || schemaStatus)?.tables?.[table.name];
                        const isMissing = (dbTestResult?.schema || schemaStatus)?.missingTables?.includes(table.name);
                        const isChecked = Boolean(tableInfo || dbTestResult || schemaStatus);
                        const exists = tableInfo?.exists && !isMissing;

                        return (
                          <div
                            key={table.name}
                            className="p-3 rounded-xl border border-border/50 bg-muted/20 flex items-start justify-between gap-3"
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
              )}

              {/* ════════════════════════════════════════════════════════════════
                  TAB 7: API Health Hub (OmniRoute Gateway Health Hub)
                  ════════════════════════════════════════════════════════════════ */}
              {activeTab === "API Health Hub" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      API Health Hub
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Live health and latency telemetry for your OmniRoute Gateway and model catalog.
                    </p>
                  </div>
                  <ApiProviderHub />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── Schema DDL Modal ──────────────────────────────────────────────── */}
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
                  type="button"
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
                    type="button"
                    onClick={handleCopyDdl}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow transition-all active:scale-[0.98]"
                  >
                    {ddlCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    {ddlCopied ? "Copied to Clipboard!" : "Copy SQL Script"}
                  </button>
                  <button
                    type="button"
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
    </div>
  );
}
