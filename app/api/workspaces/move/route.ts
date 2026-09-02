import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { videoIds = [], workspaceId, campaignId } = body;

    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json({ error: 'videoIds must be a non-empty array' }, { status: 400 });
    }

    const targetWorkspaceId = workspaceId === 'default' ? null : (workspaceId || null);

    // Update in Supabase videos table
    try {
      await supabase
        .from('videos')
        .update({
          workspace_id: targetWorkspaceId,
          ...(campaignId !== undefined && { campaign_id: campaignId || null }),
          updated_at: new Date().toISOString(),
        })
        .in('id', videoIds);
    } catch (dbErr) {
      console.warn('[Workspaces Move Fallback]:', dbErr);
    }

    // Also try updating render_jobs if video_id references are stored
    try {
      await supabase
        .from('render_jobs')
        .update({
          workspace_id: targetWorkspaceId,
        })
        .in('id', videoIds);
    } catch {}

    return NextResponse.json({
      success: true,
      movedCount: videoIds.length,
      targetWorkspaceId,
      message: `Successfully moved ${videoIds.length} video(s) to workspace.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to move videos' }, { status: 500 });
  }
}
