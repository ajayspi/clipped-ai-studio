import * as yaml from 'yaml';

export interface RenderBeat {
  id: string;
  text: string;
  duration: number;
  clipUrl?: string;
  cameraMove?: string;
  imagePrompt?: string;
  voice?: string;
}

export interface RenderParams {
  workflow: string;
  script: string;
  beats: RenderBeat[];
  [key: string]: unknown;
}

export function compileYamlWorkflow(yamlString: string): RenderParams {
  const parsed = yaml.parse(yamlString);
  
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid YAML workflow definition');
  }

  const beats: RenderBeat[] = [];
  if (Array.isArray(parsed.beats)) {
    for (const b of parsed.beats) {
      beats.push({
        id: b.id || `beat-${Math.random().toString(36).substring(2, 9)}`,
        text: b.text || '',
        duration: typeof b.duration === 'number' ? b.duration : 3,
        clipUrl: b.clipUrl || b.videoUrl || b.url || '',
        cameraMove: b.cameraMove,
        imagePrompt: b.imagePrompt,
        voice: b.voice
      });
    }
  } else if (Array.isArray(parsed.scenes)) {
    for (const s of parsed.scenes) {
      beats.push({
        id: s.id || `beat-${Math.random().toString(36).substring(2, 9)}`,
        text: s.text || s.narration || '',
        duration: typeof s.duration === 'number' ? s.duration : 3,
        clipUrl: s.clipUrl || s.videoUrl || s.url || '',
      });
    }
  }

  const params: RenderParams = {
    ...parsed,
    workflow: 'yaml',
    script: parsed.script || '',
    beats
  };

  return params;
}
