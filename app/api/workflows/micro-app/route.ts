/**
 * WORKFLOW ROUTE — micro-app
 *   KIND:          queue / video-micro-apps
 *   UI CALLER:     /create/micro-app, fast agent tools
 *   WRITES QUEUE:  yes
 *   CLAIMABLE:     no (planning-only until assets/beats resolved)
 */

import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/db";
import {
  VIDEO_MICRO_APPS,
  compileMicroAppPrompt
} from "@/lib/engine/video-micro-apps";

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    apps: Object.values(VIDEO_MICRO_APPS)
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      appId,
      values = {},
      inputAssetIds = {},
      previewOnly = false
    } = body;

    if (!appId || typeof appId !== 'string' || !VIDEO_MICRO_APPS[appId]) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid or missing appId. Must be one of: ${Object.keys(VIDEO_MICRO_APPS).join(', ')}`
        },
        { status: 400 }
      );
    }

    // Compile micro-app execution prompt
    const compiled = compileMicroAppPrompt(appId, values, inputAssetIds);

    if (previewOnly) {
      return NextResponse.json({
        success: true,
        previewOnly: true,
        compiled
      });
    }

    const jobId = crypto.randomUUID();
    const duration = Math.max(1, compiled.durationSeconds || 4);

    const initialBeats = [
      {
        id: `beat_${jobId.slice(0, 8)}_1`,
        text: compiled.appName,
        duration,
        imagePrompt: compiled.prompt,
        aspectRatio: compiled.aspectRatio,
        modelId: compiled.modelId,
        inputAssignments: compiled.inputAssignments
      }
    ];

    const { error: dbError } = await supabase.from('render_jobs').insert({
      id: jobId,
      status: 'queued',
      orchestration_state: 'planning', // Claim safety: planning-only until assets resolved
      progress: 0,
      aspect_ratio: compiled.aspectRatio === '9:16' ? '9:16' : (compiled.aspectRatio === '1:1' ? '1:1' : '16:9'),
      logs: JSON.stringify({
        workflow: 'micro-app',
        appId: compiled.appId,
        compiled,
        beats: initialBeats
      })
    });

    if (dbError) {
      console.error('[micro-app-workflow] Failed to insert render_job:', dbError);
    }

    return NextResponse.json({
      success: true,
      jobId,
      status: 'queued',
      orchestration_state: 'planning',
      compiled,
      beats: initialBeats
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Micro-app execution failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
