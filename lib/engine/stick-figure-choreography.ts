/**
 * lib/engine/stick-figure-choreography.ts
 *
 * Autonomous Screenplay Staging, Character Kinematics & Comedic Timing Engine.
 * Inspired by kaomei/stickman-video-director architecture.
 *
 * Handles:
 * 1. Screenplay Tag Parsing ([ACTION: ...], [POSE: ...], [REACTION: ...], [CAMERA: ...], [SFX: ...], [PAUSE: ...])
 * 2. Comedic Timing Pauses & Punchline Delays
 * 3. 2D Stage Blocking & Camera Framing (Dutch tilt, whip pan, snap push, camera shake)
 * 4. Reaction Symbol Overlays (sweat drops, anger veins, question marks, eureka lightbulbs)
 */

export type ChoreographyAction =
  | 'idle'
  | 'walk_left'
  | 'walk_right'
  | 'turn_around'
  | 'jump_in'
  | 'sprint'
  | 'freeze'
  | 'enter_stage'
  | 'exit_stage';

export type ChoreographyPose =
  | 'neutral'
  | 'pointing'
  | 'eureka'
  | 'explaining'
  | 'facepalm'
  | 'hands_up'
  | 'arms_crossed'
  | 'sitting'
  | 'reading'
  | 'sad'
  | 'victory'
  | 'ready';

export type ChoreographyReaction =
  | 'none'
  | 'jaw_drop'
  | 'eye_pop'
  | 'sweat_drop'
  | 'lightbulb'
  | 'question_marks'
  | 'anger_vein'
  | 'heart_eyes';

export type ChoreographyCamera =
  | 'static'
  | 'slow_zoom_in'
  | 'snap_push'
  | 'whip_pan'
  | 'dutch_tilt'
  | 'shake';

export type ChoreographySfx =
  | 'none'
  | 'record_scratch'
  | 'cartoon_boing'
  | 'drum_roll'
  | 'rimshot'
  | 'cash_register'
  | 'thunder'
  | 'pop'
  | 'whoosh'
  | 'ding';

export interface ChoreographyCameraTransform {
  zoom: number;
  panX: number;
  panY: number;
  rotateDeg: number;
  shakeIntensity: number;
}

export interface ChoreographyBeat {
  id: string;
  beatIndex: number;
  rawText: string;
  narration: string;
  durationSec: number;
  pauseDurationSec: number;
  action: ChoreographyAction;
  pose: ChoreographyPose;
  reaction: ChoreographyReaction;
  camera: ChoreographyCamera;
  sfx: ChoreographySfx;
  stageX: number; // 0.0 (left stage) to 1.0 (right stage), 0.5 = center
  facing: 'left' | 'right';
  cameraTransform: ChoreographyCameraTransform;
}

export interface ScreenplayChoreographyProject {
  title: string;
  rawScript: string;
  beats: ChoreographyBeat[];
  totalDurationSec: number;
  comedicPausesCount: number;
  hasCameraShake: boolean;
}

// ============================================================================
// CAMERA TRANSFORM MAPPINGS
// ============================================================================

export function getCameraTransformForMode(mode: ChoreographyCamera): ChoreographyCameraTransform {
  switch (mode) {
    case 'slow_zoom_in':
      return { zoom: 1.15, panX: 0, panY: -10, rotateDeg: 0, shakeIntensity: 0 };
    case 'snap_push':
      return { zoom: 1.35, panX: 0, panY: -25, rotateDeg: 0, shakeIntensity: 0 };
    case 'dutch_tilt':
      return { zoom: 1.2, panX: 10, panY: -10, rotateDeg: -6.5, shakeIntensity: 0 };
    case 'whip_pan':
      return { zoom: 1.1, panX: -80, panY: 0, rotateDeg: 1.5, shakeIntensity: 0 };
    case 'shake':
      return { zoom: 1.25, panX: 0, panY: -15, rotateDeg: 0, shakeIntensity: 12 };
    case 'static':
    default:
      return { zoom: 1.0, panX: 0, panY: 0, rotateDeg: 0, shakeIntensity: 0 };
  }
}

