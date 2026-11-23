/**
 * Video Micro-Apps Engine
 * 
 * Ported & adapted from nickvasilescu/parallax (src/server/apps/catalog/video.ts):
 * Lightweight, specialized single-purpose video generators:
 * 1. Camera Move: Cinematic camera trajectory (dolly-in, orbit, whip, crane, fpv) over a still
 * 2. Frame to Frame: Seamless morph/transition between start and end frames
 * 3. Product Turntable: 360-degree commercial turntable ad with controlled studio lighting
 * 4. Talking Photo: Expressive portrait animation with lip-sync
 * 5. Big Reveal: Macro detail expanding into a wide landscape reveal
 * 6. Time-Lapse: Day-to-night / seasonal environmental transitions
 * 7. Animate Photo: Gentle ambient motion (hair, wind, water) from a single still
 */

export interface MicroAppChoice {
  value: string;
  label: string;
  prompt: string;
}

export interface MicroAppField {
  id: string;
  label: string;
  type: 'text' | 'choice';
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  choices?: MicroAppChoice[];
}

export interface MicroAppInputSlot {
  id: string;
  label: string;
  type: 'image' | 'audio' | 'video';
  required?: boolean;
  hint?: string;
}

export interface MicroAppDef {
  id: string;
  name: string;
  pitch: string;
  category: 'video-tool' | 'ad-tool' | 'portrait-tool';
  tags: string[];
  recommendedModel: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  durationSeconds: number;
  inputs: MicroAppInputSlot[];
  fields: MicroAppField[];
  template: string;
}

export const VIDEO_MICRO_APPS: Record<string, MicroAppDef> = {
  'camera-move': {
    id: 'camera-move',
    name: 'Camera Move',
    pitch: 'Add a cinematic camera move to a still image.',
    category: 'video-tool',
    tags: ['camera', 'cinematic', 'motion'],
    recommendedModel: 'kling-v1',
    aspectRatio: '16:9',
    durationSeconds: 4,
    inputs: [{ id: 'still', label: 'Base Image', type: 'image', required: true }],
    fields: [
      {
        id: 'move',
        label: 'Camera Movement',
        type: 'choice',
        required: true,
        choices: [
          { value: 'dolly-in', label: 'Dolly In', prompt: 'a slow deliberate dolly-in push towards the subject' },
          { value: 'dolly-out', label: 'Pull Back', prompt: 'a slow pull-back revealing the surrounding scale of the world' },
          { value: 'orbit', label: '360 Orbit', prompt: 'a smooth circular half-orbit rotation around the subject' },
          { value: 'crane-up', label: 'Crane Ascend', prompt: 'a grand jib crane move rising up and over the scene' },
          { value: 'pan-left', label: 'Pan Left', prompt: 'a steady cinematic pan to the left' },
          { value: 'whip-pan', label: 'Whip Pan', prompt: 'a rapid whip pan with optical motion blur' },
          { value: 'fpv-dive', label: 'FPV Drone Dive', prompt: 'a high-velocity FPV drone dive carving through the scene' },
          { value: 'rack-focus', label: 'Focus Pull', prompt: 'a shallow depth-of-field rack focus from foreground to subject' }
        ]
      }
    ],
    template: 'Starting from the input image, the camera performs {{move}}. The environment and lighting stay true to the original frame.'
  },

  'frame-to-frame': {
    id: 'frame-to-frame',
    name: 'Frame to Frame Transition',
    pitch: 'Animate the smooth journey between a first and a last frame.',
    category: 'video-tool',
    tags: ['transition', 'morph', 'continuity'],
    recommendedModel: 'wan-2.1',
    aspectRatio: '16:9',
    durationSeconds: 4,
    inputs: [
      { id: 'startFrame', label: 'First Frame (In-point)', type: 'image', required: true },
      { id: 'endFrame', label: 'Last Frame (Out-point)', type: 'image', required: true }
    ],
    fields: [
      {
        id: 'how',
        label: 'Motion Trajectory',
        type: 'text',
        placeholder: 'The flower unfolds petals as sunlight streaks across...',
        maxLength: 240
      }
    ],
    template: 'A smooth, continuous shot starting exactly on the first frame and morphing into the last frame. {{?how}}{{how}}.{{/how}}'
  },

  'product-spin': {
    id: 'product-spin',
    name: 'Product Turntable',
    pitch: 'A pristine 360-degree commercial spin of your product.',
    category: 'ad-tool',
    tags: ['product', 'ecommerce', 'commercial', '360'],
    recommendedModel: 'kling-v1',
    aspectRatio: '1:1',
    durationSeconds: 6,
    inputs: [{ id: 'productImage', label: 'Product Photo', type: 'image', required: true }],
    fields: [
      {
        id: 'backdrop',
        label: 'Studio Backdrop',
        type: 'choice',
        required: true,
        choices: [
          { value: 'white-studio', label: 'White Infinity Cyclorama', prompt: 'pure white seamless infinity cyclorama studio' },
          { value: 'black-studio', label: 'Graphite Dark Sweep', prompt: 'dark graphite luxury studio with soft ground reflections' },
          { value: 'soft-gradient', label: 'Pastel Gradient', prompt: 'soft aesthetic pastel color gradient with diffuse illumination' },
          { value: 'keep-as-is', label: 'Keep Original Environment', prompt: 'the original environment from the photo' }
        ]
      }
    ],
    template: 'The product turns smoothly through a full 360-degree rotation on a rotating turntable, high-end commercial studio lighting, backdrop: {{backdrop}}. Maintain product geometry and branding exactly.'
  },

  'talking-photo': {
    id: 'talking-photo',
    name: 'Talking Photo Avatar',
    pitch: 'An expressive portrait that speaks your script with natural lip-sync.',
    category: 'portrait-tool',
    tags: ['avatar', 'portrait', 'voice', 'lip-sync'],
    recommendedModel: 'hedwig-avatar',
    aspectRatio: '9:16',
    durationSeconds: 5,
    inputs: [
      { id: 'portrait', label: 'Face Portrait', type: 'image', required: true, hint: 'High-resolution forward-facing face.' },
      { id: 'voiceAudio', label: 'Custom Voice Audio', type: 'audio', required: false, hint: 'Optional reference audio.' }
    ],
    fields: [
      {
        id: 'script',
        label: 'Spoken Script',
        type: 'text',
        required: true,
        placeholder: 'Welcome to Clipped AI. Here is what we created today...',
        maxLength: 600
      }
    ],
    template: '{{script}}'
  },

  'reveal': {
    id: 'reveal',
    name: 'The Big Scale Reveal',
    pitch: 'Start tight on a macro detail and pull back to reveal a monumental world.',
    category: 'video-tool',
    tags: ['cinematic', 'reveal', 'scale'],
    recommendedModel: 'kling-v1',
    aspectRatio: '16:9',
    durationSeconds: 5,
    inputs: [{ id: 'detailImage', label: 'Close-up Detail', type: 'image', required: true }],
    fields: [
      {
        id: 'world',
        label: 'Revealed World Description',
        type: 'text',
        placeholder: 'A vast cyberpunk metropolis stretching to the horizon...',
        maxLength: 240
      }
    ],
    template: 'Start in an extreme close-up of the detail in the image, then pull the camera far back in one grand continuous move to reveal the wider world{{?world}}: {{world}}{{/world}}.'
  },

  'time-lapse': {
    id: 'time-lapse',
    name: 'Environmental Time-Lapse',
    pitch: 'Watch hours, weather, or lighting sweep across a still environment.',
    category: 'video-tool',
    tags: ['time-lapse', 'nature', 'lighting'],
    recommendedModel: 'wan-2.1',
    aspectRatio: '16:9',
    durationSeconds: 5,
    inputs: [{ id: 'landscape', label: 'Scene Image', type: 'image', required: true }],
    fields: [
      {
        id: 'span',
        label: 'Temporal Progression',
        type: 'choice',
        required: true,
        choices: [
          { value: 'day-to-night', label: 'Day to Night', prompt: 'sun drops below horizon, golden hour transitions into deep starry night with streetlights igniting' },
          { value: 'clouds-racing', label: 'Fast Moving Clouds', prompt: 'dynamic atmospheric cloud shadows racing across the terrain under changing wind' },
          { value: 'seasonal-bloom', label: 'Seasons Passing', prompt: 'winter snow rapidly thaws and spring greenery blooms in rapid time-lapse' }
        ]
      }
    ],
    template: 'A locked-off time-lapse of the scene showing {{span}}. The landscape remains stable while temporal lighting and atmosphere sweep across.'
  },

  'animate-photo': {
    id: 'animate-photo',
    name: 'Bring Photo to Life',
    pitch: 'Gentle, natural ambient motion from a single photograph.',
    category: 'video-tool',
    tags: ['ambient', 'subtle', 'motion'],
    recommendedModel: 'kling-v1',
    aspectRatio: '16:9',
    durationSeconds: 5,
    inputs: [{ id: 'photo', label: 'Photo', type: 'image', required: true }],
    fields: [
      {
        id: 'motion',
        label: 'What Moves',
        type: 'text',
        placeholder: 'Hair swaying in gentle breeze, water ripples, blinking eyes...',
        maxLength: 200
      }
    ],
    template: 'Bring the still photo to life with gentle, organic motion and a steady camera. {{?motion}}{{motion}}.{{/motion}}'
  }
};

