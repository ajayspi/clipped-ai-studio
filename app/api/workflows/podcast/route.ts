import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/db";
import { podcastOrchestrator } from "@/lib/engine/podcast-orchestrator";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { videoUrl } = body;

    if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.trim()) {
      return NextResponse.json(
        { error: "videoUrl is required", success: false },
        { status: 400 }
      );
    }

    const jobId = crypto.randomUUID();

    try {
      await supabase.from('render_jobs').insert({
        id: jobId,
        status: 'processing',
        orchestration_state: 'planning',
        progress: 0,
        logs: JSON.stringify({
          workflow: 'podcast',
          input: { videoUrl }
        }),
        started_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn(`[Supabase] Initial pending podcast job insert warning:`, dbErr);
    }

    setTimeout(async () => {
      await podcastOrchestrator.generatePodcastVideo(jobId, videoUrl.trim());
    }, 0);

    return NextResponse.json({
      success: true,
      jobId,
      message: "Podcast workflow started",
    });
  } catch (error) {
    console.error("Podcast workflow trigger error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to trigger podcast workflow", success: false },
      { status: 500 }
    );
  }
}
