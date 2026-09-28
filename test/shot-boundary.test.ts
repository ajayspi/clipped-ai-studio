/**
 * Shot direction must survive every boundary that historically stripped fields
 * on the way from the wizard to the finished mp4.
 *
 * Three of them were measured while building this feature, in order of how
 * silently each one killed data:
 *
 *  1. The zod schema (packages/schema). `z.object()` DELETES undeclared keys,
 *     so any beat parsed through it loses everything not listed -- no error, no
 *     warning, the exact failure class that made the wizard's beats silently
 *     re-plan before this repo learned the lesson.
 *  2. The queue route's normalisation (app/api/workflows/generate/route.ts).
 *     It builds a WHITELISTED object, so a field not named there never reaches
 *     the worker at all.
 *  3. The render worker's beat loop. It consumes `b.cameraMove`, but only when
 *     the beat carries one; jobs created before shot planning existed must
 *     render exactly as they always did, not be silently restyled.
 *
 * The schema is verified behaviourally (parse real beats). The two source
 * surfaces are verified by reading them, because exercising the route needs a
 * Supabase mock and the worker needs ffmpeg -- the same split the existing
 * create/mission page tests and render-media-type tests already draw.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { RenderBeatSchema } from '@clipped/schema';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('schema boundary (behavioral)', () => {
  it('preserves shot direction through RenderBeatSchema.parse', () => {
    const beat = RenderBeatSchema.parse({
      id: 'b1',
      text: 'This is the narration.',
      duration: 3,
      shotType: 'close-up',
      cameraMove: 'pan-right',
      imagePrompt: 'close-up on a spinning hub, cinematic photography',
      searchQuery: 'machine hub metal',
    });
    expect(beat.shotType).toBe('close-up');
    expect(beat.cameraMove).toBe('pan-right');
    expect(beat.imagePrompt).toContain('cinematic');
    expect(beat.searchQuery).toBe('machine hub metal');
  });

  it('preserves shot direction through RenderBeatSchema.parse when fields are missing', () => {
    const beat = RenderBeatSchema.parse({ id: 'old', text: 'Pre-shot-planning job' });
    expect(beat.shotType).toBeUndefined();
    expect(beat.cameraMove).toBeUndefined();
  });
});

describe('queue route boundary (source)', () => {
  const route = read('app/api/workflows/generate/route.ts');

  it('names the shot fields in the beat normalisation object', () => {
    // The whitelist bug: beats used to be rebuilt as { id, text, duration, urls,
    // clipUrl }, so fields absent from that literal were dropped with a 200.
    // All shot fields must be carried, or the wizard's direction dies here.
    for (const field of ['shotType', 'cameraMove', 'imagePrompt']) {
      expect(route, `route must carry ${field}`).toMatch(new RegExp(`${field}:`));
    }
  });

  it('normalises cameraMove/shotType through the planner, not pass-through', () => {
    // A route that copies the raw string lets a hand-rolled API call put an
    // invented move into a job. It must run the closed-vocabulary normalizers.
    expect(route).toMatch(/normalizeCameraMove\(b\.cameraMove\)/);
    expect(route).toMatch(/normalizeShotType\(b\.shotType\)/);
  });
});

describe('wizard planner boundary (source)', () => {
  const analyze = read('app/api/v1/analyze/route.ts');

  it('returns shot direction from the analyze endpoint in the scenes', () => {
    // The wizard's beats are built from result.scenes (CreationWizard.tsx:194).
    // If the endpoint stops carrying the fields, the store silently drops them.
    expect(analyze).toMatch(/shotFromScene/);
    expect(analyze).toMatch(/NextResponse\.json\(\{ \.\.\.parsed, scenes \}\)/);
  });
});

describe('render worker boundary (source)', () => {
  const worker = read('scripts/render-worker.ts');

  it('consumes cameraMove when the beat carries one', () => {
    expect(worker).toMatch(/b\.cameraMove/);
    expect(worker).toMatch(/normalizeCameraMove\(b\.cameraMove\)/);
    expect(worker).toMatch(/buildZoompanFilter\(finalDuration, fps, AR\.width, AR\.height, cameraMove\)/);
  });

  it('keeps the pre-shot-planning fallback byte-identical to the old behaviour', () => {
    // A legacy job (no cameraMove on its beats) must produce the same
    // alternation it always did: even beats push-in, odd beats pull-out. If
    // someone rewrites this branch to a single default move, every old render
    // silently changes.
    expect(worker).toMatch(/i % 2 === 0\s*\?/);
    expect(worker).toMatch(/'push-in'/);
    expect(worker).toMatch(/'pull-out'/);
  });

  it('prefers the shot image prompt over the spoken-text fallback', () => {
    // The old prompt led with the beat's SPOKEN text, which made the image
    // model illustrate a caption. The shot prompt must win when present.
    const m = worker.match(/b\.imagePrompt\?\.trim\(\)/);
    expect(m).not.toBeNull();
  });
});