// ============================================================================
// SCREENPLAY TAG PARSER
// ============================================================================

const TAG_REGEX = /\[(ACTION|POSE|REACTION|CAMERA|SFX|PAUSE|STAGE|FACING):\s*([^\]]+)\]/gi;

export function parseScreenplayChoreography(rawScript: string): ScreenplayChoreographyProject {
  const clean = rawScript.trim();
  if (!clean) {
    return {
      title: 'Untitled Choreography',
      rawScript: '',
      beats: [],
      totalDurationSec: 0,
      comedicPausesCount: 0,
      hasCameraShake: false,
    };
  }

  // Split into scenes/beats on double newline or [SCENE] markers
  let rawBlocks: string[] = [];
  if (clean.includes('[SCENE') || clean.includes('[BEAT') || clean.includes('Scene ') || clean.includes('Beat ')) {
    rawBlocks = clean
      .split(/(?=\[?(?:SCENE|BEAT|Scene|Beat)\s*\d+[:\]]?)/i)
      .map((b) => b.trim())
      .filter(Boolean);
  } else if (clean.includes('\n\n')) {
    rawBlocks = clean.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  } else {
    // Split on sentence boundaries
    rawBlocks = clean.split(/(?<=[.!?])\s+/).map((b) => b.trim()).filter(Boolean);
  }

  if (rawBlocks.length === 0) {
    rawBlocks = [clean];
  }

  const beats: ChoreographyBeat[] = [];
  let currentStageX = 0.5;
  let currentFacing: 'left' | 'right' = 'right';
  let totalComedicPauses = 0;
  let totalDuration = 0;
  let anyShake = false;

  rawBlocks.forEach((block, idx) => {
    let action: ChoreographyAction = 'idle';
    let pose: ChoreographyPose = 'neutral';
    let reaction: ChoreographyReaction = 'none';
    let camera: ChoreographyCamera = 'static';
    let sfx: ChoreographySfx = 'none';
    let pauseSec = 0;

    // 1. Extract explicit bracket tags
    let cleanedNarration = block;
    let match: RegExpExecArray | null;
    const tagRegex = new RegExp(TAG_REGEX);

    while ((match = tagRegex.exec(block)) !== null) {
      const tagType = match[1].toUpperCase();
      const tagVal = match[2].trim().toLowerCase();

      if (tagType === 'ACTION') {
        const validActions: ChoreographyAction[] = [
          'idle', 'walk_left', 'walk_right', 'turn_around',
          'jump_in', 'sprint', 'freeze', 'enter_stage', 'exit_stage'
        ];
        if (validActions.includes(tagVal as ChoreographyAction)) {
          action = tagVal as ChoreographyAction;
        }
      } else if (tagType === 'POSE') {
        const validPoses: ChoreographyPose[] = [
          'neutral', 'pointing', 'eureka', 'explaining', 'facepalm',
          'hands_up', 'arms_crossed', 'sitting', 'reading', 'sad', 'victory', 'ready'
        ];
        if (validPoses.includes(tagVal as ChoreographyPose)) {
          pose = tagVal as ChoreographyPose;
        }
      } else if (tagType === 'REACTION') {
        const validReactions: ChoreographyReaction[] = [
          'none', 'jaw_drop', 'eye_pop', 'sweat_drop', 'lightbulb',
          'question_marks', 'anger_vein', 'heart_eyes'
        ];
        if (validReactions.includes(tagVal as ChoreographyReaction)) {
          reaction = tagVal as ChoreographyReaction;
        }
      } else if (tagType === 'CAMERA') {
        const validCameras: ChoreographyCamera[] = [
          'static', 'slow_zoom_in', 'snap_push', 'whip_pan', 'dutch_tilt', 'shake'
        ];
        if (validCameras.includes(tagVal as ChoreographyCamera)) {
          camera = tagVal as ChoreographyCamera;
        }
      } else if (tagType === 'SFX') {
        const validSfx: ChoreographySfx[] = [
          'none', 'record_scratch', 'cartoon_boing', 'drum_roll', 'rimshot',
          'cash_register', 'thunder', 'pop', 'whoosh', 'ding'
        ];
        if (validSfx.includes(tagVal as ChoreographySfx)) {
          sfx = tagVal as ChoreographySfx;
        }
      } else if (tagType === 'PAUSE') {
        const parsed = parseFloat(tagVal.replace('s', ''));
        if (!isNaN(parsed) && parsed > 0) {
          pauseSec = Math.min(3.0, parsed);
        }
      } else if (tagType === 'STAGE') {
        const parsed = parseFloat(tagVal);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1.0) {
          currentStageX = parsed;
        }
      } else if (tagType === 'FACING') {
        if (tagVal === 'left' || tagVal === 'right') {
          currentFacing = tagVal;
        }
      }
    }

    // Strip bracket tags from spoken narration
    cleanedNarration = block.replace(TAG_REGEX, '').replace(/\s{2,}/g, ' ').trim();

    // 2. Heuristic fallback detection for natural dialogue
    const textLower = cleanedNarration.toLowerCase();

    // Action heuristics
    if (action === 'idle') {
      if (textLower.includes('walks in') || textLower.includes('enters')) {
        action = 'enter_stage';
        currentStageX = 0.35;
      } else if (textLower.includes('ran') || textLower.includes('sprint') || textLower.includes('rushing')) {
        action = 'sprint';
      } else if (textLower.includes('walk') || textLower.includes('paces') || textLower.includes('steps over')) {
        action = currentStageX < 0.5 ? 'walk_right' : 'walk_left';
      } else if (textLower.includes('freeze') || textLower.includes('stopped in tracks')) {
        action = 'freeze';
      }
    }

    // Pose heuristics
    if (pose === 'neutral') {
      if (textLower.includes('facepalm') || textLower.includes('cringe') || textLower.includes('regret') || textLower.includes('stupid')) {
        pose = 'facepalm';
      } else if (textLower.includes('hands up') || textLower.includes('surrender') || textLower.includes('celebrate') || textLower.includes('wohoo')) {
        pose = 'hands_up';
      } else if (textLower.includes('point') || textLower.includes('look here') || textLower.includes('check this')) {
        pose = 'pointing';
      } else if (textLower.includes('eureka') || textLower.includes('realized') || textLower.includes('idea')) {
        pose = 'eureka';
      } else if (textLower.includes('explain') || textLower.includes('listen') || textLower.includes('because')) {
        pose = 'explaining';
      } else if (textLower.includes('skeptical') || textLower.includes('doubt') || textLower.includes('nah')) {
        pose = 'arms_crossed';
      }
    }

    // Reaction heuristics
    if (reaction === 'none') {
      if (textLower.includes('wait what') || textLower.includes('impossible') || textLower.includes('are you serious') || textLower.includes('jaw drop')) {
        reaction = 'jaw_drop';
      } else if (textLower.includes('sweat') || textLower.includes('nervous') || textLower.includes('gulp')) {
        reaction = 'sweat_drop';
      } else if (textLower.includes('furious') || textLower.includes('rage') || textLower.includes('angry')) {
        reaction = 'anger_vein';
      } else if (textLower.includes('confused') || textLower.includes('how?') || textLower.includes('huh?')) {
        reaction = 'question_marks';
      } else if (pose === 'eureka') {
        reaction = 'lightbulb';
      }
    }

    // Camera heuristics
    if (camera === 'static') {
      if (reaction === 'jaw_drop' || textLower.includes('record scratch') || textLower.includes('plot twist')) {
        camera = 'snap_push';
      } else if (reaction === 'sweat_drop' || reaction === 'anger_vein') {
        camera = 'shake';
      } else if (textLower.includes('dramatic') || textLower.includes('disaster') || textLower.includes('crisis')) {
        camera = 'dutch_tilt';
      } else if (idx === 0) {
        camera = 'slow_zoom_in';
      }
    }

    // SFX heuristics
    if (sfx === 'none') {
      if (textLower.includes('record scratch') || camera === 'snap_push' && reaction === 'jaw_drop') {
        sfx = 'record_scratch';
      } else if (pose === 'facepalm' || textLower.includes('boing')) {
        sfx = 'cartoon_boing';
      } else if (reaction === 'lightbulb' || pose === 'eureka') {
        sfx = 'ding';
      } else if (textLower.includes('money') || textLower.includes('profit') || textLower.includes('bought')) {
        sfx = 'cash_register';
      } else if (action === 'sprint' || camera === 'whip_pan') {
        sfx = 'whoosh';
      }
    }

    // Comedic Timing Auto-Detection:
    // If text ends with "..." or "Wait, what?" or a punchline question, inject a punchline pause
    if (pauseSec === 0) {
      if (
        cleanedNarration.endsWith('...') ||
        textLower.includes('wait, what') ||
        textLower.includes('or so i thought') ||
        textLower.includes('and then it happened') ||
        sfx === 'record_scratch'
      ) {
        pauseSec = 0.55; // Half-second comedic timing hold
      }
    }

    if (pauseSec > 0) totalComedicPauses++;
    if (camera === 'shake') anyShake = true;

    // Update Stage Position
    if (action === 'walk_right' || action === 'sprint') {
      currentStageX = Math.min(0.85, currentStageX + 0.2);
      currentFacing = 'right';
    } else if (action === 'walk_left') {
      currentStageX = Math.max(0.15, currentStageX - 0.2);
      currentFacing = 'left';
    } else if (action === 'turn_around') {
      currentFacing = currentFacing === 'left' ? 'right' : 'left';
    }

    const wordCount = cleanedNarration.split(/\s+/).filter(Boolean).length;
    const spokenDuration = Math.max(2.5, Math.min(8.0, Number((wordCount / 2.6).toFixed(1))));
    const durationSec = spokenDuration + pauseSec;
    totalDuration += durationSec;

    const cameraTransform = getCameraTransformForMode(camera);

    beats.push({
      id: `choreo_beat_${idx + 1}`,
      beatIndex: idx + 1,
      rawText: block,
      narration: cleanedNarration,
      durationSec,
      pauseDurationSec: pauseSec,
      action,
      pose,
      reaction,
      camera,
      sfx,
      stageX: Number(currentStageX.toFixed(2)),
      facing: currentFacing,
      cameraTransform,
    });
  });

  return {
    title: beats[0]?.narration.slice(0, 32) || 'Viral Stickman Screenplay',
    rawScript,
    beats,
    totalDurationSec: Number(totalDuration.toFixed(1)),
    comedicPausesCount: totalComedicPauses,
    hasCameraShake: anyShake,
  };
}

