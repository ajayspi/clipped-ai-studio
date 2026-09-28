/**
 * lib/engine/shot-planner.ts
 *
 * Shot language for the render pipeline.
 *
 * A beat is a sentence of narration. A SHOT is how that sentence is framed and
 * moved. Without this, every beat renders with the same motion — the worker
 * hardcoded `i % 2 === 0 ? 'in' : 'out'` (render-worker.ts:601), so a video
 * alternated between two identical centred zooms and nothing else. That is the
 * single biggest reason a cut reads as a slideshow rather than a film.
 *
 * Two rules govern this file:
 *
 *  1. EVERY function here is total. Unknown, missing or malformed input returns a
 *     valid shot rather than throwing. A planner that can fail a render is worse
 *     than no planner: the queue boundary already learned that a route can answer
 *     200 on a job that can never work, and this must not become the next one.
 *
 *  2. The vocabularies are closed. `zoompan` consumes expressions, not adjectives,
 *     so "a slow drifting push" is unrenderable while 'push-in' is exact. Free-text
 *     direction from an LLM is rejected by `normalizeCameraMove`, not rendered.
 *
 * These values are the prompt input for Phase 2 (per-beat video generation). A
 * shot spec built here is what tells Kling/Runway how to animate the frame, so
 * this is not throwaway scaffolding for the still-image phase.
 */

// ---------------------------------------------------------------------------
// Vocabularies
// ---------------------------------------------------------------------------

/**
 * The shape this file reads.
 *
 * Structural on purpose. `lib/engine/types.ts` declares `Scene` and needs to
 * reference the shot tokens below, so a real `import type { Scene }` here would
 * close a type-only cycle. A structural input keeps the dependency one-way and
 * means a beat from the wizard store, a scene from the LLM, and a plain object
 * in a test are all accepted by the same function.
 *
 * `shotType`/`cameraMove` are `unknown` because they arrive from a model: the
 * whole point of `normalizeCameraMove` is that the input is untrusted.
 */
export interface ShotSceneInput {
  text?: string;
  description?: string;
  keywords?: string[];
  shotType?: unknown;
  cameraMove?: unknown;
  /** Position in the film, for the deterministic fallback rhythm. */
  index?: number;
}

/**
 * Framing. Drives the image prompt (field of view, crop) and the oversample
 * headroom, not the motion directly.
 */
export const SHOT_TYPES = [
  'wide',
  'medium',
  'close-up',
  'macro',
  'over-shoulder',
] as const;
export type ShotType = (typeof SHOT_TYPES)[number];

/**
 * Camera moves, all expressible in ffmpeg `zoompan`.
 *
 * 'static' is a real choice, not a failure: a locked-off shot between two moves
 * is a legitimate cut, and forcing motion on every beat is what makes amateur
 * edits look amateur.
 */
export const CAMERA_MOVES = [
  'push-in',
  'pull-out',
  'pan-left',
  'pan-right',
  'tilt-up',
  'tilt-down',
  'static',
] as const;
export type CameraMove = (typeof CAMERA_MOVES)[number];

export interface ShotSpec {
  shotType: ShotType;
  cameraMove: CameraMove;
  /** Cinematic prompt for a generative image model. Never the narration text. */
  imagePrompt: string;
  /** 3-5 stock-search keywords. Never a sentence. */
  searchQuery: string;
}

const SHOT_TYPE_SET: ReadonlySet<string> = new Set(SHOT_TYPES);
const CAMERA_MOVE_SET: ReadonlySet<string> = new Set(CAMERA_MOVES);

// ---------------------------------------------------------------------------
// Normalization — the validator
// ---------------------------------------------------------------------------

/**
 * Map whatever the model returned onto the closed vocabulary.
 *
 * Models reliably paraphrase: "zoom in", "dolly in", "push_in", "Push In". All
 * of those are the same shot and must resolve to the same token, otherwise the
 * vocabulary is decorative. Anything genuinely unrecognised falls back rather
 * than being rendered.
 */
