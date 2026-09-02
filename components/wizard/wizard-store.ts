import { create } from 'zustand';

export const STEPS = [
  { key: 'script', name: 'Script', hint: 'Subject & narration' },
  { key: 'scenes', name: 'Scenes', hint: 'Claude beat breakdown' },
  { key: 'voice', name: 'Voice', hint: 'Narration & music' },
  { key: 'subs', name: 'Subtitles', hint: 'Burn-in styling' },
  { key: 'render', name: 'Render', hint: 'Review & queue' },
] as const;

export type StepKey = (typeof STEPS)[number]['key'];

export type WorkflowType = 'footage' | 'images' | 'ai-videos' | 'stories' | 'bulk-plan' | 'extract-shorts' | 'micro-drama' | 'auto';

export type AspectRatio = '9:16' | '16:9' | '1:1';

export interface Footage {
  id: string;
  url: string;
  title: string;
  platform: string;
  thumbnail?: string;
  duration: number;
  score: number;
  reason: string;
}

export interface Beat {
  id: string;
  text: string;
  keywords: string[];
  duration: number;
  candidates?: Footage[];
  selectedId?: string;
}

export interface SubtitlePresetConfig {
  id: string;
  name: string;
  tag: string;
  description: string;
  color: string;
  highlightColor: string;
  outlineColor: string;
  outlineWidth: number;
  glow: boolean;
  glowColor: string;
  isBox: boolean;
  boxColor: string;
  boxOpacity: number;
  boxRadius: number;
  uppercase: boolean;
  size: number;
  letterSpacing: number;
  maxWidth: number;
}

export const SUBTITLE_PRESETS: SubtitlePresetConfig[] = [
  {
    id: 'Hormozi Pop',
    name: 'Hormozi Pop',
    tag: 'Viral Scale',
    description: 'Heavy uppercase, primary white, active yellow highlight, 3.5px black outline, spring pop scale.',
    color: '#FFFFFF',
    highlightColor: '#FACC15',
    outlineColor: '#000000',
    outlineWidth: 3.5,
    glow: false,
    glowColor: '#FACC15',
    isBox: false,
    boxColor: '#000000',
    boxOpacity: 0,
    boxRadius: 8,
    uppercase: true,
    size: 5.4,
    letterSpacing: 0,
    maxWidth: 82,
  },
  {
    id: 'Cyber Neon',
    name: 'Cyber Neon',
    tag: 'Neon Glow',
    description: 'Bold futuristic uppercase, primary cyan, active hot pink, radiant multi-layer neon glow.',
    color: '#22D3EE',
    highlightColor: '#F43F5E',
    outlineColor: '#000000',
    outlineWidth: 2.0,
    glow: true,
    glowColor: '#22D3EE',
    isBox: false,
    boxColor: '#0F172A',
    boxOpacity: 0,
    boxRadius: 8,
    uppercase: true,
    size: 5.2,
    letterSpacing: 1,
    maxWidth: 80,
  },
  {
    id: 'Minimalist Clean',
    name: 'Minimalist Clean',
    tag: 'Modern Sans',
    description: 'Medium modern sans, primary white, active soft silver, clean diffused shadow.',
    color: '#FFFFFF',
    highlightColor: '#E2E8F0',
    outlineColor: '#000000',
    outlineWidth: 1.0,
    glow: false,
    glowColor: '#FFFFFF',
    isBox: false,
    boxColor: '#000000',
    boxOpacity: 0,
    boxRadius: 6,
    uppercase: false,
    size: 4.5,
    letterSpacing: 0,
    maxWidth: 85,
  },
  {
    id: 'Cinematic Boxed',
    name: 'Cinematic Boxed',
    tag: 'Frosted Pill',
    description: 'Elegant uppercase, wide letter-spacing, primary soft white, active sky blue, frosted dark translucent pill box.',
    color: '#F8FAFC',
    highlightColor: '#38BDF8',
    outlineColor: '#000000',
    outlineWidth: 0,
    glow: false,
    glowColor: '#38BDF8',
    isBox: true,
    boxColor: '#000000',
    boxOpacity: 70,
    boxRadius: 12,
    uppercase: true,
    size: 4.6,
    letterSpacing: 2,
    maxWidth: 78,
  },
  {
    id: 'Bold Impact',
    name: 'Bold Impact',
    tag: 'High Retention',
    description: 'Ultra-heavy condensed uppercase, primary white, active orange, solid 4px outline.',
    color: '#FFFFFF',
    highlightColor: '#FB923C',
    outlineColor: '#000000',
    outlineWidth: 4.0,
    glow: false,
    glowColor: '#FB923C',
    isBox: false,
    boxColor: '#000000',
    boxOpacity: 0,
    boxRadius: 8,
    uppercase: true,
    size: 5.8,
    letterSpacing: 0,
    maxWidth: 84,
  },
  {
    id: 'Retro Karaoke',
    name: 'Retro Karaoke',
    tag: 'Vibrant Badge',
    description: 'Rounded bold, primary light slate, active purple, rounded translucent highlight badge.',
    color: '#F1F5F9',
    highlightColor: '#A855F7',
    outlineColor: '#1E1B4B',
    outlineWidth: 2.5,
    glow: false,
    glowColor: '#A855F7',
    isBox: true,
    boxColor: '#3B0764',
    boxOpacity: 55,
    boxRadius: 16,
    uppercase: false,
    size: 5.0,
    letterSpacing: 0,
    maxWidth: 80,
  },
];