// ============================================================================
// STAGE INTERPOLATION FOR 24 FPS ANIMATION
// ============================================================================

export function evaluateChoreographyFrame(
  beat: ChoreographyBeat,
  progress: number // 0.0 to 1.0 within the beat
): {
  xPercent: number;
  yPercent: number;
  facing: 'left' | 'right';
  camera: {
    zoom: number;
    panX: number;
    panY: number;
    rotateDeg: number;
    shakeX: number;
    shakeY: number;
  };
} {
  let x = beat.stageX;
  const y = 0.72; // Baseline stage floor

  // Smooth walk motion across stage if moving
  if (beat.action === 'walk_right' || beat.action === 'sprint') {
    const moveDist = beat.action === 'sprint' ? 0.25 : 0.12;
    x = (beat.stageX - moveDist) + moveDist * progress;
  } else if (beat.action === 'walk_left') {
    const moveDist = 0.12;
    x = (beat.stageX + moveDist) - moveDist * progress;
  }

  // Camera Shake calculation (deterministic sine oscillation based on progress)
  let shakeX = 0;
  let shakeY = 0;
  if (beat.cameraTransform.shakeIntensity > 0) {
    const freq = 35;
    const decay = 1.0 - progress * 0.6; // shakes hardest at the start
    shakeX = Math.sin(progress * freq) * beat.cameraTransform.shakeIntensity * decay;
    shakeY = Math.cos(progress * freq * 1.3) * beat.cameraTransform.shakeIntensity * decay;
  }

  // Zoom interpolation
  let curZoom = 1.0;
  if (beat.camera === 'slow_zoom_in') {
    curZoom = 1.0 + (beat.cameraTransform.zoom - 1.0) * progress;
  } else if (beat.camera === 'snap_push') {
    // Snap in quickly within the first 15% of the frame
    const snapT = Math.min(1.0, progress / 0.15);
    curZoom = 1.0 + (beat.cameraTransform.zoom - 1.0) * snapT;
  } else {
    curZoom = beat.cameraTransform.zoom;
  }

  return {
    xPercent: Math.max(0.05, Math.min(0.95, x)),
    yPercent: y,
    facing: beat.facing,
    camera: {
      zoom: curZoom,
      panX: beat.cameraTransform.panX,
      panY: beat.cameraTransform.panY,
      rotateDeg: beat.cameraTransform.rotateDeg,
      shakeX,
      shakeY,
    },
  };
}

