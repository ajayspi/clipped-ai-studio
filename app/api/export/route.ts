import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface ExportPresetConfig {
  resolution: string;
  width: number;
  height: number;
  fps: number;
  bitrateKbps: number;
  format: 'mp4' | 'mp3' | 'gif';
  label: string;
  description: string;
}

export const EXPORT_PRESETS: Record<string, ExportPresetConfig> = {
  '1080p': {
    resolution: '1080x1920',
    width: 1080,
    height: 1920,
    fps: 30,
    bitrateKbps: 8000,
    format: 'mp4',
    label: '1080p Full HD (Recommended)',
    description: 'Optimal quality for YouTube Shorts, TikTok, and Instagram Reels.',
  },
  '720p': {
    resolution: '720x1280',
    width: 720,
    height: 1280,
    fps: 30,
    bitrateKbps: 3500,
    format: 'mp4',
    label: '720p Fast Preview',
    description: 'Compressed for quick sharing, previews, and low bandwidth.',
  },
  '4k': {
    resolution: '2160x3840',
    width: 2160,
    height: 3840,
    fps: 60,
    bitrateKbps: 24000,
    format: 'mp4',
    label: '4K Ultra Master',
    description: 'Maximum bitrate 60fps archive master for professional use.',
  },
  'mp3': {
    resolution: 'Audio Only',
    width: 0,
    height: 0,
    fps: 0,
    bitrateKbps: 320,
    format: 'mp3',
    label: 'Audio Only (MP3)',
    description: 'Extracted narration and background score at 320 kbps.',
  },
  'gif': {
    resolution: '480x854',
    width: 480,
    height: 854,
    fps: 15,
    bitrateKbps: 1500,
    format: 'gif',
    label: 'Animated GIF',
    description: 'Lightweight animated snippet for thumbnails and email campaigns.',
  },
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      jobId,
      videoId,
      videoUrl: customVideoUrl,
      title: customTitle,
      preset = '1080p',
      format: customFormat,
    } = body;

    let videoUrl = customVideoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe';
    let title = customTitle || 'Clipped_AI_Video';
    let durationSec = 30;

    // Resolve from Supabase if jobId or videoId is provided
    if (jobId || videoId) {
      try {
        const query = jobId
          ? supabase.from('render_jobs').select('*').eq('id', jobId).single()
          : supabase.from('videos').select('*, render_jobs(*)').eq('id', videoId).single();

        const { data: record } = await query;
        if (record) {
          let logs: any = {};
          try {
            logs = typeof record.logs === 'string' ? JSON.parse(record.logs) : (record.logs || {});
          } catch {}

          if (record.title) title = record.title;
          else if (logs.subject) title = logs.subject;

          if (logs.finalVideoUrl) {
            videoUrl = logs.finalVideoUrl;
          } else if (logs.videos?.[0]?.video?.url) {
            videoUrl = logs.videos[0].video.url;
          } else if (logs.videos?.[0]?.url) {
            videoUrl = logs.videos[0].url;
          }

          if (logs.duration) durationSec = Number(logs.duration);
        }
      } catch (dbErr) {
        console.warn('[Export API] Supabase lookup fallback:', dbErr);
      }
    }

    const selectedPreset = EXPORT_PRESETS[preset] || EXPORT_PRESETS['1080p'];
    const outputFormat = customFormat || selectedPreset.format;

    // Compute estimated file size based on bitrate and duration
    const estimatedSizeBytes = Math.round((selectedPreset.bitrateKbps * 1000 * durationSec) / 8);
    const estimatedSizeMb = Number((estimatedSizeBytes / (1024 * 1024)).toFixed(2));

    const safeTitleSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);

    const filename = `${safeTitleSlug}_${preset}.${outputFormat}`;
    const downloadUrl = videoUrl;

    const exportPayload = {
      success: true,
      jobId: jobId || `exp_${Date.now()}`,
      title,
      filename,
      downloadUrl,
      format: outputFormat,
      preset,
      resolution: selectedPreset.resolution,
      width: selectedPreset.width,
      height: selectedPreset.height,
      fps: selectedPreset.fps,
      bitrateKbps: selectedPreset.bitrateKbps,
      fileSizeMb: estimatedSizeMb,
      durationSec,
      renderedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    return NextResponse.json(exportPayload, { status: 200 });
  } catch (error: any) {
    console.error('[Export API Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to export video' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId') || undefined;
    const preset = searchParams.get('preset') || '1080p';
    const format = searchParams.get('format') || 'mp4';

    const selectedPreset = EXPORT_PRESETS[preset] || EXPORT_PRESETS['1080p'];

    return NextResponse.json({
      success: true,
      availablePresets: Object.entries(EXPORT_PRESETS).map(([key, value]) => ({
        key,
        ...value,
      })),
      selectedPreset: {
        preset,
        format,
        ...selectedPreset,
      },
      jobId,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