interface WizardState {
  workflowType: string;
  autoMode: boolean;

  step: number;
  furthestStep: number;
  goToStep: (step: number) => void;
  next: () => void;
  back: () => void;
  reset: () => void;

  provider: string;
  model: string;

  aspectRatio: AspectRatio;
  setAspectRatio: (ar: AspectRatio) => void;

  subject: string;
  language: string;
  tone: string;
  targetDuration: number;
  paragraphCount: number;
  systemPrompt: string;
  narration: string;
  keywords: string[];

  beats: Beat[];
  platforms: string[];
  publishingPlatforms: string[];

  voiceoverMode: string;
  voiceService: string;
  voice: string;
  voiceSpeed: number;
  voiceVolume: number;
  musicSource: string;

  burnSubtitles: boolean;
  subtitleFont: string;
  subtitlePosition: string;
  subtitleColor: string;
  subtitleHighlightColor: string;
  subtitleGlow: boolean;
  subtitleGlowColor: string;
  subtitleOutline: string;
  subtitlePreset: string;
  subtitleSize: number;
  subtitleY: number;
  subtitleOutlineWidth: number;
  subtitleBox: boolean;
  subtitleBoxColor: string;
  subtitleBoxOpacity: number;
  subtitleBoxRadius: number;
  subtitleLetterSpacing: number;
  subtitleUppercase: boolean;
  subtitleMaxWidth: number;

  applySubtitlePreset: (presetId: string) => void;

  // Branding & Watermark
  watermarkUrl: string;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  watermarkOpacity: number;
  watermarkScale: number;
  watermarkMargin: number;
  watermarkHandle: string;
  showWatermarkHandle: boolean;

  // Workspace
  workspaceId: string;
  campaignId: string;

  variants: number;
  autoPublish: boolean;

  set: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  togglePlatform: (id: string) => void;
  togglePublishingPlatform: (id: string) => void;

