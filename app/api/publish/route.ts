import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { YouTubePublisher } from '@/lib/publishing/youtube';
import { TikTokPublisher } from '@/lib/publishing/tiktok';
import { InstagramPublisher } from '@/lib/publishing/instagram';

export async function POST(req: Request) {
  try {
    const { jobId, platforms, title, description } = await req.json();

    if (!jobId || !platforms || platforms.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Fetch the job to get the video URL
    const { data: job, error } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    // In a real app, this would be the S3/GCS URL of the final rendered video.
    // For now we mock it as the first sourced clip url just to test the API flow.
    let videoUrl = "https://example.com/rendered-video.mp4";
    try {
      const logs = typeof job.logs === 'string' ? JSON.parse(job.logs) : job.logs;
      const firstClip = logs?.videos?.[0]?.video || logs?.videos?.[0];
      if (firstClip?.url) videoUrl = firstClip.url;
    } catch {}

    // 2. Publish to selected platforms
    const results = [];
    
    // Using the modules built by the teamwork agents
    if (platforms.includes('youtube')) {
      const yt = new YouTubePublisher();
      results.push(await yt.publishVideo(videoUrl, { title, description }));
    }
    
    if (platforms.includes('tiktok')) {
      const tk = new TikTokPublisher();
      results.push(await tk.publishVideo(videoUrl, { title, description }));
    }
    
    if (platforms.includes('instagram')) {
      const ig = new InstagramPublisher();
      results.push(await ig.publishVideo(videoUrl, { title, description }));
    }

    // Update job in Supabase to mark it as published
    await supabase
      .from('render_jobs')
      .update({ 
        published: true, 
        published_platforms: platforms 
      })
      .eq('id', jobId);

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Publish error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
