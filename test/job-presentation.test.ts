import { describe, it, expect } from 'vitest';
import {
  extractJobPresentation,
  getWorkflowFallbackCover,
  normalizeAspectRatio,
} from '@/lib/engine/job-presentation';

describe('Job Presentation Extraction Engine', () => {
  it('extracts canonical fields from empty job object', () => {
    const res = extractJobPresentation({});
    expect(res.id).toBe('');
    expect(res.title).toBe('Untitled Video');
    expect(res.status).toBe('pending');
    expect(res.progress).toBe(0);
    expect(res.aspectRatio).toBe('9:16');
    expect(res.workflowType).toBe('AI Video');
    expect(res.clipCount).toBe(1);
    expect(res.durationSeconds).toBe(3);
    expect(res.outputUrl).toBeNull();
    expect(res.thumbnailUrl).toBe('/images/workflows/auto_cover.jpg');
    expect(res.errorMessage).toBeNull();
  });

  it('safely parses stringified JSON logs', () => {
    const job = {
      id: 'job-12345678-abcd',
      status: 'completed',
      logs: JSON.stringify({
        subject: 'Cyberpunk Odyssey',
        aspectRatio: '16:9',
        workflow: 'drama',
        finalVideoUrl: 'https://cdn.example.com/renders/cyberpunk.mp4',
        beats: [
          { imageUrl: 'https://cdn.example.com/images/beat1.jpg' },
          { imageUrl: 'https://cdn.example.com/images/beat2.jpg' },
        ],
        duration: 45,
      }),
    };

    const res = extractJobPresentation(job);
    expect(res.title).toBe('Cyberpunk Odyssey');
    expect(res.aspectRatio).toBe('16:9');
    expect(res.workflowType).toBe('drama');
    expect(res.outputUrl).toBe('https://cdn.example.com/renders/cyberpunk.mp4');
    expect(res.output_url).toBe('https://cdn.example.com/renders/cyberpunk.mp4');
    expect(res.thumbnailUrl).toBe('https://cdn.example.com/images/beat1.jpg');
    expect(res.thumbnail).toBe('https://cdn.example.com/images/beat1.jpg');
    expect(res.clipCount).toBe(2);
    expect(res.clip_count).toBe(2);
    expect(res.durationSeconds).toBe(45);
    expect(res.progress).toBe(100);
  });

  it('correctly handles already parsed object logs', () => {
    const job = {
      id: 'job-87654321',
      status: 'processing',
      progress: 65,
      logs: {
        input: { title: 'Viral Finance Tips', genre: 'Shorts' },
        outputUrl: 'https://cdn.example.com/preview.mp4',
        beats: [{ selectedVideo: { url: 'https://cdn.example.com/thumb.jpg' } }],
      },
    };

    const res = extractJobPresentation(job);
    expect(res.title).toBe('Viral Finance Tips');
    expect(res.workflowType).toBe('Shorts');
    expect(res.progress).toBe(65);
    expect(res.outputUrl).toBe('https://cdn.example.com/preview.mp4');
    expect(res.thumbnailUrl).toBe('https://cdn.example.com/thumb.jpg');
  });

  it('normalizes aspect ratios accurately', () => {
    expect(normalizeAspectRatio('16:9')).toBe('16:9');
    expect(normalizeAspectRatio('16/9')).toBe('16:9');
    expect(normalizeAspectRatio('9:16')).toBe('9:16');
    expect(normalizeAspectRatio('9/16')).toBe('9:16');
    expect(normalizeAspectRatio('1:1')).toBe('1:1');
    expect(normalizeAspectRatio('invalid')).toBe('9:16');
    expect(normalizeAspectRatio(null)).toBe('9:16');
    expect(normalizeAspectRatio(undefined)).toBe('9:16');
  });

  it('resolves fallback covers for different workflow types', () => {
    expect(getWorkflowFallbackCover('drama')).toBe('/images/workflows/drama_cover.jpg');
    expect(getWorkflowFallbackCover('ai-videos')).toBe('/images/workflows/ai_videos_cover.jpg');
    expect(getWorkflowFallbackCover('shorts')).toBe('/images/workflows/shorts_cover.jpg');
    expect(getWorkflowFallbackCover('whiteboard')).toBe('/images/workflows/whiteboard_cover.jpg');
    expect(getWorkflowFallbackCover('unknown-workflow')).toBe('/images/workflows/auto_cover.jpg');
    expect(getWorkflowFallbackCover(null)).toBe('/images/workflows/auto_cover.jpg');
  });

  it('handles completed job without explicit output_url by generating /renders/:id.mp4', () => {
    const job = {
      id: 'abc12345',
      status: 'completed',
      logs: {},
    };
    const res = extractJobPresentation(job);
    expect(res.outputUrl).toBe('/renders/abc12345.mp4');
  });

  it('handles error message propagation', () => {
    const job = {
      id: 'err-job-1',
      status: 'failed',
      last_error: 'FFmpeg filter graph compilation error',
    };
    const res = extractJobPresentation(job);
    expect(res.errorMessage).toBe('FFmpeg filter graph compilation error');
    expect(res.error_message).toBe('FFmpeg filter graph compilation error');
  });

  it('safely handles null JSON string logs ("null") without crashing', () => {
    const job = {
      id: 'null-logs-job',
      status: 'pending',
      logs: 'null',
    };
    const res = extractJobPresentation(job);
    expect(res.title).toBe('Video null-log');
    expect(res.outputUrl).toBeNull();
    expect(res.thumbnailUrl).toBe('/images/workflows/auto_cover.jpg');
    expect(res.logs).toEqual({});
  });

  it('safely handles non-object JSON logs (arrays, primitive strings, numbers)', () => {
    const jobArray = { id: 'arr-1', logs: '[1, 2, 3]' };
    const resArray = extractJobPresentation(jobArray);
    expect(resArray.logs).toEqual({});
    expect(resArray.clipCount).toBe(1);

    const jobStr = { id: 'str-1', logs: '"just a string"' };
    const resStr = extractJobPresentation(jobStr);
    expect(resStr.logs).toEqual({});

    const jobNum = { id: 'num-1', logs: '42' };
    const resNum = extractJobPresentation(jobNum);
    expect(resNum.logs).toEqual({});
  });

  it('safely handles getWorkflowFallbackCover when passed non-string objects', () => {
    expect(getWorkflowFallbackCover({ id: 123 } as unknown as string)).toBe('/images/workflows/auto_cover.jpg');
    expect(getWorkflowFallbackCover([1, 2] as unknown as string)).toBe('/images/workflows/auto_cover.jpg');
    expect(getWorkflowFallbackCover(undefined)).toBe('/images/workflows/auto_cover.jpg');
    expect(getWorkflowFallbackCover(null)).toBe('/images/workflows/auto_cover.jpg');
  });

  it('normalizes keyword aspect ratios (landscape, portrait, square)', () => {
    expect(normalizeAspectRatio('landscape')).toBe('16:9');
    expect(normalizeAspectRatio('LANDSCAPE')).toBe('16:9');
    expect(normalizeAspectRatio('portrait')).toBe('9:16');
    expect(normalizeAspectRatio('PORTRAIT')).toBe('9:16');
    expect(normalizeAspectRatio('square')).toBe('1:1');
    expect(normalizeAspectRatio('SQUARE')).toBe('1:1');
  });

  it('handles numeric string duration and empty beats array fallback', () => {
    const job = {
      id: 'num-dur',
      status: 'processing',
      logs: {
        duration: '52',
        beats: [],
      },
    };
    const res = extractJobPresentation(job);
    expect(res.durationSeconds).toBe(52);
    expect(res.clipCount).toBe(1);
  });

  it('exports canonical getDefaultBrandTokens and sets them on presentation', () => {
    const res = extractJobPresentation({});
    expect(res.brandTokens).toBeDefined();
    expect(res.brandTokens.typography.fontFamily).toBe('Inter, sans-serif');
    expect(res.brandTokens.typography.fontSize).toBe(24);
    expect(res.brandTokens.colors.primary).toBe('#ffffff');
    expect(res.brandTokens.colors.accent).toBe('#6366f1');
    expect(res.brandTokens.geometry.aspectRatio).toBe('9:16');
  });

  it('recognizes design token overrides from object logs and synchronizes aspect ratio', () => {
    const job = {
      id: 'custom-tokens-1',
      logs: {
        brandTokens: {
          typography: {
            fontFamily: 'Roboto, sans-serif',
            fontSize: 32,
            fontWeight: '900',
            textTransform: 'uppercase' as const,
          },
          colors: {
            primary: '#ffdd00',
            accent: '#ff0055',
          },
          geometry: {
            aspectRatio: '16:9' as const,
          },
        },
      },
    };

    const res = extractJobPresentation(job);
    expect(res.brandTokens.typography.fontFamily).toBe('Roboto, sans-serif');
    expect(res.brandTokens.typography.fontSize).toBe(32);
    expect(res.brandTokens.typography.fontWeight).toBe('900');
    expect(res.brandTokens.typography.textTransform).toBe('uppercase');
    expect(res.brandTokens.colors.primary).toBe('#ffdd00');
    expect(res.brandTokens.colors.accent).toBe('#ff0055');
    expect(res.brandTokens.colors.background).toBe('rgba(0,0,0,0.7)'); // Preserves default
    expect(res.brandTokens.geometry.aspectRatio).toBe('16:9');
    expect(res.aspectRatio).toBe('16:9');
  });

  it('safely parses stringified brand_tokens on job record', () => {
    const job = {
      id: 'stringified-tokens-job',
      brand_tokens: JSON.stringify({
        colors: {
          primary: '#10b981',
          accent: '#06b6d4',
        },
        typography: {
          fontFamily: 'JetBrains Mono',
          fontSize: 20,
        },
      }),
      aspect_ratio: '1:1',
    };

    const res = extractJobPresentation(job);
    expect(res.brandTokens.colors.primary).toBe('#10b981');
    expect(res.brandTokens.colors.accent).toBe('#06b6d4');
    expect(res.brandTokens.typography.fontFamily).toBe('JetBrains Mono');
    expect(res.brandTokens.typography.fontSize).toBe(20);
    expect(res.brandTokens.geometry.aspectRatio).toBe('1:1');
    expect(res.aspectRatio).toBe('1:1');
  });

  it('resolves fallback covers for newly exposed studio workflows', () => {
    expect(getWorkflowFallbackCover('podcast')).toBe('/images/workflows/avatar_cover.jpg');
    expect(getWorkflowFallbackCover('code-video')).toBe('/images/workflows/whiteboard_cover.jpg');
    expect(getWorkflowFallbackCover('stick-figure')).toBe('/images/workflows/whiteboard_cover.jpg');
    expect(getWorkflowFallbackCover('reddit')).toBe('/images/workflows/shorts_cover.jpg');
    expect(getWorkflowFallbackCover('trivia')).toBe('/images/workflows/shorts_cover.jpg');
    expect(getWorkflowFallbackCover('previs')).toBe('/images/workflows/drama_cover.jpg');
    expect(getWorkflowFallbackCover('scriptbreak')).toBe('/images/workflows/drama_cover.jpg');
    expect(getWorkflowFallbackCover('yaml')).toBe('/images/workflows/bulk_cover.jpg');
  });
});