  busy: string | null;
  setBusy: (busy: string | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export const DEFAULT_SYSTEM_PROMPT =
  'You are a short-form video scriptwriter. Return narration only — no headings, no stage directions.';

const initialState = {
  step: 0,
  furthestStep: 0,
  provider: '',
  model: '',
  subject: '',
  language: 'Auto Detect',
  tone: 'Documentary',
  targetDuration: 30,
  paragraphCount: 4,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  narration: '',
  keywords: [],
  beats: [],
  platforms: ['pexels', 'pixabay'],
  voiceoverMode: 'Auto',
  voiceService: 'OpenAI TTS',
  voice: 'alloy',
  voiceSpeed: 1.0,
  voiceVolume: 100,
  musicSource: 'Random Background Music',
  burnSubtitles: true,
  subtitleFont: 'BeVietnamPro-Bold.ttf',
  subtitlePosition: 'Bottom (Recommended)',
  subtitleColor: '#FFFFFF',
  subtitleHighlightColor: '#FACC15',
  subtitleGlow: false,
  subtitleGlowColor: '#22D3EE',
  subtitleOutline: '#000000',
  subtitlePreset: 'Hormozi Pop',
  subtitleSize: 5.4,
  subtitleY: 78,
  subtitleOutlineWidth: 3.5,
  subtitleBox: false,
  subtitleBoxColor: '#000000',
  subtitleBoxOpacity: 70,
  subtitleBoxRadius: 8,
  subtitleLetterSpacing: 0,
  subtitleUppercase: true,
  subtitleMaxWidth: 82,
  // Branding & Watermark
  watermarkUrl: '',
  watermarkPosition: 'top-right' as const,
  watermarkOpacity: 0.85,
  watermarkScale: 1.0,
  watermarkMargin: 32,
  watermarkHandle: '@ClippedStudio',
  showWatermarkHandle: false,
  // Workspace
  workspaceId: 'default',
  campaignId: '',
  publishingPlatforms: ['youtube'],
  aspectRatio: '9:16' as AspectRatio,
  variants: 1,
  autoPublish: false,
  busy: null,
  error: null,
};

export const useWizardStore = create<WizardState>((set, get) => ({
  workflowType: 'footage',
  autoMode: false,
  ...initialState,

  setAspectRatio: (ar) => set({ aspectRatio: ar }),

  goToStep: (step) => set({ step }),
  next: () => {
    const step = Math.min(get().step + 1, STEPS.length - 1);
    set({ step, furthestStep: Math.max(step, get().furthestStep) });
  },
  back: () => set({ step: Math.max(get().step - 1, 0) }),
  reset: () => set(initialState),

  applySubtitlePreset: (presetId: string) => {
    const found = SUBTITLE_PRESETS.find(
      (p) => p.id.toLowerCase() === presetId.toLowerCase() || p.name.toLowerCase() === presetId.toLowerCase()
    );
    if (found) {
      set({
        subtitlePreset: found.name,
        subtitleColor: found.color,
        subtitleHighlightColor: found.highlightColor,
        subtitleOutline: found.outlineColor,
        subtitleOutlineWidth: found.outlineWidth,
        subtitleGlow: found.glow,
        subtitleGlowColor: found.glowColor,
        subtitleBox: found.isBox,
        subtitleBoxColor: found.boxColor,
        subtitleBoxOpacity: found.boxOpacity,
        subtitleBoxRadius: found.boxRadius,
        subtitleUppercase: found.uppercase,
        subtitleSize: found.size,
        subtitleLetterSpacing: found.letterSpacing,
        subtitleMaxWidth: found.maxWidth,
      });
    } else {
      set({ subtitlePreset: presetId });
    }
  },

  set: (key, value) => set({ [key]: value } as Partial<WizardState>),
  togglePlatform: (id) =>
    set((s) => ({
      platforms: s.platforms.includes(id)
        ? s.platforms.filter((p) => p !== id)
        : [...s.platforms, id],
    })),
  togglePublishingPlatform: (id) =>
    set((s) => ({
      publishingPlatforms: s.publishingPlatforms.includes(id)
        ? s.publishingPlatforms.filter((p) => p !== id)
        : [...s.publishingPlatforms, id],
    })),
  setBusy: (busy) => set({ busy }),
  setError: (error) => set({ error }),
}));
