export interface FalVideoModel {
  id: string;                    // fal endpoint id, e.g. "alibaba/wan-3.0/text-to-video"
  displayName: string;           // "Wan 3.0"
  family: 'wan' | 'kling' | 'seedance' | 'minimax' | 'grok' | 'happy-horse' | 'ltx' | 'veo' | 'pixverse';
  kind: 'text-to-video' | 'image-to-video' | 'reference-to-video' | 'motion-transfer' | 'video-edit';
  pricing: Record<string, number> | null;  // { "480p": 0.05, "720p": 0.10, "1080p": 0.20 }
  pricingUnit: 'per-second' | 'per-megapixel' | null;
  maxDuration: number | null;    // seconds
  hasAudio: boolean;
  deprecated?: boolean;
  notes?: string;
}

export const FAL_VIDEO_MODELS: FalVideoModel[] = [
  {
    id: 'alibaba/wan-3.0/text-to-video',
    displayName: 'Wan 3.0 (Text)',
    family: 'wan',
    kind: 'text-to-video',
    pricing: { '480p': 0.05, '720p': 0.10, '1080p': 0.20 },
    pricingUnit: 'per-second',
    maxDuration: 30,
    hasAudio: true,
    notes: '3 endpoints: t2v, i2v, ref2v'
  },
  {
    id: 'alibaba/wan-3.0/image-to-video',
    displayName: 'Wan 3.0 (Image)',
    family: 'wan',
    kind: 'image-to-video',
    pricing: { '480p': 0.05, '720p': 0.10, '1080p': 0.20 },
    pricingUnit: 'per-second',
    maxDuration: 30,
    hasAudio: true
  },
  {
    id: 'alibaba/wan-3.0/reference-to-video',
    displayName: 'Wan 3.0 (Reference)',
    family: 'wan',
    kind: 'reference-to-video',
    pricing: { '480p': 0.05, '720p': 0.10, '1080p': 0.20 },
    pricingUnit: 'per-second',
    maxDuration: 30,
    hasAudio: true
  },
  {
    id: 'alibaba/wan-3.0-prime/text-to-video',
    displayName: 'Wan 3.0 Prime (Text)',
    family: 'wan',
    kind: 'text-to-video',
    pricing: { '480p': 0.068, '720p': 0.14, '1080p': 0.28 },
    pricingUnit: 'per-second',
    maxDuration: 30,
    hasAudio: true,
    notes: 'faster turnaround'
  },
  {
    id: 'alibaba/wan-3.0-prime/image-to-video',
    displayName: 'Wan 3.0 Prime (Image)',
    family: 'wan',
    kind: 'image-to-video',
    pricing: { '480p': 0.068, '720p': 0.14, '1080p': 0.28 },
    pricingUnit: 'per-second',
    maxDuration: 30,
    hasAudio: true
  },
  {
    id: 'alibaba/wan-3.0-prime/reference-to-video',
    displayName: 'Wan 3.0 Prime (Reference)',
    family: 'wan',
    kind: 'reference-to-video',
    pricing: { '480p': 0.068, '720p': 0.14, '1080p': 0.28 },
    pricingUnit: 'per-second',
    maxDuration: 30,
    hasAudio: true
  },
  {
    id: 'fal-ai/wan/v2.7/text-to-video',
    displayName: 'Wan 2.7 (Text)',
    family: 'wan',
    kind: 'text-to-video',
    pricing: { '720p': 0.10, '1080p': 0.15 },
    pricingUnit: 'per-second',
    maxDuration: 15,
    hasAudio: true,
    notes: 'multi-aspect'
  },
  {
    id: 'fal-ai/wan/v2.7/reference-to-video',
    displayName: 'Wan 2.7 (Reference)',
    family: 'wan',
    kind: 'reference-to-video',
    pricing: { '720p': 0.10 },
    pricingUnit: 'per-second',
    maxDuration: 15,
    hasAudio: true,
    notes: 'bills input+output'
  },
  {
    id: 'fal-ai/wan/v2.2-a14b/text-to-video',
    displayName: 'Wan 2.2 A14B (Text)',
    family: 'wan',
    kind: 'text-to-video',
    pricing: { '480p': 0.04, '720p': 0.08, '580p': 0.06 },
    pricingUnit: 'per-second',
    maxDuration: null,
    hasAudio: false,
    notes: '16 fps, $0.06 at 580p'
  },
  {
    id: 'fal-ai/wan/v2.2-a14b/image-to-video',
    displayName: 'Wan 2.2 A14B (Image)',
    family: 'wan',
    kind: 'image-to-video',
    pricing: { '480p': 0.04, '720p': 0.08 },
    pricingUnit: 'per-second',
    maxDuration: null,
    hasAudio: false,
    notes: '16 fps'
  },
  {
    id: 'fal-ai/wan-motion',
    displayName: 'Wan Motion',
    family: 'wan',
    kind: 'motion-transfer',
    pricing: { '720p': 0.06 },
    pricingUnit: 'per-second',
    maxDuration: null,
    hasAudio: false,
    notes: 'motion transfer, +$0.08/call enhance_identity'
  },
  {
    id: 'fal-ai/kling-video/v3/standard/text-to-video',
    displayName: 'Kling V3 Standard (Text)',
    family: 'kling',
    kind: 'text-to-video',
    pricing: { 'default': 0.084, 'audio': 0.126, 'voice-control': 0.154 },
    pricingUnit: 'per-second',
    maxDuration: 15,
    hasAudio: true,
    notes: '+50% ($0.126/s) with audio'
  },
  {
    id: 'fal-ai/kling-video/v3/pro/text-to-video',
    displayName: 'Kling V3 Pro (Text)',
    family: 'kling',
    kind: 'text-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: 15,
    hasAudio: true
  },
  {
    id: 'fal-ai/kling-video/v3/4k/text-to-video',
    displayName: 'Kling V3 4K (Text)',
    family: 'kling',
    kind: 'text-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: 15,
    hasAudio: true
  },
  {
    id: 'fal-ai/kling-video/o3/standard/text-to-video',
    displayName: 'Kling O3 Standard (Text)',
    family: 'kling',
    kind: 'text-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: 15,
    hasAudio: true
  },
  {
    id: 'fal-ai/kling-video/o3/pro/text-to-video',
    displayName: 'Kling O3 Pro (Text)',
    family: 'kling',
    kind: 'text-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: 15,
    hasAudio: true
  },
  {
    id: 'fal-ai/kling-video/v1/standard/text-to-video',
    displayName: 'Kling V1 Standard (Text)',
    family: 'kling',
    kind: 'text-to-video',
    pricing: { 'default': 0.045 },
    pricingUnit: 'per-second',
    maxDuration: null,
    hasAudio: false,
    deprecated: true
  },
  {
    id: 'bytedance/seedance-2.0/text-to-video',
    displayName: 'Seedance 2.0 (Text)',
    family: 'seedance',
    kind: 'text-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: 15,
    hasAudio: true
  },
  {
    id: 'bytedance/seedance-2.0/image-to-video',
    displayName: 'Seedance 2.0 (Image)',
    family: 'seedance',
    kind: 'image-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: 15,
    hasAudio: true
  },
  {
    id: 'bytedance/seedance-2.0/reference-to-video',
    displayName: 'Seedance 2.0 (Reference)',
    family: 'seedance',
    kind: 'reference-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: 15,
    hasAudio: true
  },
  {
    id: 'bytedance/seedance-2.0/fast/text-to-video',
    displayName: 'Seedance 2.0 Fast (Text)',
    family: 'seedance',
    kind: 'text-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: 15,
    hasAudio: true
  },
  {
    id: 'bytedance/seedance-2.5/text-to-video',
    displayName: 'Seedance 2.5 (Text)',
    family: 'seedance',
    kind: 'text-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: 30,
    hasAudio: true,
    notes: '6 variants'
  },
  {
    id: 'bytedance/seedance-2.5/image-to-video',
    displayName: 'Seedance 2.5 (Image)',
    family: 'seedance',
    kind: 'image-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: 30,
    hasAudio: true
  },
  {
    id: 'bytedance/seedance-2.5/reference-to-video',
    displayName: 'Seedance 2.5 (Reference)',
    family: 'seedance',
    kind: 'reference-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: 30,
    hasAudio: true
  },
  {
    id: 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video',
    displayName: 'Seedance V1.5 Pro (Text)',
    family: 'seedance',
    kind: 'text-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: 15,
    hasAudio: true
  },
  {
    id: 'fal-ai/bytedance/seedance/v1/pro/text-to-video',
    displayName: 'Seedance V1 Pro (Text)',
    family: 'seedance',
    kind: 'text-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: 15,
    hasAudio: true
  },
  {
    id: 'minimax/h3/text-to-video',
    displayName: 'MiniMax H3 (Text)',
    family: 'minimax',
    kind: 'text-to-video',
    pricing: { '480p': 0.05, '768p': 0.06, '2K': 0.13, '4K': 0.16 },
    pricingUnit: 'per-second',
    maxDuration: 15,
    hasAudio: false
  },
  {
    id: 'minimax/h3/image-to-video',
    displayName: 'MiniMax H3 (Image)',
    family: 'minimax',
    kind: 'image-to-video',
    pricing: { '480p': 0.05, '768p': 0.06, '2K': 0.13, '4K': 0.16 },
    pricingUnit: 'per-second',
    maxDuration: 15,
    hasAudio: false
  },
  {
    id: 'minimax/h3/reference-to-video',
    displayName: 'MiniMax H3 (Reference)',
    family: 'minimax',
    kind: 'reference-to-video',
    pricing: { '480p': 0.05, '768p': 0.06, '2K': 0.13, '4K': 0.16 },
    pricingUnit: 'per-second',
    maxDuration: 15,
    hasAudio: false
  },
  {
    id: 'minimax/hailuo-2.3/standard/text-to-video',
    displayName: 'Hailuo 2.3 Standard (Text)',
    family: 'minimax',
    kind: 'text-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: 15,
    hasAudio: false
  },
  {
    id: 'minimax/hailuo-2.3/pro/text-to-video',
    displayName: 'Hailuo 2.3 Pro (Text)',
    family: 'minimax',
    kind: 'text-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: 15,
    hasAudio: false
  },
  {
    id: 'xai/grok-imagine-video/v1.5/text-to-video',
    displayName: 'Grok 1.5 (Text)',
    family: 'grok',
    kind: 'text-to-video',
    pricing: { '480p': 0.08, '720p': 0.14, '1080p': 0.25 },
    pricingUnit: 'per-second',
    maxDuration: 15,
    hasAudio: false
  },
  {
    id: 'xai/grok-imagine-video/v1.5/image-to-video',
    displayName: 'Grok 1.5 (Image)',
    family: 'grok',
    kind: 'image-to-video',
    pricing: { '480p': 0.08, '720p': 0.14, '1080p': 0.25 },
    pricingUnit: 'per-second',
    maxDuration: 15,
    hasAudio: false
  },
  {
    id: 'xai/grok-imagine-video/v1.5/reference-to-video',
    displayName: 'Grok 1.5 (Reference)',
    family: 'grok',
    kind: 'reference-to-video',
    pricing: { '480p': 0.08, '720p': 0.14, '1080p': 0.25 },
    pricingUnit: 'per-second',
    maxDuration: 15,
    hasAudio: false
  },
  {
    id: 'alibaba/happy-horse/text-to-video',
    displayName: 'Happy Horse (Text)',
    family: 'happy-horse',
    kind: 'text-to-video',
    pricing: { '720p': 0.14, '1080p': 0.28 },
    pricingUnit: 'per-second',
    maxDuration: 15,
    hasAudio: true
  },
  {
    id: 'alibaba/happy-horse/image-to-video',
    displayName: 'Happy Horse (Image)',
    family: 'happy-horse',
    kind: 'image-to-video',
    pricing: { '720p': 0.14, '1080p': 0.28 },
    pricingUnit: 'per-second',
    maxDuration: 15,
    hasAudio: true
  },
  {
    id: 'alibaba/happy-horse/reference-to-video',
    displayName: 'Happy Horse (Reference)',
    family: 'happy-horse',
    kind: 'reference-to-video',
    pricing: { '720p': 0.14, '1080p': 0.28 },
    pricingUnit: 'per-second',
    maxDuration: 15,
    hasAudio: true
  },
  {
    id: 'alibaba/happy-horse/video-edit',
    displayName: 'Happy Horse (Edit)',
    family: 'happy-horse',
    kind: 'video-edit',
    pricing: { '720p': 0.14, '1080p': 0.28 },
    pricingUnit: 'per-second',
    maxDuration: 15,
    hasAudio: true
  },
  {
    id: 'fal-ai/ltx-2.3-22b/text-to-video',
    displayName: 'LTX 2.3 22B (Text)',
    family: 'ltx',
    kind: 'text-to-video',
    pricing: { 'default': 0.001605 },
    pricingUnit: 'per-megapixel',
    maxDuration: null,
    hasAudio: false
  },
  {
    id: 'fal-ai/ltx-2.3-22b/image-to-video',
    displayName: 'LTX 2.3 22B (Image)',
    family: 'ltx',
    kind: 'image-to-video',
    pricing: { 'default': 0.001605 },
    pricingUnit: 'per-megapixel',
    maxDuration: null,
    hasAudio: false
  },
  {
    id: 'fal-ai/veo3.1',
    displayName: 'Veo 3.1',
    family: 'veo',
    kind: 'text-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: null,
    hasAudio: false
  },
  {
    id: 'fal-ai/veo3.1/lite',
    displayName: 'Veo 3.1 Lite',
    family: 'veo',
    kind: 'text-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: null,
    hasAudio: false
  },
  {
    id: 'fal-ai/pixverse/v6/text-to-video',
    displayName: 'PixVerse V6 (Text)',
    family: 'pixverse',
    kind: 'text-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: null,
    hasAudio: false
  },
  {
    id: 'fal-ai/pixverse/v6/image-to-video',
    displayName: 'PixVerse V6 (Image)',
    family: 'pixverse',
    kind: 'image-to-video',
    pricing: null,
    pricingUnit: null,
    maxDuration: null,
    hasAudio: false
  }
];

export const DEFAULT_FAL_VIDEO_MODEL = 'alibaba/wan-3.0-prime/text-to-video';

export function getFalVideoModel(id: string): FalVideoModel | undefined {
  return FAL_VIDEO_MODELS.find(m => m.id === id);
}

export function estimateFalVideoCost(modelId: string, durationSec: number, resolution: string): number | null {
  const model = getFalVideoModel(modelId);
  if (!model || !model.pricing || model.pricingUnit !== 'per-second') return null;
  
  const rate = model.pricing[resolution] || model.pricing['default'];
  if (rate === undefined) return null;

  return rate * durationSec;
}
