import { type BrandDesignTokens, getDefaultBrandTokens } from './types';
export type { BrandDesignTokens };
export { getDefaultBrandTokens };

export type SupportedAspectRatio = '9:16' | '16:9' | '1:1';

export interface JobLogsPayload {
  subject?: string;
  title?: string;
  workflow?: string;
  workflowType?: string;
  duration?: number;
  finalVideoUrl?: string;
  outputUrl?: string;
  videoUrl?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  aspectRatio?: string;
  clipCount?: number;
  brandTokens?: Partial<BrandDesignTokens>;
  designTokens?: Partial<BrandDesignTokens>;
  brandKit?: Record<string, unknown>;
  input?: {
    title?: string;
    genre?: string;
    aspectRatio?: string;
    brandTokens?: Partial<BrandDesignTokens>;
    [key: string]: unknown;
  };
  result?: {
    title?: string;
    outputUrl?: string;
    characterSheetUrl?: string;
    metadata?: {
      aspectRatio?: string;
      [key: string]: unknown;
    };
    episodes?: Array<{
      scenes?: Array<{
        avatarUrl?: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  beats?: Array<{
    imageUrl?: string;
    selectedVideo?: { url?: string; [key: string]: unknown };
    [key: string]: unknown;
  }>;
  videos?: Array<{
    thumbnail?: string;
    video?: string;
    previewUrl?: string;
    [key: string]: unknown;
  }>;
  analysis?: {
    scenes?: unknown[];
    [key: string]: unknown;
  };
  tensionCurve?: number[];
  [key: string]: unknown;
}

export interface CanonicalJobPresentation {
  id: string;
  video_id: string;
  title: string;
  status: string;
  orchestration_state?: string;
  progress: number;
  thumbnail: string;
  thumbnailUrl: string;
  output_url: string | null;
  outputUrl: string | null;
  aspectRatio: SupportedAspectRatio;
  workflow_type: string;
  workflowType: string;
  clip_count: number;
  clipCount: number;
  durationSeconds: number;
  errorMessage: string | null;
  error_message: string | null;
  workspace_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  logs: JobLogsPayload;
  brandTokens: BrandDesignTokens;
}

export function getWorkflowFallbackCover(type?: unknown): string {
  const map: Record<string, string> = {
    'auto': '/images/workflows/auto_cover.jpg',
    'ai-videos': '/images/workflows/ai_videos_cover.jpg',
    'ai-video': '/images/workflows/ai_videos_cover.jpg',
    'aivideo': '/images/workflows/ai_videos_cover.jpg',
    'avatar': '/images/workflows/avatar_cover.jpg',
    'micro-drama': '/images/workflows/drama_cover.jpg',
    'drama': '/images/workflows/drama_cover.jpg',
    'cinema': '/images/workflows/drama_cover.jpg',
    'whiteboard': '/images/workflows/whiteboard_cover.jpg',
    'stories': '/images/workflows/stories_cover.jpg',
    'story': '/images/workflows/stories_cover.jpg',
    'bulk': '/images/workflows/bulk_cover.jpg',
    'campaign': '/images/workflows/bulk_cover.jpg',
    'extract-shorts': '/images/workflows/shorts_cover.jpg',
    'shorts': '/images/workflows/shorts_cover.jpg',
    'short': '/images/workflows/shorts_cover.jpg',
    'footage': '/images/workflows/footage_cover.jpg',
    'images': '/images/workflows/images_cover.jpg',
    'image': '/images/workflows/images_cover.jpg',
    'url': '/images/workflows/url_cover.jpg',
    'mission': '/images/workflows/mission_cover.jpg',
    'stick-figure': '/images/workflows/whiteboard_cover.jpg',
    'stickman': '/images/workflows/whiteboard_cover.jpg',
    '2d': '/images/workflows/whiteboard_cover.jpg',
    'podcast': '/images/workflows/avatar_cover.jpg',
    'code-video': '/images/workflows/whiteboard_cover.jpg',
    'reddit': '/images/workflows/shorts_cover.jpg',
    'trivia': '/images/workflows/shorts_cover.jpg',
    'previs': '/images/workflows/drama_cover.jpg',
    'scriptbreak': '/images/workflows/drama_cover.jpg',
    'yaml': '/images/workflows/bulk_cover.jpg',
  };
  const str = typeof type === 'string' ? type : '';
  const key = str.toLowerCase().trim().replace(/\s+/g, '-');
  return map[key] || '/images/workflows/auto_cover.jpg';
}

function parseTokensCandidate(candidate: unknown): Partial<BrandDesignTokens> | undefined {
  if (!candidate) return undefined;
  if (typeof candidate === 'string') {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Partial<BrandDesignTokens>;
      }
    } catch {
      return undefined;
    }
  } else if (typeof candidate === 'object' && !Array.isArray(candidate)) {
    return candidate as Partial<BrandDesignTokens>;
  }
  return undefined;
}

export function normalizeAspectRatio(val: unknown): SupportedAspectRatio {
  if (typeof val === 'string') {
    const normalized = val.trim().toLowerCase().replace('/', ':');
    if (normalized === '9:16' || normalized === 'portrait') {
      return '9:16';
    }
    if (normalized === '16:9' || normalized === 'landscape') {
      return '16:9';
    }
    if (normalized === '1:1' || normalized === 'square') {
      return '1:1';
    }
  }
  return '9:16';
}

export function extractJobPresentation(
  job: Record<string, unknown> | null | undefined
): CanonicalJobPresentation {
  const safeJob = job || {};
  let logs: JobLogsPayload = {};
  if (typeof safeJob.logs === 'string') {
    try {
      const parsed = JSON.parse(safeJob.logs);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        logs = parsed as JobLogsPayload;
      }
    } catch {
      logs = {};
    }
  } else if (safeJob.logs && typeof safeJob.logs === 'object' && !Array.isArray(safeJob.logs)) {
    logs = safeJob.logs as JobLogsPayload;
  }