export function normalizeCameraMove(value: unknown): CameraMove {
  if (typeof value !== 'string') return 'push-in';

  const key = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z-]/g, '');

  if (CAMERA_MOVE_SET.has(key)) return key as CameraMove;

  // Hyphen/space and case are already normalized. These are synonym families.
  if (/^(push|dolly|zoom)[-]?in$/.test(key)) return 'push-in';
  if (/^(pull|dolly|zoom)[-]?out$/.test(key)) return 'pull-out';
  if (/^(pan|truck)[-]?left$/.test(key)) return 'pan-left';
  if (/^(pan|truck)[-]?right$/.test(key)) return 'pan-right';
  if (/^(tilt|crane)[-]?up$/.test(key)) return 'tilt-up';
  if (/^(tilt|crane)[-]?down$/.test(key)) return 'tilt-down';
  if (key === 'static' || key === 'locked-off' || key === 'lockedoff' || key === 'none' || key === 'still') {
    return 'static';
  }

  return 'push-in';
}

export function normalizeShotType(value: unknown): ShotType {
  if (typeof value !== 'string') return 'medium';

  const key = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z-]/g, '');

  if (SHOT_TYPE_SET.has(key)) return key as ShotType;

  if (key === 'closeup' || key === 'close' || key === 'cu' || key === 'tight') return 'close-up';
  if (key === 'establishing' || key === 'ws' || key === 'full' || key === 'extreme-wide') return 'wide';
  if (key === 'two-shot' || key === 'ots' || key === 'over-the-shoulder') return 'over-shoulder';
  if (key === 'ms' || key === 'cowboy' || key === 'waist-up') return 'medium';
  if (key === 'extreme-close-up' || key === 'ecu' || key === 'detail') return 'macro';

  return 'medium';
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

/** Framing -> field of view / lens language for the image model. */
const SHOT_FRAMING: Record<ShotType, string> = {
  wide: 'wide establishing shot, full body in frame',
  medium: 'medium shot, waist up',
  'close-up': 'close-up on the subject, face filling the frame',
  macro: 'extreme macro detail, very shallow depth of field',
  'over-shoulder': 'over-the-shoulder shot, foreground shoulder framing',
};

/**
 * Default look. Deliberately generic and consistent: this is the "cinematic
 * grade" that a per-shot random style prompt destroys. Every beat sharing one
 * look is what makes a cut feel like one film instead of five stock clips.
 *
 * Exported so the renderer and tests can assert on the shared segment directly.
 */
export const DEFAULT_LOOK = 'cinematic photography, 35mm lens, shallow depth of field, soft natural light';

function clipSentence(text: string): string {
  return text.replace(/\s+/g, ' ').trim().replace(/[.;,]+$/, '');
}

/**
 * Build the generative prompt.
 *
 * `description` is preferred over `text`: the narration is what is SPOKEN, and
 * feeding spoken words to an image model produces text-in-image artefacts and
 * on-screen captions baked into the frame. `description` is the scene-matcher's
 * own "what is shown on screen" field, which is exactly the right input.
 */
export function buildImagePrompt(scene: {
  text?: string;
  description?: string;
  keywords?: string[];
}, shotType: ShotType): string {
  const subject = clipSentence(scene.description || scene.text || '');
  const subjects = subject || (scene.keywords ?? []).slice(0, 3).join(', ') || 'an abstract cinematic composition';

  return [
    SHOT_FRAMING[shotType],
    subjects,
    DEFAULT_LOOK,
    'vertical 9:16 composition, subject centered, negative space at top for captions',
  ].join(', ');
}

/**
 * Build the stock-search query.
 *
 * A cinematic prompt is a terrible keyword search: "cinematic photography, 35mm
 * lens, shallow depth of field" matches almost nothing on Pexels. Stock APIs
 * want bare nouns. This is the split the pipeline was missing — before, one
 * `query.query` string was sent to BOTH the generative fallback and the stock
 * search, so neither got what it needed.
 */
