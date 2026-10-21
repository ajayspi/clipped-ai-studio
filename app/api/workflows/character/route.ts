import { NextResponse } from "next/server";
import { enqueueRenderJob } from "@/lib/jobs/enqueue";
import { videoOrchestrator } from "@/lib/engine/orchestrator";
import { supabaseAdmin as supabase } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { script, aspectRatio, characterUrl } = body;

    if (!script || !characterUrl) {
      return NextResponse.json({ error: "Script and Character URL are required" }, { status: 400 });
    }

    const { data, error: insertError } = await supabase
      .from("render_jobs")
      .insert({
        id: crypto.randomUUID(),
        user_id: "00000000-0000-0000-0000-000000000000",
        workspace_id: null,
        orchestration_state: "planning",
        status: "pending",
        logs: { script, aspectRatio, characterSheetUrl: characterUrl, workflowType: "character" },
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !data) {
      throw insertError || new Error("Insert failed");
    }

    const jobId = data.id;

    setTimeout(async () => {
      try {
        const result = await videoOrchestrator.generateVideoPlan(script, ["pixabay", "pexels"]);
        await enqueueRenderJob({
          id: jobId,
          intent: "render",
          status: "generating_plan",
          logs: { ...data.logs, analysis: result.analysis || result },
          client: supabase,
        });
      } catch (err) {
        console.error(`[CharacterWorkflow] Background planning failed for ${jobId}:`, err);
        await supabase.from("render_jobs").update({ status: "failed" }).eq("id", jobId);
      }
    }, 0);

    return NextResponse.json({ success: true, jobId });
  } catch (error) {
    console.error("[CharacterWorkflow] Route error:", error);
    return NextResponse.json(
      { error: "Failed to initialize Character workflow" },
      { status: 500 }
    );
  }
}