  const id = String(safeJob.id || '');
  const title =
    (typeof safeJob.title === 'string' && safeJob.title) ||
    logs.subject ||
    logs.title ||
    logs.input?.title ||
    logs.result?.title ||
    (id ? `Video ${id.slice(0, 8)}` : 'Untitled Video');

  const outputUrl =
    (typeof safeJob.output_url === 'string' && safeJob.output_url) ||
    logs.finalVideoUrl ||
    logs.outputUrl ||
    logs.videoUrl ||
    logs.result?.outputUrl ||
    (safeJob.status === 'completed' && id ? `/renders/${id}.mp4` : null);

  const rawWorkflow =
    (typeof safeJob.workflow_type === 'string' && safeJob.workflow_type) ||
    (typeof safeJob.workflowType === 'string' && safeJob.workflowType) ||
    (typeof logs.workflow === 'string'
      ? logs.workflow
      : typeof logs.workflowType === 'string'
      ? logs.workflowType
      : 'auto');

  const thumbnailUrl =
    (typeof safeJob.thumbnail_url === 'string' && safeJob.thumbnail_url) ||
    (typeof safeJob.thumbnailUrl === 'string' && safeJob.thumbnailUrl) ||
    (typeof safeJob.thumbnail === 'string' && safeJob.thumbnail) ||
    logs.thumbnail ||
    logs.thumbnailUrl ||
    logs.beats?.[0]?.imageUrl ||
    logs.beats?.[0]?.selectedVideo?.url ||
    logs.result?.episodes?.[0]?.scenes?.[0]?.avatarUrl ||
    logs.result?.characterSheetUrl ||
    logs.videos?.[0]?.thumbnail ||
    getWorkflowFallbackCover(rawWorkflow);

