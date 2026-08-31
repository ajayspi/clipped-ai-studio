import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { bulkPlanner } from "@/lib/engine/bulk-planner";
import { AspectRatio } from "@/lib/engine/types";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      niche,
      contentCount,
      cadence,
      visualStyle,
      voice,
      platforms,
      aspectRatio,
      mock,
    } = body;

    if (!niche || typeof niche !== 'string' || !niche.trim()) {
      return NextResponse.json(
        { error: "Niche is required", success: false },
        { status: 400 }
      );
    }

    const inputNiche = niche.trim();
    const inputCount = contentCount ? Number(contentCount) : 7;

    // 1. Generate unique Job ID
    const jobId = crypto.randomUUID();

    // 2. Synchronous Supabase render_jobs pending insert
    try {
      await supabase.from('render_jobs').insert({
        id: jobId,
        status: 'pending',
        progress: 0,
        logs: JSON.stringify({
          workflow: 'bulk-plan',
          input: {
            niche: inputNiche,
            contentCount: inputCount,
            cadence: cadence || 'daily',
            visualStyle: visualStyle || 'modern',
            voice: voice || 'alloy',
            platforms: Array.isArray(platforms) ? platforms : ['tiktok', 'youtube', 'instagram'],
            aspectRatio: aspectRatio || '9:16',
            mock: Boolean(mock),
          },
        }),
        started_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn(`[Supabase] Initial pending bulk-plan job insert warning:`, dbErr);
    }

    // 3. Fire background execution task
    setTimeout(async () => {
      try {
        console.log(`[JOB ${jobId}] Processing Bulk Plan workflow for niche: "${inputNiche}"...`);

        const result = await bulkPlanner.generatePlan({
          niche: inputNiche,
          contentCount: inputCount,
          cadence: cadence || 'daily',
          visualStyle: visualStyle || 'modern, clean aesthetic, 4k',
          voice: voice || 'alloy',
          platforms: Array.isArray(platforms) && platforms.length > 0 ? platforms : ['tiktok', 'youtube', 'instagram'],
          aspectRatio: (aspectRatio as AspectRatio) || '9:16',
        });

        await supabase.from('render_jobs').update({
          status: result.success ? 'completed' : 'failed',
          progress: result.success ? 100 : 0,
          logs: JSON.stringify({
            workflow: 'bulk-plan',
            result,
          }),
          completed_at: new Date().toISOString(),
          error_message: result.error || null,
        }).eq('id', jobId);

        console.log(`[JOB ${jobId}] Completed Bulk Plan workflow with status: ${result.success ? 'completed' : 'failed'}`);
      } catch (err: any) {
        console.error(`[JOB ${jobId}] Bulk Plan workflow failed:`, err);
        try {
          await supabase.from('render_jobs').update({
            status: 'failed',
            progress: 0,
            error_message: err?.message || 'Unknown error occurred during bulk planning',
            completed_at: new Date().toISOString(),
          }).eq('id', jobId);
        } catch (updateErr) {
          console.error(`[JOB ${jobId}] Failed to update error status in DB:`, updateErr);
        }
      }
    }, 0);

    // 4. Return immediate 200 response with jobId
    return NextResponse.json({
      success: true,
      jobId,
      message: "Bulk plan generation started",
    });
  } catch (error: any) {
    console.error("Bulk Plan workflow trigger error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger bulk plan workflow", success: false },
      { status: 500 }
    );
  }
}
