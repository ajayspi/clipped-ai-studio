import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/db";
import { dramaOrchestrator } from "@/lib/engine/drama-orchestrator";
import { AspectRatio, DramaCharacter } from "@/lib/engine/types";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      script,
      genre,
      characters,
      episodesCount,
      aspectRatio,
      visualStyle,
    } = body;

    // 1. Validation: Genre is required
    if (!genre || typeof genre !== 'string' || !genre.trim()) {
      return NextResponse.json(
        { error: "Genre is required", success: false },
        { status: 400 }
      );
    }

    // Default characters if not provided or empty
    const normalizedCharacters: DramaCharacter[] = (Array.isArray(characters) && characters.length > 0)
      ? characters
      : [
          {
            name: "Protagonist",
            description: `Lead character in ${genre} series`,
            visualAnchor: `sharp features, intense gaze, ${genre} attire`,
          },
        ];

    // 2. Generate unique Job ID
    const jobId = crypto.randomUUID();

    // 2. Synchronous Supabase render_jobs insert
    // Using 'processing' instead of 'pending' so the separate Remotion render-worker ignores it.
    try {
      await supabase.from('render_jobs').insert({
        id: jobId,
        status: 'processing',
        progress: 0,
        logs: JSON.stringify({
          workflow: 'micro-drama',
          input: {
            genre,
            script: script || '',
            characters: normalizedCharacters,
            episodesCount: episodesCount || 3,
            aspectRatio: aspectRatio || '9:16',
            visualStyle: visualStyle || '',
          },
        }),
        started_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn(`[Supabase] Initial pending job insert logged with warning:`, dbErr);
    }

    // 4. Fire background execution task
    setTimeout(async () => {
      try {
        console.log(`[JOB ${jobId}] Processing Micro-Drama workflow for genre: ${genre}...`);

        const result = await dramaOrchestrator.generateDramaSeries({
          script,
          genre,
          characters: normalizedCharacters,
          episodesCount: episodesCount ? Number(episodesCount) : 3,
          aspectRatio: aspectRatio as AspectRatio,
          visualStyle,
        });

        await supabase.from('render_jobs').update({
          status: result.success ? 'completed' : 'failed',
          progress: result.success ? 100 : 0,
          logs: JSON.stringify({
            workflow: 'micro-drama',
            result,
          }),
          completed_at: new Date().toISOString(),
          error_message: result.error || null,
        }).eq('id', jobId);

        console.log(`[JOB ${jobId}] Completed Micro-Drama workflow with status: ${result.success ? 'completed' : 'failed'}`);
      } catch (err: any) {
        console.error(`[JOB ${jobId}] Micro-Drama workflow failed:`, err);
        try {
          await supabase.from('render_jobs').update({
            status: 'failed',
            progress: 0,
            error_message: err?.message || 'Unknown error occurred during micro-drama generation',
            completed_at: new Date().toISOString(),
          }).eq('id', jobId);
        } catch (updateErr) {
          console.error(`[JOB ${jobId}] Failed to update error status in DB:`, updateErr);
        }
      }
    }, 0);

    // 5. Return immediate 200 response with jobId
    return NextResponse.json({
      success: true,
      jobId,
      message: "Micro-Drama generation started",
    });
  } catch (error: any) {
    console.error("Workflow trigger error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger workflow", success: false },
      { status: 500 }
    );
  }
}
