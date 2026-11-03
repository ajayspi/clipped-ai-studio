/**
 * OpenTimelineIO (OTIO) & Final Cut Pro XML (FCPXML) Exporter
 * 
 * Bridges Clipped AI video timelines with professional NLEs:
 * - DaVinci Resolve (native OTIO import and FCPXML import)
 * - Adobe Premiere Pro (FCPXML import)
 * - Apple Final Cut Pro (FCPXML import)
 * - Owlie Studio (OTIO JSON timeline)
 */

export interface NLEBeat {
  id?: string;
  text?: string;
  duration?: number;
  videoUrl?: string;
  clipUrl?: string;
  imageUrl?: string;
  shotType?: string;
  cameraMove?: string;
}

export interface NLEExportOptions {
  timelineName: string;
  beats: NLEBeat[];
  audioUrl?: string;
  fps?: number;
  width?: number;
  height?: number;
}

/**
 * Exports timeline to OpenTimelineIO (OTIO) JSON schema 1.0
 */
export function exportToOtio(options: NLEExportOptions): string {
  const fps = options.fps || 30;
  const beats = options.beats || [];
  
  let currentStartFrame = 0;
  const videoClips: Record<string, unknown>[] = [];
  
  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    const durationSeconds = Math.max(0.1, beat.duration || 3);
    const durationFrames = Math.max(1, Math.round(durationSeconds * fps));
    const mediaUrl = beat.videoUrl || beat.clipUrl || beat.imageUrl || `media/clip_${i + 1}.mp4`;
    
    videoClips.push({
      OTIO_SCHEMA: "Clip.2",
      name: `Beat_${i + 1}_${(beat.text || 'scene').slice(0, 15).replace(/[^a-zA-Z0-9]/g, '_')}`,
      source_range: {
        OTIO_SCHEMA: "TimeRange.1",
        start_time: { OTIO_SCHEMA: "RationalTime.1", rate: fps, value: 0 },
        duration: { OTIO_SCHEMA: "RationalTime.1", rate: fps, value: durationFrames }
      },
      media_references: {
        DEFAULT_MEDIA: {
          OTIO_SCHEMA: "ExternalReference.1",
          target_url: mediaUrl,
          available_range: {
            OTIO_SCHEMA: "TimeRange.1",
            start_time: { OTIO_SCHEMA: "RationalTime.1", rate: fps, value: 0 },
            duration: { OTIO_SCHEMA: "RationalTime.1", rate: fps, value: durationFrames }
          }
        }
      },
      active_media_reference_key: "DEFAULT_MEDIA",
      metadata: {
        owlie_vibes: {
          camera_move: beat.cameraMove || "none",
          shot_type: beat.shotType || "medium",
          caption: beat.text || ""
        }
      }
    });

    currentStartFrame += durationFrames;
  }

  const tracks: Record<string, unknown>[] = [
    {
      OTIO_SCHEMA: "Track.1",
      name: "V1_Video",
      kind: "Video",
      children: videoClips
    }
  ];

  // Add Audio Track if voiceover/audio is present
  if (options.audioUrl) {
    tracks.push({
      OTIO_SCHEMA: "Track.1",
      name: "A1_Voiceover",
      kind: "Audio",
      children: [
        {
          OTIO_SCHEMA: "Clip.2",
          name: "Voiceover_Master",
          source_range: {
            OTIO_SCHEMA: "TimeRange.1",
            start_time: { OTIO_SCHEMA: "RationalTime.1", rate: fps, value: 0 },
            duration: { OTIO_SCHEMA: "RationalTime.1", rate: fps, value: currentStartFrame }
          },
          media_references: {
            DEFAULT_MEDIA: {
              OTIO_SCHEMA: "ExternalReference.1",
              target_url: options.audioUrl,
              available_range: {
                OTIO_SCHEMA: "TimeRange.1",
                start_time: { OTIO_SCHEMA: "RationalTime.1", rate: fps, value: 0 },
                duration: { OTIO_SCHEMA: "RationalTime.1", rate: fps, value: currentStartFrame }
              }
            }
          },
          active_media_reference_key: "DEFAULT_MEDIA"
        }
      ]
    });
  }

  const otioDoc = {
    OTIO_SCHEMA: "Timeline.1",
    name: options.timelineName || "Clipped_Timeline",
    global_start_time: {
      OTIO_SCHEMA: "RationalTime.1",
      rate: fps,
      value: 0
    },
    tracks: {
      OTIO_SCHEMA: "Stack.1",
      name: "Tracks",
      children: tracks
    },
    metadata: {
      clipped_ai: {
        total_duration_frames: currentStartFrame,
        total_duration_seconds: currentStartFrame / fps,
        width: options.width || 1080,
        height: options.height || 1920
      }
    }
  };

  return JSON.stringify(otioDoc, null, 2);
}

