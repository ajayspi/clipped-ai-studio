/**
 * WORKFLOW ROUTE — benchmark
 *   KIND:          suite / benchmark-compiler
 *   UI CALLER:     /create or API test harness
 *   WRITES QUEUE:  optional (returns full compiled timeline & scorecard)
 */

import { NextResponse } from 'next/server';
import {
  CANONICAL_BENCHMARKS,
  compileBenchmarkVideo,
  type BenchmarkTweaks
} from '@/lib/engine/video-benchmark-suite';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    benchmarks: Object.values(CANONICAL_BENCHMARKS)
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const benchmarkId = body.benchmarkId || 'vox-explainer';

    if (!['vox-explainer', 'fireship-tech', 'viral-narrative'].includes(benchmarkId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid benchmarkId. Must be one of: vox-explainer, fireship-tech, viral-narrative`
        },
        { status: 400 }
      );
    }

    const tweaks: BenchmarkTweaks = {
      pacingScale: typeof body.pacingScale === 'number' ? body.pacingScale : 1.0,
      foleyGain: typeof body.foleyGain === 'number' ? body.foleyGain : 1.0,
      shaderIntensity: typeof body.shaderIntensity === 'number' ? body.shaderIntensity : 0.8,
      layoutSplit: body.layoutSplit,
      customTopic: typeof body.topic === 'string' ? body.topic : undefined
    };

    const compiled = compileBenchmarkVideo(benchmarkId, tweaks);

    return NextResponse.json({
      success: true,
      benchmark: compiled.benchmarkId,
      topic: compiled.topic,
      scorecard: compiled.scorecard,
      timelineManifest: compiled.timelineManifest,
      treatment: compiled.treatment,
      otioTimelineSnippet: compiled.otioTimelineJson.slice(0, 500) + '...'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