export function buildSearchQuery(scene: { keywords?: string[]; description?: string; text?: string }): string {
  const supplied = (scene.keywords ?? []).map((k) => String(k).trim()).filter(Boolean);
  if (supplied.length >= 2) return supplied.slice(0, 5).join(' ');

  if (supplied.length === 1) {
    // One keyword is better than none, but try to widen it with the description.
    const words = clipSentence(scene.description || scene.text || '')
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
    return [supplied[0], ...words.slice(0, 3)].slice(0, 5).join(' ');
  }

  const words = clipSentence(scene.description || scene.text || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
  return words.slice(0, 5).join(' ') || 'cinematic';
}

export const STOP_WORDS = new Set([
  'the', 'and', 'that', 'this', 'with', 'from', 'they', 'their', 'there', 'here',
  'what', 'when', 'then', 'than', 'them', 'have', 'been', 'were', 'will', 'would',
  'your', 'you', 'our', 'its', 'his', 'her', 'she', 'him', 'for', 'but', 'not',
  'are', 'was', 'one', 'all', 'can', 'out', 'about', 'into', 'over', 'each',
]);

// ---------------------------------------------------------------------------
// Deterministic fallback
// ---------------------------------------------------------------------------

/**
 * A fixed shot rhythm for when the model gave us nothing usable.
 *
 * Index-based rather than random: it is reproducible, so a re-render of the same
 * script produces the same film, and it is testable. A wide opener, a pull-out
 * reveal, alternating close-ups for emphasis, and a locked-off beat before the
 * ending. Two invariants are load-bearing and tested: no run of consecutive
 * beats shares a cameraMove (so the wrap from the last entry back to the first
 * must not collide either), and no close-up directly abuts another with the
 * same move, which would read as a jump cut.
 */
const FALLBACK_RHYTHM: ReadonlyArray<{ shotType: ShotType; cameraMove: CameraMove }> = [
  { shotType: 'wide', cameraMove: 'push-in' },
  { shotType: 'medium', cameraMove: 'pull-out' },
  { shotType: 'close-up', cameraMove: 'push-in' },
  { shotType: 'medium', cameraMove: 'pan-left' },
  { shotType: 'close-up', cameraMove: 'pan-right' },
  { shotType: 'wide', cameraMove: 'tilt-up' },
  { shotType: 'medium', cameraMove: 'static' },
  { shotType: 'close-up', cameraMove: 'tilt-down' },
];

export function fallbackShot(index: number): { shotType: ShotType; cameraMove: CameraMove } {
  const i = Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0;
  return FALLBACK_RHYTHM[i % FALLBACK_RHYTHM.length];
}

// ---------------------------------------------------------------------------
// Scene -> ShotSpec
// ---------------------------------------------------------------------------

/**
 * Read the model's proposed shot fields off a scene and enforce the vocabulary.
 *
 * Deliberately does NOT throw and does NOT require the fields to be present:
 * scenes produced before this change, or by a model that ignored the new
 * instructions, still get a valid shot.
 */
export function shotFromScene(scene: ShotSceneInput | null | undefined, fallbackIndex = 0): ShotSpec {
  // Null guard: JSON can contain `null` members, and the header promise is that
  // nothing here throws. The planner's callers also filter nulls (`scene?.text`
  // in scene-matcher), so this is defence in depth, not the primary path.
  const s = (scene ?? {}) as ShotSceneInput;
  const index = typeof s.index === 'number' ? s.index : fallbackIndex;

  const rawMove = s.cameraMove;
  const rawType = s.shotType;

  // Only use the model's answer when it recognised the vocabulary itself. If it
  // invented a move, normalizeCameraMove already fell back to 'push-in'; that
  // would make every malformed scene identical, so prefer the rhythm instead.
  const modelMove = typeof rawMove === 'string' ? rawMove.trim().toLowerCase().replace(/[\s_]+/g, '-') : '';
  const modelType = typeof rawType === 'string' ? rawType.trim().toLowerCase().replace(/[\s_]+/g, '-') : '';

  const useModelMove = CAMERA_MOVE_SET.has(modelMove);
  const useModelType = SHOT_TYPE_SET.has(modelType);

  const fb = fallbackShot(index);
  const shotType = useModelType ? normalizeShotType(rawType) : fb.shotType;
  const cameraMove = useModelMove ? normalizeCameraMove(rawMove) : fb.cameraMove;

  return {
    shotType,
    cameraMove,
    imagePrompt: buildImagePrompt(s, shotType),
    searchQuery: buildSearchQuery(s),
  };
}

/**
 * Attach a shot spec to every scene in an analysis, preserving order.
 */
export function planShots(scenes: ShotSceneInput[], fallbackStart = 0): ShotSpec[] {
  return scenes.map((scene, i) => shotFromScene(scene, fallbackStart + i));
}