// ==========================================
// Template Compiler & Execution Helper
// ==========================================

export interface CompiledMicroAppExecution {
  appId: string;
  appName: string;
  modelId: string;
  prompt: string;
  aspectRatio: string;
  durationSeconds: number;
  inputAssignments: Record<string, string>;
}

export function compileMicroAppPrompt(
  appId: string,
  values: Record<string, string>,
  inputAssetIds: Record<string, string> = {}
): CompiledMicroAppExecution {
  const app = VIDEO_MICRO_APPS[appId];
  if (!app) {
    throw new Error(`Unknown micro-app ID: ${appId}`);
  }

  // Verify required inputs
  for (const input of app.inputs) {
    if (input.required && !inputAssetIds[input.id]) {
      throw new Error(`Micro-app "${app.name}" requires input: ${input.label}`);
    }
  }

  let prompt = app.template;

  // Process conditional blocks {{?field}}...{{/field}}
  prompt = prompt.replace(/\{\{\?(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, fieldId, content) => {
    const val = values[fieldId]?.trim();
    if (!val) return '';
    return content.replace(new RegExp(`\\{\\{${fieldId}\\}\\}`, 'g'), val);
  });

  // Process standard variable replacements {{field}}
  for (const field of app.fields) {
    const rawVal = values[field.id];
    let resolved = rawVal || '';

    if (field.type === 'choice' && field.choices) {
      const match = field.choices.find(c => c.value === rawVal);
      if (match) {
        resolved = match.prompt;
      }
    }

    prompt = prompt.replace(new RegExp(`\\{\\{${field.id}\\}\\}`, 'g'), resolved);
  }

  // Clean extra whitespace
  prompt = prompt.replace(/\s+/g, ' ').trim();

  return {
    appId,
    appName: app.name,
    modelId: app.recommendedModel,
    prompt,
    aspectRatio: app.aspectRatio,
    durationSeconds: app.durationSeconds,
    inputAssignments: inputAssetIds
  };
}