  const rawTokens =
    parseTokensCandidate(logs.brandTokens) ||
    parseTokensCandidate(logs.designTokens) ||
    parseTokensCandidate(logs.brand_tokens) ||
    parseTokensCandidate(logs.design_tokens) ||
    parseTokensCandidate(logs.input?.brandTokens) ||
    parseTokensCandidate(logs.input?.brand_tokens) ||
    parseTokensCandidate(safeJob.brand_tokens) ||
    parseTokensCandidate(safeJob.brandTokens) ||
    undefined;
  const defaultTokens = getDefaultBrandTokens();

  const brandKitPrimary =
    typeof logs.brandKit?.customSubtitleColor === 'string'
      ? (logs.brandKit.customSubtitleColor as string)
      : undefined;

  const rawAspect =
    rawTokens?.geometry?.aspectRatio ||
    logs.aspectRatio ||
    logs.input?.aspectRatio ||
    logs.result?.metadata?.aspectRatio ||
    (typeof safeJob.aspect_ratio === 'string' ? safeJob.aspect_ratio : null) ||
    (typeof safeJob.aspectRatio === 'string' ? safeJob.aspectRatio : null) ||
    '9:16';
  const aspectRatio = normalizeAspectRatio(rawAspect);

  const brandTokens: BrandDesignTokens = {
    typography: {
      ...defaultTokens.typography,
      ...(rawTokens?.typography || {}),
    },
    colors: {
      ...defaultTokens.colors,
      ...(brandKitPrimary ? { primary: brandKitPrimary } : {}),
      ...(rawTokens?.colors || {}),
    },
    geometry: {
      ...defaultTokens.geometry,
      ...(rawTokens?.geometry || {}),
      aspectRatio,
    },
  };

  const workflowType =
    (typeof logs.workflow === 'string' && logs.workflow) ||
    (typeof logs.workflowType === 'string' && logs.workflowType) ||
    (typeof logs.input?.genre === 'string' && logs.input.genre) ||
    (typeof safeJob.workflow_type === 'string' && safeJob.workflow_type) ||
    'AI Video';

  const progress =
    typeof safeJob.progress === 'number' && !isNaN(safeJob.progress)
      ? safeJob.progress
      : typeof safeJob.progress === 'string' && !isNaN(Number(safeJob.progress))
      ? Number(safeJob.progress)
      : (safeJob.status === 'completed' ? 100 : 0);

  const clipCount =
    Array.isArray(logs.beats) && logs.beats.length > 0
      ? logs.beats.length
      : Array.isArray(logs.beats)
      ? 1
      : (logs.videos?.length || logs.clipCount || 1);

  const parsedDuration =
    typeof logs.duration === 'number' && !isNaN(logs.duration)
      ? logs.duration
      : typeof logs.duration === 'string' && !isNaN(Number(logs.duration))
      ? Number(logs.duration)
      : (clipCount * 3);
  const durationSeconds = parsedDuration > 0 ? parsedDuration : (clipCount * 3);

  const errorMessage =
    (typeof safeJob.error_message === 'string' && safeJob.error_message) ||
    (typeof safeJob.last_error === 'string' && safeJob.last_error) ||
    null;

  return {
    ...safeJob,
    id,
    video_id: id,
    title,
    status: (typeof safeJob.status === 'string' && safeJob.status) || 'pending',
    orchestration_state: typeof safeJob.orchestration_state === 'string' ? safeJob.orchestration_state : undefined,
    progress,
    thumbnail: thumbnailUrl,
    thumbnailUrl,
    output_url: outputUrl,
    outputUrl,
    aspectRatio,
    workflow_type: workflowType,
    workflowType,
    clip_count: clipCount,
    clipCount,
    durationSeconds,
    errorMessage,
    error_message: errorMessage,
    workspace_id: typeof safeJob.workspace_id === 'string' ? safeJob.workspace_id : null,
    created_at: typeof safeJob.created_at === 'string' ? safeJob.created_at : null,
    updated_at: typeof safeJob.updated_at === 'string' ? safeJob.updated_at : null,
    logs,
    brandTokens,
  };
}
