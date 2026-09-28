import { NextResponse } from "next/server";
import { pushBulkPlanToQueue } from "@/lib/engine/bulk-plan-pusher";
import { BulkPlanItem } from "@/lib/engine/types";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { items, planTitle } = body as { items: BulkPlanItem[], planTitle: string };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Empty plan provided", success: false }, { status: 400 });
    }

    const result = await pushBulkPlanToQueue(items, planTitle || "Bulk Plan");

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to push plan to queue", success: false }, { status: 500 });
    }

    return NextResponse.json({ success: true, jobIds: result.jobIds });
  } catch (error) {
    console.error("Push Bulk Plan failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error", success: false }, { status: 500 });
  }
}
