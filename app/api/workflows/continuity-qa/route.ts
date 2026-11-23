/**
 * WORKFLOW ROUTE — continuity-qa
 *   KIND:          vision quality assurance, 4-view character turnaround & dual-frame conditioning
 *   UI CALLER:     /create/drama, /create/ai-videos, or API pipeline
 *   WRITES QUEUE:  optional
 */

import { NextResponse } from 'next/server';
import {
  buildCharacterTurnaroundPrompts,
  pairShotKeyframes,
  checkShotContinuity,
  checkVisualQuality,
  buildContinuousNarrationConductor,
  buildSplitSubtitleSpecs,
  buildSeedVR2Command,
} from '@/lib/engine/continuity-director';
import { DramaCharacter, Scene, SeedVR2UpscaleConfig } from '@/lib/engine/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    capabilities: [
      'turnaround',
      'pair_keyframes',
      'check_continuity',
      'check_quality',
      'continuous_narration',
      'split_subtitles',
      'seedvr2_upscale',
    ],
    description: 'Advanced vision QA, 4-angle turnaround character consistency, and dual-frame keyframe conditioning.',
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'check_continuity';

    switch (action) {
      case 'turnaround': {
        const character: DramaCharacter = body.character;
        if (!character || !character.name) {
          return NextResponse.json(
            { success: false, error: 'Character with name is required for turnaround generation' },
            { status: 400 }
          );
        }
        const turnaround = buildCharacterTurnaroundPrompts(
          character,
          body.genre,
          body.style
        );
        return NextResponse.json({ success: true, action, turnaround });
      }

      case 'pair_keyframes': {
        const scenes: Scene[] = body.scenes || [];
        if (!Array.isArray(scenes) || scenes.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Scenes array is required for keyframe pairing' },
            { status: 400 }
          );
        }
        const keyframePairs = pairShotKeyframes(scenes, {
          defaultTransition: body.defaultTransition,
          characterAnchor: body.characterAnchor,
        });
        return NextResponse.json({ success: true, action, keyframePairs });
      }

      case 'check_continuity': {
        const result = await checkShotContinuity({
          lastFrameUrl: body.lastFrameUrl,
          nextFirstFrameUrl: body.nextFirstFrameUrl,
          characterAnchor: body.characterAnchor,
        });
        return NextResponse.json({ success: true, action, result });
      }

      case 'check_quality': {
        const result = await checkVisualQuality({
          frameUrl: body.frameUrl,
          referenceUrl: body.referenceUrl,
          prompt: body.prompt,
        });
        return NextResponse.json({ success: true, action, result });
      }

      case 'continuous_narration': {
        const script: string = body.script || '';
        const scenes: Scene[] = body.scenes || [];
        const track = buildContinuousNarrationConductor(
          script,
          scenes,
          body.words,
          body.audioUrl
        );
        return NextResponse.json({ success: true, action, track });
      }

      case 'split_subtitles': {
        const scenes: Scene[] = body.scenes || [];
        const specs = buildSplitSubtitleSpecs(scenes, {
          titleScale: body.titleScale,
          captionScale: body.captionScale,
          topY: body.topY,
          bottomY: body.bottomY,
        });
        return NextResponse.json({ success: true, action, specs });
      }

      case 'seedvr2_upscale': {
        const config: SeedVR2UpscaleConfig = body.config || {
          scale: 2,
          model: 'seedvr2-7b',
          format: '10bit-x265',
          colorTransfer: 'lab',
        };
        const inputPath = body.inputPath || 'input_video.mp4';
        const outputPath = body.outputPath || 'upscaled_video_4k.mp4';
        const command = buildSeedVR2Command(config, inputPath, outputPath);
        return NextResponse.json({ success: true, action, command });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported action "${action}". Must be one of: turnaround, pair_keyframes, check_continuity, check_quality, continuous_narration, split_subtitles, seedvr2_upscale`,
          },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