/**
 * Exports timeline to Final Cut Pro XML (FCPXML v1.10)
 * Supported by DaVinci Resolve, Adobe Premiere Pro, and Apple Final Cut Pro.
 */
export function exportToFcpxml(options: NLEExportOptions): string {
  const fps = options.fps || 30;
  const width = options.width || 1080;
  const height = options.height || 1920;
  const beats = options.beats || [];
  
  let totalDurationFrames = 0;
  for (const b of beats) {
    totalDurationFrames += Math.max(1, Math.round((b.duration || 3) * fps));
  }

  const frameDurationStr = `100/${fps * 100}s`;
  const totalDurationStr = `${totalDurationFrames * 100}/${fps * 100}s`;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<!DOCTYPE fcpxml>\n`;
  xml += `<fcpxml version="1.10">\n`;
  xml += `  <resources>\n`;
  xml += `    <format id="r1" name="FFVideoFormat${height}p${fps}" frameDuration="${frameDurationStr}" width="${width}" height="${height}"/>\n`;

  // Register Assets in resources
  beats.forEach((beat, i) => {
    const assetId = `r_asset_${i + 1}`;
    const mediaUrl = beat.videoUrl || beat.clipUrl || beat.imageUrl || `file:///media/clip_${i + 1}.mp4`;
    const durFrames = Math.max(1, Math.round((beat.duration || 3) * fps));
    xml += `    <asset id="${assetId}" name="Beat_${i + 1}" src="${escapeXml(mediaUrl)}" duration="${durFrames * 100}/${fps * 100}s" format="r1" hasVideo="1" hasAudio="0"/>\n`;
  });

  if (options.audioUrl) {
    xml += `    <asset id="r_audio_master" name="Voiceover" src="${escapeXml(options.audioUrl)}" duration="${totalDurationStr}" hasVideo="0" hasAudio="1"/>\n`;
  }

  xml += `  </resources>\n`;
  xml += `  <library>\n`;
  xml += `    <event name="Clipped AI Exports">\n`;
  xml += `      <project name="${escapeXml(options.timelineName || 'Clipped_Timeline')}">\n`;
  xml += `        <sequence format="r1" duration="${totalDurationStr}">\n`;
  xml += `          <spine>\n`;

  let currentOffset = 0;
  beats.forEach((beat, i) => {
    const assetId = `r_asset_${i + 1}`;
    const durFrames = Math.max(1, Math.round((beat.duration || 3) * fps));
    const offsetStr = `${currentOffset * 100}/${fps * 100}s`;
    const durStr = `${durFrames * 100}/${fps * 100}s`;

    xml += `            <video ref="${assetId}" offset="${offsetStr}" name="Beat_${i + 1}" duration="${durStr}" start="0s">\n`;
    if (beat.text) {
      xml += `              <title name="Subtitles" offset="0s" duration="${durStr}">\n`;
      xml += `                <text><text-style ref="ts1">${escapeXml(beat.text)}</text-style></text>\n`;
      xml += `              </title>\n`;
    }
    xml += `            </video>\n`;

    currentOffset += durFrames;
  });

  xml += `          </spine>\n`;
  xml += `        </sequence>\n`;
  xml += `      </project>\n`;
  xml += `    </event>\n`;
  xml += `  </library>\n`;
  xml += `</fcpxml>\n`;

  return xml;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
