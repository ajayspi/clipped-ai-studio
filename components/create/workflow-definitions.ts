import {
  Video,
  Image as ImageIcon,
  Film,
  BookOpen,
  Layers,
  Scissors,
  Clapperboard,
  Sparkles,
  UserCheck,
  PenTool,
  type LucideIcon,
} from "lucide-react";
import {
  WorkflowDefinition,
  WorkflowType,
  ApiKeyStatus,
  ApiKeysMap,
  WorkflowStatusResult,
  CostTier,
  WorkflowHealthStatus,
} from "@/lib/engine/types";

export interface ExtendedWorkflowDefinition extends WorkflowDefinition {
  icon: LucideIcon;
  glowBg: string;
  settingsTab: string;
}

export const WORKFLOWS: ExtendedWorkflowDefinition[] = [
  {
    id: "bulk",
    title: "Zero-Click Newsroom & Bulk Planner",
    description: "Generate 30 days of viral content and newsroom trend-jacking in a specific niche at once.",
    icon: Layers,
    iconName: "Layers",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    borderHover: "hover:border-emerald-500/50",
    glowBg: "from-emerald-500/30 to-teal-500/5",
    href: "/create/bulk",
    category: "automation",
    costTier: "$$",
    primaryProviders: ["gemini", "openai"],
    fallbackProviders: ["30-Day Procedural Content Template Bank"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "stories",
    title: "Stories Generator",
    description: "Turn any topic into a multi-part shorts narrative series automatically.",
    icon: BookOpen,
    iconName: "BookOpen",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    borderHover: "hover:border-orange-500/50",
    glowBg: "from-orange-500/30 to-amber-500/5",
    href: "/create/stories",
    category: "automation",
    costTier: "$$",
    primaryProviders: ["gemini", "openai"],
    fallbackProviders: ["Deterministic Narrative Bank & Free TTS"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "auto",
    title: "Auto Pilot",
    description: "Fully hands-off prompt-to-video generation and scheduling pipeline.",
    icon: Sparkles,
    iconName: "Sparkles",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    borderHover: "hover:border-indigo-500/50",
    glowBg: "from-indigo-500/35 to-violet-500/10",
    href: "/create/auto",
    category: "automation",
    costTier: "$$",
    primaryProviders: ["gemini", "openai", "pexels"],
    fallbackProviders: ["Autonomous Cascade Dry-Run Engine"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "ai-videos",
    title: "AI Videos",
    description: "Use Kling, Luma, or Fal to generate 100% synthetic video scenes.",
    icon: Film,
    iconName: "Film",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    borderHover: "hover:border-pink-500/50",
    glowBg: "from-pink-500/30 to-rose-500/5",
    href: "/create/ai-videos",
    category: "ai-video",
    costTier: "$$$",
    primaryProviders: ["kling", "luma", "fal"],
    fallbackProviders: ["Mixkit Royalty-Free Clips & Dry Run"],
    hasFallback: true,
    settingsUrl: "/settings?tab=Stock%20Media&provider=api_kling",
    settingsTab: "Stock Media",
  },
  {
    id: "images",
    title: "AI Images Video",
    description: "Generate consistent AI images and animate them into a video.",
    icon: ImageIcon,
    iconName: "Image",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    borderHover: "hover:border-purple-500/50",
    glowBg: "from-purple-500/30 to-indigo-500/5",
    href: "/create/images",
    category: "ai-video",
    costTier: "$$",
    primaryProviders: ["fal", "ideogram", "openai", "gemini"],
    fallbackProviders: ["Pollinations.ai Keyless Flux Generator"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_fal",
    settingsTab: "AI Models",
  },
  {
    id: "footage",
    title: "Stock Footage Video",
    description: "Generate video using premium stock footage matched to your script.",
    icon: Video,
    iconName: "Video",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    borderHover: "hover:border-sky-500/50",
    glowBg: "from-sky-500/30 to-blue-500/5",
    href: "/create/footage",
    category: "stock",
    costTier: "$",
    primaryProviders: ["pexels", "pixabay", "gemini"],
    fallbackProviders: ["Public Stock & Openverse Scraper"],
    hasFallback: true,
    settingsUrl: "/settings?tab=Stock%20Media&provider=api_pexels",
    settingsTab: "Stock Media",
  },
  {
    id: "avatar",
    title: "Avatar to Video",
    description: "Generate talking-head videos with realistic AI avatars and voice sync.",
    icon: UserCheck,
    iconName: "UserCheck",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    borderHover: "hover:border-cyan-500/50",
    glowBg: "from-cyan-500/30 to-teal-500/5",
    href: "/create/avatar",
    category: "avatar-wb",
    costTier: "$$$",
    primaryProviders: ["heygen", "did"],
    fallbackProviders: ["Remotion PiP Talking Head & Audio Visualizer"],
    hasFallback: true,
    badge: "NEW",
    isNew: true,
    settingsUrl: "/settings?tab=Voice%20%26%20Audio&provider=api_heygen",
    settingsTab: "Voice & Audio",
  },
  {
    id: "whiteboard",
    title: "Whiteboard Animation",
    description: "Create hand-drawn sketch videos driven by consistent Gemini character sheets.",
    icon: PenTool,
    iconName: "PenTool",
    color: "text-fuchsia-500",
    bg: "bg-fuchsia-500/10",
    borderHover: "hover:border-fuchsia-500/50",
    glowBg: "from-fuchsia-500/30 to-pink-500/5",
    href: "/create/whiteboard",
    category: "avatar-wb",
    costTier: "$",
    primaryProviders: ["gemini"],
    fallbackProviders: ["Pre-rendered 9-Pose SVG Sketch Bank"],
    hasFallback: true,
    badge: "NEW",
    isNew: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "drama",
    title: "Micro-Drama",
    description: "Generate a cinematic episodic mini-series with consistent characters.",
    icon: Clapperboard,
    iconName: "Clapperboard",
    color: "text-red-500",
    bg: "bg-red-500/10",
    borderHover: "hover:border-red-500/50",
    glowBg: "from-red-500/30 to-rose-500/5",
    href: "/create/drama",
    category: "ai-video",
    costTier: "$$$",
    primaryProviders: ["fal", "kling", "gemini"],
    fallbackProviders: ["Dynamic Comic Arc Storyboard Mock Engine"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_fal",
    settingsTab: "AI Models",
  },
  {
    id: "shorts",
    title: "Extract Shorts",
    description: "Find viral hooks in long-form video or transcripts and extract shorts.",
    icon: Scissors,
    iconName: "Scissors",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    borderHover: "hover:border-amber-500/50",
    glowBg: "from-amber-500/30 to-yellow-500/5",
    href: "/create/shorts",
    category: "automation",
    costTier: "$",
    primaryProviders: ["gemini", "openai"],
    fallbackProviders: ["Heuristic Virality & Energy Slicer"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  }
];

export const WORKFLOW_DEFINITIONS: Record<string, ExtendedWorkflowDefinition> = WORKFLOWS.reduce(
  (acc, wf) => {
    acc[wf.id] = wf;
    return acc;
  },
  {} as Record<string, ExtendedWorkflowDefinition>
);

export function isProviderConfigured(provider: string, keysMap: ApiKeysMap = {}): boolean {
  if (!provider) return false;
  const raw = provider.toLowerCase().trim();
  const clean = raw.replace(/^api_/, "");

  // OmniRoute is an LLM gateway — it satisfies LLM requirements, but NOT media/stock capabilities
  const isLlmProvider = ["gemini", "openai", "anthropic"].includes(clean);
  const omniEntry =
    keysMap["omniroute"] ||
    keysMap["omniroute_api_key"] ||
    keysMap["omniroute_endpoint_url"];
  if (isLlmProvider && omniEntry?.isConfigured) return true;

  const entry = keysMap[clean] || keysMap[`api_${clean}`] || keysMap[raw];
  return Boolean(entry?.isConfigured && entry?.isActive !== false);
}

export function evaluateWorkflowStatus(
  workflow: WorkflowDefinition | ExtendedWorkflowDefinition,
  keysMap: ApiKeysMap = {}
): WorkflowStatusResult {
  const required = workflow.primaryProviders || [];
  
  // Group providers by capability to avoid requiring redundant keys (e.g., both pexels AND pixabay)
  const isStock = required.includes("pexels") || required.includes("pixabay");
  const isVideoGen = required.includes("fal") || required.includes("kling") || required.includes("luma") || required.includes("ideogram") || required.includes("bytez");
  const isAvatar = required.includes("heygen") || required.includes("did");
  
  const configured = required.filter((p) => isProviderConfigured(p, keysMap));
  const missing = required.filter((p) => !isProviderConfigured(p, keysMap));
  
  // If we have at least one provider in a capability group, consider the group satisfied
  let satisfied = configured.length === required.length;
  const actuallyMissing: string[] = [];
  
  if (!satisfied) {
    // Check if we have at least one LLM
    const hasLlm = configured.some(p => ["gemini", "openai", "anthropic"].includes(p));
    const llmRequired = required.some(p => ["gemini", "openai", "anthropic"].includes(p));
    if (llmRequired && !hasLlm) actuallyMissing.push(required.find(p => ["gemini", "openai", "anthropic"].includes(p)) || "gemini");
    
    if (isStock) {
      const hasStock = configured.some(p => ["pexels", "pixabay"].includes(p));
      if (!hasStock) actuallyMissing.push("pexels");
    }
    
    if (isVideoGen) {
      const hasVideoGen = configured.some(p => ["fal", "kling", "luma", "ideogram", "bytez"].includes(p));
      if (!hasVideoGen) actuallyMissing.push("fal");
    }
    
    if (isAvatar) {
      const hasAvatar = configured.some(p => ["heygen", "did"].includes(p));
      if (!hasAvatar) actuallyMissing.push("heygen");
    }
    
    if (actuallyMissing.length === 0 && required.length > 0 && configured.length > 0) {
      satisfied = true;
    }
  }

  let status: WorkflowHealthStatus = "ready";
  let label = "Ready";
  let message = "All required AI engines configured.";

  if (satisfied) {
    status = "ready";
    label = "Ready";
    message = `Configured: ${configured.map((p) => p.toUpperCase()).join(", ")}`;
  } else if (workflow.hasFallback) {
    status = "warning";
    label = "Fallback Mode";
    const fallbackName = workflow.fallbackProviders?.[0] || "Built-in Engine";
    message = `Missing ${actuallyMissing.map((p) => p.toUpperCase()).join("/")}. Active fallback: ${fallbackName}.`;
  } else {
    status = "error";
    label = "Keys Needed";
    message = `Requires ${actuallyMissing.map((p) => p.toUpperCase()).join("/")} API key to operate.`;
  }

  return {
    status,
    costTier: workflow.costTier,
    label,
    requiredProviders: required,
    missingProviders: missing,
    configuredProviders: configured,
    fallbackAvailable: Boolean(workflow.hasFallback),
    message,
  };
}

