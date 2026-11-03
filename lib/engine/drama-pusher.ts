/**
 * Micro-Drama Series Batch Pusher Engine
 * 
 * Orchestrates 1:N episodic child job creation. Maps multi-character dialogue
 * turns onto distinct RenderBeat objects with voice bindings, sets voiceProvider: 'keyless',
 * leaves root logs.voice undefined for per-beat resolution, and calls enqueueRenderJob.
 */

import { enqueueRenderJob } from '@/lib/jobs/enqueue';
import { supabaseAdmin as supabase } from '@/lib/db';
import { resolveVoiceForCharacter } from './voice-mapper';
import {
  DramaCharacter,
  DramaSeriesResponse,
  ShotType,
  CameraMove,
} from './types';

export interface DramaBeat {
  text: string;
  speaker?: string;
  voice: string;
  imagePrompt: string;
  duration: number;
  shotType?: ShotType;
  cameraMove?: CameraMove;
  visualPrompt?: string;
  emotion?: string;
}

/**
 * Dispatches N independent child render_jobs records for an approved micro-drama series.
 */
export async function pushDramaSeriesToQueue(
  seriesId: string,
  seriesPlan: DramaSeriesResponse,
  characters?: DramaCharacter[],
  workspaceId?: string | null
): Promise<string[]> {
  const childJobIds: string[] = [];
  const chars = characters || (seriesPlan.characters as unknown as DramaCharacter[]) || [];
  const charVoiceMap = new Map<string, string>();

  // Map characters to their neural voices
  chars.forEach((c) => {
    if (c.name) {
      charVoiceMap.set(c.name.toLowerCase(), resolveVoiceForCharacter(c.voice));
    }
  });

  const defaultVoice = resolveVoiceForCharacter(chars[0]?.voice || 'onyx');
  const episodes = seriesPlan.episodes || [];

  for (const episode of episodes) {
    const childJobId = crypto.randomUUID();
    childJobIds.push(childJobId);

    // Map episode scenes to beats
    const beats: DramaBeat[] = (episode.scenes || []).map((scene, idx) => {
      const speakerName = (scene.speaker || '').trim();
      const speakerVoice = (speakerName && charVoiceMap.get(speakerName.toLowerCase())) || defaultVoice;
      const text = scene.dialogue || scene.text || `Scene ${idx + 1}`;
      const imagePrompt = scene.visualPrompt || scene.imagePrompt || scene.description || text;
      const shotType = (scene.shotType as ShotType) || 'medium';
      const cameraMove = (scene.cameraMove as CameraMove) || 'push-in';
      const duration = Math.max(2, Math.min(12, Number(scene.duration) || 5));

      return {
        text,
        speaker: speakerName || undefined,
        voice: speakerVoice,
        imagePrompt,
        visualPrompt: imagePrompt,
        duration,
        shotType,
        cameraMove,
        emotion: scene.emotion,
      };
    });

    // Ensure at least one beat exists
    if (beats.length === 0) {
      beats.push({
        text: episode.script || `${episode.title || 'Episode ' + episode.episodeNumber} begins.`,
        voice: defaultVoice,
        imagePrompt: `Cinematic scene from ${seriesPlan.dramaTitle || 'drama'}, 8k, dramatic lighting`,
        duration: 5,
        shotType: 'medium',
        cameraMove: 'push-in',
      });
    }

    const episodeTitle = `${seriesPlan.dramaTitle || 'Micro-Drama'} - ${episode.title || `Episode ${episode.episodeNumber}`}`;
    const aspectRatio = (seriesPlan.metadata?.aspectRatio as string) || '9:16';
    const characterSheetUrl = seriesPlan.characters?.[0]?.avatarUrl || null;

    // Build child job logs
    // CRITICAL WORKER CONTRACT: Root logs.voice MUST BE UNDEFINED so worker resolves b.voice per beat!
    const childLogs: Record<string, unknown> = {
      workflow: 'micro-drama',
      workflowType: 'micro-drama',
      title: episodeTitle,
      subject: episodeTitle,
      aspectRatio,
      beats,
      voiceProvider: 'keyless',
      parentSeriesId: seriesId,
      episodeNumber: episode.episodeNumber,
      cliffhanger: episode.cliffhanger || null,
      characterSheetUrl,
      characters: chars.map((c) => ({
        name: c.name,
        visualAnchor: c.visualAnchor,
        avatarUrl: c.avatarUrl,
      })),
      workspace_id: workspaceId || null,
    };

    // 1. Create entry in videos table
    try {
      await supabase.from('videos').insert({
        id: childJobId,
        title: episodeTitle,
        aspect_ratio: aspectRatio,
        status: 'rendering',
        workflow_type: 'micro-drama',
        workspace_id: workspaceId || null,
        created_at: new Date().toISOString(),
      });
    } catch (vErr) {
      console.warn(`[DramaPusher] videos table insert notice:`, vErr);
    }

    // 2. Enqueue the render job with intent: 'render' -> orchestration_state: 'qc_pending'
    const enqueueRes = await enqueueRenderJob({
      id: childJobId,
      status: 'queued',
      intent: 'render',
      progress: 0,
      logs: childLogs,
    });

    if (!enqueueRes.ok) {
      console.error(`[DramaPusher] Failed to enqueue child job ${childJobId}:`, enqueueRes.error);
    }
  }

  // Update parent series record with list of child job IDs
  try {
    const { data: parentJob } = await supabase
      .from('render_jobs')
      .select('logs')
      .eq('id', seriesId)
      .maybeSingle();

    if (parentJob) {
      let existingLogs: Record<string, unknown> = {};
      try {
        existingLogs = typeof parentJob.logs === 'string' ? JSON.parse(parentJob.logs) : (parentJob.logs || {});
      } catch {}

      existingLogs.episodeJobIds = childJobIds;
      await supabase
        .from('render_jobs')
        .update({
          logs: JSON.stringify(existingLogs),
          updated_at: new Date().toISOString(),
        })
        .eq('id', seriesId);
    }
  } catch (updateErr) {
    console.warn(`[DramaPusher] Parent job logs update notice:`, updateErr);
  }

  return childJobIds;
}
