/**
 * WORKFLOW ROUTE — cinema
 *   KIND:          queue / cinema-director
 *   UI CALLER:     /create/cinema
 *   WRITES QUEUE:  yes
 *   CLAIMABLE:     no (planning-only until beats/media resolved)
 */

import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/db";
import {
  compileCinematicPrompt,
  CinemaShotConfig,
} from "@/lib/engine/cinema-director";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as CinemaShotConfig & {
      previewOnly?: boolean;
      duration?: number;
    };

    const { subject, previewOnly, duration = 4 } = body;

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return NextResponse.json(
        { success: false, error: "Subject is required for cinematic shot direction." },
        { status: 400 }
      );
    }

    // Compile director prompt with optical physics & camera choreography
    const compiled = compileCinematicPrompt(body);

    if (previewOnly) {
      return NextResponse.json({
        success: true,
        previewOnly: true,
        compiled,
      });
    }

    // Create job with orchestration_state: 'planning' per claim safety rule
    const jobId = crypto.randomUUID();
    const beatDuration = Math.max(1, duration);

    const initialBeats = [
      {
        id: `beat_${jobId.slice(0, 8)}_1`,
        text: subject.trim(),
        duration: beatDuration,
        imagePrompt: compiled.prompt,
        cameraMove: compiled.cameraDirective,
        shotType: compiled.parameters.focalLength,
        opticalDescriptor: compiled.opticalDescriptor,
        lighting: compiled.lightingDescriptor,
        colorGrade: compiled.colorGradeDescriptor,
        referenceTags: compiled.referenceTags,
      }
    ];

    const { error: dbError } = await supabase.from('render_jobs').insert({
      id: jobId,
      status: 'queued',
      orchestration_state: 'planning', // Prevents render worker empty concat claim
      progress: 0,
      aspect_ratio: compiled.parameters.aspectRatio === '9:16' ? '9:16' : '16:9',
      logs: JSON.stringify({
        workflow: 'cinema',
        subject: subject.trim(),
        compiled,
        beats: initialBeats,
      }),
    });

    if (dbError) {
      console.error('[cinema-workflow] Failed to insert render_job:', dbError);
    }

    return NextResponse.json({
      success: true,
      jobId,
      status: 'queued',
      orchestration_state: 'planning',
      compiled,
      beats: initialBeats,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cinema workflow execution failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
