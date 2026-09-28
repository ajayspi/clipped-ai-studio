/**
 * The shot planner: a closed vocabulary enforced over whatever a model returns,
 * and the file header comment on why every function here is total. The rule is
 * the same one the queue boundary learned the hard way: a job answering `200`
 * must still be renderable, and a scene whose camera direction the model
 * invented must fall back, not fail.
 */
import { describe, it, expect } from 'vitest';
import {
  CAMERA_MOVES,
  SHOT_TYPES,
  DEFAULT_LOOK,
  STOP_WORDS,
  normalizeCameraMove,
  normalizeShotType,
  shotFromScene,
  planShots,
  fallbackShot,
  buildImagePrompt,
  buildSearchQuery,
} from '@/lib/engine/shot-planner';
import { buildZoompanFilter } from '@/lib/engine/ffprobe';

describe('vocabulary', () => {
  it('is closed and renderable: every token maps to a distinct zoompan filter', () => {
    // If a new token is added to CAMERA_MOVES without a filter expression, the
    // builder silently falls back to push-in (via the `??  M['push-in']`), which
    // means the new move would be accepted and then ignored. This test is the
    // tripwire: the builder must produce a distinct filter for every token.
    const distinct = new Set(CAMERA_MOVES.map((m) => buildZoompanFilter(2, 25, 320, 320, m)));
    expect(distinct.size).toBe(CAMERA_MOVES.length);
  });

  it('normalizes every spelling the way a model writes them', () => {
    const cases: Array<[unknown, string]> = [
      ['push-in', 'push-in'],
      ['Push In', 'push-in'],
      ['push_in', 'push-in'],
      ['zoom in', 'push-in'],
      ['dolly-in', 'push-in'],
      ['pull out', 'pull-out'],
      ['zoom-out', 'pull-out'],
      ['Pan Left', 'pan-left'],
      ['truck_right', 'pan-right'],
      ['tilt up', 'tilt-up'],
      ['crane down', 'tilt-down'],
      ['static', 'static'],
      ['locked-off', 'static'],
      ['none', 'static'],
      // Totality: whatever it is, it is a token -- never an exception.
      [42, 'push-in'],
      [null, 'push-in'],
      [undefined, 'push-in'],
      ['', 'push-in'],
      ['wobble diagonally', 'push-in'],
    ];
    for (const [input, expected] of cases) {
      expect(normalizeCameraMove(input), String(input)).toBe(expected);
    }
  });

  it('normalizes shot types the same way', () => {
    const cases: Array<[unknown, string]> = [
      ['wide', 'wide'],
      ['establishing', 'wide'],
      ['WS', 'wide'],
      ['closeup', 'close-up'],
      ['CU', 'close-up'],
      ['extreme close-up', 'macro'],
      ['over-the-shoulder', 'over-shoulder'],
      ['two-shot', 'over-shoulder'],
      ['waist-up', 'medium'],
      ['garbage', 'medium'],
      [undefined, 'medium'],
    ];
    for (const [input, expected] of cases) {
      expect(normalizeShotType(input), String(input)).toBe(expected);
    }
  });
});

describe('fallback rhythm', () => {
  it('is deterministic and never repeats a camera move back to back', () => {
    const seen: Record<string, string> = {};
    for (let i = 0; i < 64; i++) {
      const s = fallbackShot(i);
      expect(SHOT_TYPES).toContain(s.shotType);
      expect(CAMERA_MOVES).toContain(s.cameraMove);
      const prev = seen[String(i - 1)];
      if (prev !== undefined) {
        expect(s.cameraMove, `beats ${i - 1} and ${i} both ${prev}`).not.toBe(prev);
      }
      seen[String(i)] = s.cameraMove;
    }
  });

  it('never moves on two consecutive beats with the same shotType that would read as a jump cut', () => {
    // Close-up to close-up with identical framing is a jump cut; the rhythm
    // must separate them. This is the perceived-quality kernel.
    for (let i = 0; i < 64; i++) {
      const a = fallbackShot(i);
      const b = fallbackShot(i + 1);
      if (a.shotType === b.shotType) {
        expect(a.cameraMove === b.cameraMove && a.shotType === 'close-up')
          .toBe(false);
      }
    }
  });
});

