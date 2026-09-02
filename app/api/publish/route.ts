import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { SocialPublisherManager, PublishRequest } from '@/lib/publishing';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      jobId,
      videoId,
      platforms = [],
      title = 'My Awesome AI Video',
      description = 'Generated using Clipped AI #shorts #ai',
      isOneClick = false,
      privacy = 'public',
      scheduledAt,
      isDryRun = true,
    } = body;

    const targetPlatforms: string[] = Array.isArray(platforms) && platforms.length > 0
      ? platforms
      : (isOneClick ? ['youtube', 'tiktok', 'instagram'] : []);

    if (!jobId && !videoId) {
      return NextResponse.json({ error: 'Missing jobId or videoId parameter' }, { status: 400 });
    }

    if (targetPlatforms.length === 0) {
      return NextResponse.json({ error: 'Please select at least one platform to publish' }, { status: 400 });
    }

    // 1. Fetch the job or video to get video URL and details
    let videoUrl = 'https://example.com/rendered-video.mp4';
    let videoTitle = title;
    let actualVideoId = videoId;
    let actualJobId = jobId;

    if (jobId) {
      const { data: job } = await supabase
        .from('render_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (job) {
        actualVideoId = actualVideoId || job.video_id;
        try {
          const logs = typeof job.logs === 'string' ? JSON.parse(job.logs) : job.logs;
          if (logs?.finalVideoUrl) videoUrl = logs.finalVideoUrl;
          else if (logs?.videos?.[0]?.video?.url) videoUrl = logs.videos[0].video.url;
          else if (logs?.videos?.[0]?.url) videoUrl = logs.videos[0].url;

          if (!title || title === 'My Awesome AI Video') {
            if (logs?.subject) videoTitle = logs.subject;
          }
        } catch {}
      }
    }

    const publisherManager = new SocialPublisherManager();
    const results: Record<string, any> = {};

    for (const platform of targetPlatforms) {
      try {
        const publishReq: PublishRequest = {
          platform: platform as any,
          videoId: actualVideoId,
          videoUrl,
          title: videoTitle,
          description,
          caption: description,
          privacy: privacy as any,
          scheduledAt,
          isDryRun: isDryRun !== false,
        };

        const res = await publisherManager.publish(publishReq);

        // Ensure shorts / reels format for display
        let liveUrl = res.publishedUrl;
        if (platform === 'youtube' && !liveUrl.includes('/shorts/')) {
          const vid = res.platformVideoId || `mock_yt_${Date.now()}`;
          liveUrl = `https://youtube.com/shorts/${vid}`;
        } else if (platform === 'tiktok' && !liveUrl.includes('/video/')) {
          const vid = res.platformVideoId || `mock_tt_${Date.now()}`;
          liveUrl = `https://tiktok.com/@creator/video/${vid}`;
        } else if (platform === 'instagram' && !liveUrl.includes('/reel/')) {
          const vid = res.platformVideoId || `mock_ig_${Date.now()}`;
          liveUrl = `https://instagram.com/reel/${vid}/`;
        }

        results[platform] = {
          ...res,
          publishedUrl: liveUrl,
        };
      } catch (err: any) {
        results[platform] = {
          success: false,
          platform,
          error: err.message,
          status: 'failed',
        };
      }
    }

    // 3. Update Supabase render_jobs / published_videos
    if (jobId) {
      try {
        await supabase
          .from('render_jobs')
          .update({
            published: true,
            published_platforms: targetPlatforms,
          })
          .eq('id', jobId);
      } catch (dbErr) {
        console.warn('[Publish API] Failed to update render_jobs in Supabase:', dbErr);
      }
    }

    const successfulCount = Object.values(results).filter((r: any) => r.success).length;

    return NextResponse.json({
      success: successfulCount > 0,
      totalPlatforms: targetPlatforms.length,
      successfulPlatforms: successfulCount,
      results,
      publishedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Publish API Error]:', error);
    return NextResponse.json({ error: error.message || 'Publishing failed' }, { status: 500 });
  }
}