// ============================================================================
// CURATED COMEDIC SCREENPLAY PRESETS
// ============================================================================

export const COMEDIC_SCREENPLAY_PRESETS = [
  {
    title: 'The Overconfident Day Trader',
    script: `[STAGE: 0.2] [ACTION: enter_stage] [POSE: explaining] [CAMERA: slow_zoom_in]
I just found the ultimate secret crypto trading strategy that cannot possibly fail.

[STAGE: 0.4] [ACTION: walk_right] [POSE: pointing] [SFX: pop]
Step one: buy high when everyone is hyping it on Twitter.

[STAGE: 0.5] [POSE: victory] [REACTION: lightbulb] [SFX: cash_register]
Step two: refuse to take profit because we are going straight to the moon!

[STAGE: 0.5] [ACTION: freeze] [POSE: facepalm] [REACTION: jaw_drop] [CAMERA: snap_push] [SFX: record_scratch] [PAUSE: 0.6s]
Wait... why is the chart going backwards?

[STAGE: 0.7] [ACTION: sprint] [POSE: hands_up] [REACTION: sweat_drop] [CAMERA: shake] [SFX: cartoon_boing]
I am now professionally diversified into instant ramen noodles for the next decade.`,
  },
  {
    title: 'The Gym Bro Epiphany',
    script: `[STAGE: 0.3] [ACTION: walk_right] [POSE: explaining] [CAMERA: slow_zoom_in]
I told myself today was the day I turn into an absolute Greek statue.

[STAGE: 0.5] [POSE: ready] [REACTION: lightbulb] [SFX: ding]
Pre-workout consumed. Heavy metal playlist on maximum volume.

[STAGE: 0.5] [POSE: sitting] [REACTION: sweat_drop] [CAMERA: dutch_tilt] [SFX: thunder]
I looked at the bench press bar... and the bar looked back at me with violent intent.

[STAGE: 0.5] [ACTION: freeze] [POSE: facepalm] [REACTION: jaw_drop] [CAMERA: snap_push] [SFX: record_scratch] [PAUSE: 0.6s]
One warmup rep in... and my soul temporarily left my physical body.

[STAGE: 0.7] [ACTION: sprint] [POSE: hands_up] [CAMERA: shake] [SFX: whoosh]
We are skipping straight to the post-workout protein smoothie!`,
  },
];
