import { NextResponse } from "next/server";
import { bulkPlanner } from "@/lib/engine/bulk-planner";
import { AspectRatio } from "@/lib/engine/types";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { niche, contentCount, cadence, visualStyle, voice, platforms, aspectRatio, mock } = body;

    if (!niche || typeof niche !== "string" || !niche.trim()) {
      return NextResponse.json({ error: "Niche is required", success: false }, { status: 400 });
    }

    const inputNiche = niche.trim();
    const inputCount = contentCount ? Number(contentCount) : 7;

    console.log(`Processing Bulk Plan workflow for niche: "${inputNiche}"...`);

    const result = await bulkPlanner.generatePlan({
      niche: inputNiche,
      contentCount: inputCount,
      cadence: cadence || "daily",
      visualStyle: visualStyle || "modern, clean aesthetic, 4k",
      voice: voice || "alloy",
      platforms: Array.isArray(platforms) && platforms.length > 0 ? platforms : ["tiktok", "youtube", "instagram"],
      aspectRatio: (aspectRatio as AspectRatio) || "9:16",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to generate bulk plan", success: false }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan: result });
  } catch (error: any) {
    console.error("Bulk Plan workflow failed:", error);
    return NextResponse.json({ error: error?.message || "Internal server error", success: false }, { status: 500 });
  }
}
