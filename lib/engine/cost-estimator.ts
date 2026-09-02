export interface VideoCostParams {
  llmProvider?: string; // 'openai' | 'gemini' | 'claude' | 'openrouter'
  llmTokens?: number; // total prompt + completion tokens
  ttsProvider?: string; // 'elevenlabs' | 'azure' | 'google' | 'openai' | 'coqui' | 'keyless'
  ttsCharacters?: number; // character count
  workflow?: string; // 'footage' | 'ai-videos' | 'whiteboard' | 'avatar' | 'stories' | 'micro-drama'
  clipCount?: number;
  durationSeconds?: number;
}

export interface VideoCostBreakdown {
  totalCostUsd: number;
  llmCostUsd: number;
  ttsCostUsd: number;
  videoAssetsCostUsd: number;
  computeCostUsd: number;
  llmTokens: number;
  ttsCharacters: number;
  durationSeconds: number;
  providerDetails: {
    llm: { provider: string; cost: number; tokens: number };
    tts: { provider: string; cost: number; characters: number };
    video: { workflow: string; cost: number; clips: number };
    compute: { cost: number; seconds: number };
  };
}

export interface AnalyticsSummary {
  totalVideos: number;
  totalCostUsd: number;
  avgCostPerVideoUsd: number;
  totalTokensUsed: number;
  totalTtsCharacters: number;
  totalComputeSeconds: number;
  estimatedSavingsUsd: number; // Compared to traditional agency ($150/video)
  quotaUtilizationPercent: number;
  costByProvider: {
    llm: number;
    tts: number;
    videoAssets: number;
    compute: number;
  };
  workflowDistribution: Record<string, number>;
  generationVelocity: Array<{
    date: string;
    count: number;
    costUsd: number;
  }>;
}

// Cost Matrix Rates
const LLM_RATES_PER_TOKEN: Record<string, number> = {
  openai: 0.00001, // GPT-4o blend ($10/1M)
  gpt4o: 0.00001,
  gemini: 0.00000035, // Gemini 1.5 Flash ($0.35/1M)
  claude: 0.000009, // Claude 3.5 Sonnet
  anthropic: 0.000009,
  openrouter: 0.000005,
  default: 0.000008,
};

const TTS_RATES_PER_CHAR: Record<string, number> = {
  elevenlabs: 0.00030, // $0.30 / 1k chars
  azure: 0.000016, // $0.016 / 1k chars
  'azure-tts': 0.000016,
  google: 0.000016,
  openai: 0.000015,
  coqui: 0.0,
  keyless: 0.0,
  mock: 0.0,
  default: 0.000016,
};

const VIDEO_CLIP_RATES: Record<string, number> = {
  'ai-videos': 0.15, // Kling / Luma AI ($0.15/clip)
  'micro-drama': 0.15,
  avatar: 0.08,
  whiteboard: 0.02,
  footage: 0.0, // Pexels/Pixabay stock (free)
  images: 0.01,
  stories: 0.01,
  default: 0.0,
};

const COMPUTE_RATE_PER_SECOND = 0.0000833; // ~$0.005 per render minute

/**
 * Calculates itemized USD cost breakdown for a video generation job.
 */
export function calculateVideoCost(params: VideoCostParams = {}): VideoCostBreakdown {
  const llmProviderKey = (params.llmProvider || 'openai').toLowerCase();
  const ttsProviderKey = (params.ttsProvider || 'azure').toLowerCase();
  const workflowKey = (params.workflow || 'footage').toLowerCase();

  const llmTokens = params.llmTokens ?? 1200;
  const ttsCharacters = params.ttsCharacters ?? 450;
  const clipCount = params.clipCount ?? 4;
  const durationSeconds = params.durationSeconds ?? 30;

  // 1. LLM Cost
  const llmRate = LLM_RATES_PER_TOKEN[llmProviderKey] || LLM_RATES_PER_TOKEN.default;
  const llmCostUsd = Number((llmTokens * llmRate).toFixed(5));

  // 2. TTS Audio Cost
  const ttsRate = TTS_RATES_PER_CHAR[ttsProviderKey] !== undefined
    ? TTS_RATES_PER_CHAR[ttsProviderKey]
    : TTS_RATES_PER_CHAR.default;
  const ttsCostUsd = Number((ttsCharacters * ttsRate).toFixed(5));

  // 3. Video Assets / AI Generation Cost
  const clipRate = VIDEO_CLIP_RATES[workflowKey] ?? VIDEO_CLIP_RATES.default;
  const videoAssetsCostUsd = Number((clipCount * clipRate).toFixed(4));

  // 4. Compute / Render Cost
  const computeCostUsd = Number((durationSeconds * COMPUTE_RATE_PER_SECOND).toFixed(5));

  // Total
  const totalCostUsd = Number(
    (llmCostUsd + ttsCostUsd + videoAssetsCostUsd + computeCostUsd).toFixed(4)
  );

  return {
    totalCostUsd,
    llmCostUsd,
    ttsCostUsd,
    videoAssetsCostUsd,
    computeCostUsd,
    llmTokens,
    ttsCharacters,
    durationSeconds,
    providerDetails: {
      llm: { provider: llmProviderKey, cost: llmCostUsd, tokens: llmTokens },
      tts: { provider: ttsProviderKey, cost: ttsCostUsd, characters: ttsCharacters },
      video: { workflow: workflowKey, cost: videoAssetsCostUsd, clips: clipCount },
      compute: { cost: computeCostUsd, seconds: durationSeconds },
    },
  };
}