describe('shotFromScene — the model proposes, the planner decides', () => {
  it('accepts a well-formed scene and keeps its direction', () => {
    const shot = shotFromScene({
      text: 'This is the narration sentence.',
      description: 'A city skyline at dusk',
      keywords: ['city', 'skyline', 'dusk'],
      shotType: 'wide',
      cameraMove: 'pan-right',
    });
    expect(shot.shotType).toBe('wide');
    expect(shot.cameraMove).toBe('pan-right');
  });

  it('falls back to the rhythm, not to a uniform token, when the model invents a move', () => {
    // The subtle failure measured in the camera-move tests: if every bad scene
    // normalized to 'push-in', a model that ignored the instruction would
    // produce a film of identical shots -- correct vocabulary, dead direction.
    const odd = shotFromScene({ shotType: 'medium', cameraMove: 'wobble diagonally' }, 0);
    const even = shotFromScene({ shotType: 'medium', cameraMove: 'wobble diagonally' }, 1);
    expect(odd.cameraMove).not.toBe(even.cameraMove);
    expect(CAMERA_MOVES).toContain(odd.cameraMove);
    expect(CAMERA_MOVES).toContain(even.cameraMove);
  });

  it('handles a scene with no shot fields at all (the steady state for old jobs)', () => {
    const shot = shotFromScene({ text: 'One.', description: 'A room' }, 3);
    expect(SHOT_TYPES).toContain(shot.shotType);
    expect(CAMERA_MOVES).toContain(shot.cameraMove);
    expect(shot.imagePrompt.length).toBeGreaterThan(0);
    expect(shot.searchQuery.length).toBeGreaterThan(0);
  });

  it('is total for hostile inputs', () => {
    for (const bad of [
      null,
      undefined,
      {} as never,
      { shotType: 42, cameraMove: { evil: true } } as never,
    ]) {
      const shot = shotFromScene(bad, 2);
      expect(SHOT_TYPES).toContain(shot.shotType);
      expect(CAMERA_MOVES).toContain(shot.cameraMove);
    }
  });
});

describe('prompt construction', () => {
  it('builds the image prompt from the DESCRIPTION, never the narration text', () => {
    const prompt = buildImagePrompt(
      { text: 'Creators type quickly. Script forms differ.', description: 'A woman typing at a laptop in a sunlit studio', keywords: ['laptop'] },
      'close-up'
    );
    expect(prompt).toContain('sunlit studio');
    // The narration sentence must not leak into the image: it is what gets
    // SPOKEN, and an image model asked to draw it bakes a caption into the frame.
    expect(prompt).not.toContain('Creators type');
    expect(prompt).not.toContain('Script forms');
    expect(prompt.toLowerCase()).toContain('close-up');
  });

  it('keeps one consistent look across every beat — shared grade, not per-shot style', () => {
    const a = buildImagePrompt({ description: 'A mountain lake at dawn' }, 'wide');
    const b = buildImagePrompt({ description: 'A climber tying a knot' }, 'close-up');
    // The framing differs...
    expect(a).not.toBe(b);
    // ...but the look language is identical. A film that changes style on every
    // beat reads as five stock clips, not one film.
    expect(a).toContain(DEFAULT_LOOK);
    expect(b).toContain(DEFAULT_LOOK);
  });

  it('keeps keywords as keywords, not as a prompt sentence', () => {
    const q = buildSearchQuery({
      keywords: ['mountain', 'lake', 'dawn'],
      description: 'A still alpine lake reflecting the sunrise',
    });
    expect(q).toBe('mountain lake dawn');
  });

  it('falls back to description-derived nouns when keywords are missing', () => {
    const q = buildSearchQuery({ description: 'A climber ties a knot on rain-slick rock' });
    expect(q.length).toBeGreaterThan(0);
    // No single-letter articles or stop words survive.
    for (const word of q.split(' ')) {
      expect(word.length).toBeGreaterThan(1);
      expect(STOP_WORDS.has(word)).toBe(false);
    }
  });
});

describe('planShots', () => {
  it('assigns every scene in order and preserves it', () => {
    const shots = planShots([
      { description: 'Opening' },
      { description: 'Body' },
      { description: 'Emphasis', shotType: 'close-up', cameraMove: 'push-in' },
    ]);
    expect(shots).toHaveLength(3);
    expect(shots[2].shotType).toBe('close-up');
    expect(shots[2].cameraMove).toBe('push-in');
    // The fallback rhythm is index-based, so shot 0 and shot 1 differ.
    expect(shots[0].cameraMove).not.toBe(shots[1].cameraMove);
  });
});