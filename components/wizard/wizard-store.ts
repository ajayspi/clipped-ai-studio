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
  subtitleOutline: string;
  subtitlePreset: string;
  subtitleSize: number;
  subtitleY: number;
  subtitleOutlineWidth: number;
  subtitleBox: boolean;
  subtitleBoxColor: string;
  subtitleUppercase: boolean;
  subtitleMaxWidth: number;

  variants: number;
  autoPublish: boolean;

  set: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  togglePlatform: (id: string) => void;

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
  subtitleColor: '#ffffff',
  subtitleOutline: '#000000',
  subtitlePreset: 'Clean',
  subtitleSize: 5.2,
  subtitleY: 78,
  subtitleOutlineWidth: 2.5,
  subtitleBox: false,
  subtitleBoxColor: '#000000',
  subtitleUppercase: false,
  subtitleMaxWidth: 82,
  platforms: ['youtube'],
  aspectRatio: '9:16',
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

  set: (key, value) => set({ [key]: value } as Partial<WizardState>),
  togglePlatform: (id) =>
    set((s) => ({
      platforms: s.platforms.includes(id)
        ? s.platforms.filter((p) => p !== id)
        : [...s.platforms, id],
    })),
  setBusy: (busy) => set({ busy }),
  setError: (error) => set({ error }),
}));