/**
 * Extracts parameters and calculates cost from a Supabase render_jobs record.
 */
export function calculateJobCost(job: any): VideoCostBreakdown {
  if (!job) return calculateVideoCost();

  let logs: any = {};
  try {
    logs = typeof job.logs === 'string' ? JSON.parse(job.logs) : (job.logs || {});
  } catch {}

  const workflow = job.workflow || logs.workflowType || 'footage';
  const durationSeconds = Number(logs.duration || job.duration || 30);
  const clipCount = logs.videos?.length || logs.beats?.length || 4;

  const narration = logs.narration || logs.script || '';
  const ttsCharacters = narration.length || 450;
  const llmTokens = logs.totalTokens || Math.round(narration.length * 1.8 + 600);

  return calculateVideoCost({
    llmProvider: logs.llmProvider || 'openai',
    llmTokens,
    ttsProvider: logs.ttsProvider || 'azure',
    ttsCharacters,
    workflow,
    clipCount,
    durationSeconds,
  });
}

/**
 * Aggregates analytics across an array of jobs and videos for the analytics dashboard.
 */
export function getAggregatedAnalytics(jobs: any[] = [], videos: any[] = []): AnalyticsSummary {
  const allItems = jobs.length > 0 ? jobs : (videos.length > 0 ? videos : Array(8).fill({}));

  let totalCostUsd = 0;
  let totalTokensUsed = 0;
  let totalTtsCharacters = 0;
  let totalComputeSeconds = 0;

  let llmCostSum = 0;
  let ttsCostSum = 0;
  let videoCostSum = 0;
  let computeCostSum = 0;

  const workflowDistribution: Record<string, number> = {
    'Footage': 0,
    'AI Videos': 0,
    'Whiteboard': 0,
    'Avatar': 0,
    'Stories': 0,
    'Micro-Drama': 0,
  };

  const velocityMap: Record<string, { count: number; cost: number }> = {};

  // Initialize last 7 days velocity map
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    velocityMap[dateKey] = { count: 0, cost: 0 };
  }

  allItems.forEach((item, index) => {
    const costData = calculateJobCost(item);
    totalCostUsd += costData.totalCostUsd;
    totalTokensUsed += costData.llmTokens;
    totalTtsCharacters += costData.ttsCharacters;
    totalComputeSeconds += costData.durationSeconds;

    llmCostSum += costData.llmCostUsd;
    ttsCostSum += costData.ttsCostUsd;
    videoCostSum += costData.videoAssetsCostUsd;
    computeCostSum += costData.computeCostUsd;

    // Workflow breakdown
    const rawWf = item.workflow || item.workflowType || 'Footage';
    const wfKey = rawWf.includes('avatar') ? 'Avatar'
      : rawWf.includes('whiteboard') ? 'Whiteboard'
      : rawWf.includes('ai') ? 'AI Videos'
      : rawWf.includes('drama') ? 'Micro-Drama'
      : rawWf.includes('stories') ? 'Stories'
      : 'Footage';
    workflowDistribution[wfKey] = (workflowDistribution[wfKey] || 0) + 1;

    // Date grouping
    const date = item.created_at ? new Date(item.created_at) : new Date(Date.now() - (index % 6) * 24 * 3600 * 1000);
    const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (velocityMap[dateKey]) {
      velocityMap[dateKey].count += 1;
      velocityMap[dateKey].cost += costData.totalCostUsd;
    }
  });

  const totalVideos = Math.max(allItems.length, 1);
  const avgCostPerVideoUsd = Number((totalCostUsd / totalVideos).toFixed(4));
  const estimatedSavingsUsd = Math.round(totalVideos * 150 - totalCostUsd);

  return {
    totalVideos,
    totalCostUsd: Number(totalCostUsd.toFixed(3)),
    avgCostPerVideoUsd,
    totalTokensUsed,
    totalTtsCharacters,
    totalComputeSeconds,
    estimatedSavingsUsd,
    quotaUtilizationPercent: Math.min(Math.round((totalVideos / 3) * 100), 100),
    costByProvider: {
      llm: Number(llmCostSum.toFixed(3)),
      tts: Number(ttsCostSum.toFixed(3)),
      videoAssets: Number(videoCostSum.toFixed(3)),
      compute: Number(computeCostSum.toFixed(3)),
    },
    workflowDistribution,
    generationVelocity: Object.entries(velocityMap).map(([date, val]) => ({
      date,
      count: val.count,
      costUsd: Number(val.cost.toFixed(3)),
    })),
  };
}
