/**
 * Shot direction in the renderer: `buildZoompanFilter` and the camera moves.
 *
 * Before this, the render worker had exactly one zoompan expression and applied
 * it to every beat (`scripts/render-worker.ts:601`:
 * `i % 2 === 0 ? 'in' : 'out'`). Every shot in every video moved identically, so
 * a cut read as a slideshow. `zoompan`'s x/y are expressions, which is what
 * makes direction possible at all — the vocabulary just has to live somewhere
 * renderable.
 *
 * The trap this file exists to close: a camera move expressed the obvious way
 * (`x='(iw-iw/zoom)*(on/49)'` is fine, `x='iw*2'` is not) walks the crop window
 * off the edge of the source and paints black. ffmpeg does not error; you get a
 * video with a black bar that is still a valid file, still reports `completed`,
 * and is indistinguishable from "the grade is dark" by eye.
 *
 * Second trap, and the one that actually shipped: zoompan's `in` is the INPUT
 * frame counter and does NOT advance while the filter generates output frames,
 * so an `(in/...)` progress expression evaluates identically on every output
 * frame and the shot renders as a FROZEN still. `on` (the OUTPUT frame counter)
 * advances 0..N-1 and is the variable every move must use. Both numeric tests
 * here evaluate `on`, and the real-encode motion test measures that the pixels
 * actually change between the first and last frame of a moving shot — a
 * `in`-based regression fails it with MAD ~0.
 *
 * So the bounds are proved two ways, because the two failure modes are
 * different: a numeric evaluation of the generated expressions (catches a wrong
 * formula) and a real ffmpeg encode checked frame by frame (catches a wrong
 * assumption about ffmpeg's own semantics).
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildZoompanFilter, calculateFrameCount } from '@/lib/engine/ffprobe';
import { CAMERA_MOVES, type CameraMove } from '@/lib/engine/shot-planner';

interface ParsedFilter {
  z: string;
  x: string;
  y: string;
  d: number;
  width: number;
  height: number;
  fps: number;
}

/** Pull the zoompan options back out of the filter string. */
function parseZoompan(filter: string): ParsedFilter {
  const open = filter.indexOf('zoompan=');
  expect(open).toBeGreaterThanOrEqual(0);
  const opts = filter.slice(open + 'zoompan='.length);

  const read = (key: string): string | undefined => {
    const m = new RegExp(`${key}=('([^']*)'|([^:]*))`).exec(opts);
    if (!m) return undefined;
    return m[2] !== undefined ? m[2] : m[3];
  };

  const z = read('z');
  const x = read('x');
  const y = read('y');
  const d = read('d');
  const s = read('s');
  const fps = read('fps');
  expect(z, 'zoompan z expression').toBeDefined();
  expect(x, 'zoompan x expression').toBeDefined();
  expect(y, 'zoompan y expression').toBeDefined();
  expect(s, 'zoompan s').toBeDefined();

  const size = /^(\d+)x(\d+)$/.exec(s as string);
  expect(size, `s should be WxH, got ${s}`).not.toBeNull();

  return {
    z: z as string,
    x: x as string,
    y: y as string,
    d: Number(d),
    width: Number(size![1]),
    height: Number(size![2]),
    fps: Number(fps),
  };
}

/**
 * Evaluate one of the generated ffmpeg expressions.
 *
 * Only the arithmetic subset the builder emits is supported: numbers, + - * /,
 * parentheses, and the variables zoompan exposes. The character guard turns
 * anything else (an ffmpeg function, a stray comma) into a hard failure rather
 * than a silently mis-evaluated result, so this cannot quietly pass on an
 * expression it did not actually understand.
 *
 * `on` is substituted (it is the variable every move animates on). `in` is in
 * the word list deliberately: if a filter regresses back to `in`, the lookup
 * fails with "references unknown variable" instead of silently evaluating —
 * `in` is the exact regression that froze every render.
 *
 * The string is built by `buildZoompanFilter` from a closed vocabulary, never
 * from user input, so the `Function` constructor is safe here.
 */
function evalExpr(expr: string, vars: Record<string, number>): number {
  const js = expr.replace(/\b(on|in|zoom|iw|ih)\b/g, (name) => {
    if (!(name in vars)) throw new Error(`expression references unknown variable ${name}`);
    return `(${vars[name]})`;
  });
  if (/[^0-9a-zA-Z_+\-*/().\s]/.test(js)) {
    throw new Error(`expression contains unsupported syntax: ${js}`);
  }
  const value = Function(`"use strict"; return (${js});`)() as unknown;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`expression did not evaluate to a finite number: ${js} -> ${String(value)}`);
  }
  return value;
}

const MOVES = CAMERA_MOVES as readonly CameraMove[];

describe('buildZoompanFilter — camera moves', () => {
  it('covers the whole closed vocabulary and nothing else', () => {
    expect(MOVES.length).toBe(7);
    for (const move of MOVES) {
      expect(MOVES).toContain(move);
    }
  });

  it('emits a distinct filter per move (direction is not decorative)', () => {
    const built = new Set(
      MOVES.map((move) => buildZoompanFilter(4, 25, 1080, 1920, move))
    );
    // Every move must differ from every other. A shared expression would mean a
    // move was accepted and then ignored, which is invisible in the output.
    expect(built.size).toBe(MOVES.length);
  });

  it('uses the requested output size, duration and fps', () => {
    for (const move of MOVES) {
      const p = parseZoompan(buildZoompanFilter(4, 25, 1080, 1920, move));
      expect(p.width).toBe(1080);
      expect(p.height).toBe(1920);
      expect(p.fps).toBe(25);
      expect(p.d).toBe(calculateFrameCount(4, 25));
      expect(p.d).toBe(100);
    }
  });

  it('animates on `on`, never on `in` (the frozen-frame regression)', () => {
    // zoompan's `in` is the INPUT frame counter and does not advance while
    // output frames are generated, so an `(in/...)` progress renders every
    // frame identical. The behaviour is guarded by the real-encode motion test
    // below; this string-level check makes the regression fail FAST and with a
    // readable message instead of a 7-encode hunt.
    for (const move of MOVES) {
      const filter = buildZoompanFilter(4, 25, 1080, 1920, move);
      expect(filter, `${move} must not reference zoompan's input counter`).not.toMatch(/\bin\b/);
      if (move === 'static') {
        expect(filter, `${move} must not reference any counter`).not.toMatch(/\bon\b/);
      } else {
        expect(filter, `${move} must animate on the output counter`).toMatch(/\bon\//);
      }
    }
  });

  it('keeps the crop window inside the frame on EVERY frame of every move', () => {
    // The property that prevents black edges: the crop origin is always
    // `slack * progress` with progress in [0,1], so it can never exceed the
    // slack. Checked at the exact resolution the renderer runs at, plus a small
    // input, because the arithmetic is what has to hold — not one lucky size.
    const sizes = [
      { width: 1080, height: 1920 },
      { width: 320, height: 320 },
      { width: 1920, height: 1080 },
    ];
    const durations = [0.5, 2, 4, 7.3];

    for (const move of MOVES) {
      for (const { width, height } of sizes) {
        for (const seconds of durations) {
          const p = parseZoompan(buildZoompanFilter(seconds, 25, width, height, move));
          for (let i = 0; i < p.d; i++) {
            const zoom = evalExpr(p.z, { on: i, iw: width, ih: height });
            expect(zoom, `${move} z at frame ${i}`).toBeGreaterThanOrEqual(1);

            const cropW = width / zoom;
            const cropH = height / zoom;
            const x = evalExpr(p.x, { on: i, zoom, iw: width, ih: height });
            const y = evalExpr(p.y, { on: i, zoom, iw: width, ih: height });

            // Origin inside the frame...
            expect(x, `${move} x at frame ${i} (${width}x${height}, ${seconds}s)`).toBeGreaterThanOrEqual(0);
            expect(y, `${move} y at frame ${i} (${width}x${height}, ${seconds}s)`).toBeGreaterThanOrEqual(0);
            // ...and the window it selects still fits. This second half is the
            // one that catches a pan running off the right/bottom edge.
            expect(
              x + cropW,
              `${move} right edge at frame ${i} (${width}x${height}, ${seconds}s)`
            ).toBeLessThanOrEqual(width + 1e-6);
            expect(
              y + cropH,
              `${move} bottom edge at frame ${i} (${width}x${height}, ${seconds}s)`
            ).toBeLessThanOrEqual(height + 1e-6);
          }
        }
      }
    }
  });

  it('actually moves: every non-static move changes the crop across the shot', () => {
    // A move that renders an identical crop every frame is a silent no-op. This
    // is the check that catches a "correct" expression that computes to a
    // constant — it would pass every bounds assertion above.
    for (const move of MOVES) {
      const width = 1080;
      const height = 1920;
      const p = parseZoompan(buildZoompanFilter(4, 25, width, height, move));
      const samples: string[] = [];
      for (const i of [0, Math.floor(p.d / 2), p.d - 1]) {
        const zoom = evalExpr(p.z, { on: i, iw: width, ih: height });
        const x = evalExpr(p.x, { on: i, zoom, iw: width, ih: height });
        const y = evalExpr(p.y, { on: i, zoom, iw: width, ih: height });
        samples.push(`${zoom.toFixed(6)}/${x.toFixed(6)}/${y.toFixed(6)}`);
      }
      if (move === 'static') {
        expect(new Set(samples).size, 'static must not move').toBe(1);
      } else {
        expect(new Set(samples).size, `${move} must move`).toBeGreaterThan(1);
      }
    }
  });

  it('starts wide and lands exactly on zoom 1.0 for a pull-out', () => {
    // `1.0 + DELTA * (1 - p)` is written to end on exactly 1.0. Deriving it as
    // `1.15 - 0.15 * p` would end on 0.9999999999999999 in IEEE 754, which makes
    // `iw - iw/zoom` very slightly NEGATIVE — the last frame of every pull-out
    // would sample a sub-pixel out of bounds. The end value is asserted exactly
    // rather than approximately so that regression cannot hide behind a
    // tolerance.
    const width = 1080;
    const height = 1920;
    const p = parseZoompan(buildZoompanFilter(4, 25, width, height, 'pull-out'));
    const last = evalExpr(p.z, { on: p.d - 1, iw: width, ih: height });
    expect(last).toBe(1);
    expect(width - width / last).toBe(0);
  });

  it('push-in and pull-out are reverses of each other', () => {
    // The true relation is mirror symmetry, not a constant sum: a push-in at
    // frame i shows exactly the crop a pull-out shows at frame d-1-i. (Their
    // zoom EXPRESSIONS sum to a constant, but it is 2.0+DELTA = 2.15, because
    // both bases are written as `1.0 + DELTA * p` on opposite progress.)
    const width = 1080;
    const height = 1920;
    const a = parseZoompan(buildZoompanFilter(3, 25, width, height, 'push-in'));
    const b = parseZoompan(buildZoompanFilter(3, 25, width, height, 'pull-out'));
    for (let i = 0; i < a.d; i++) {
      const za = evalExpr(a.z, { on: i, iw: width, ih: height });
      const zb = evalExpr(b.z, { on: a.d - 1 - i, iw: width, ih: height });
      // Equal to ~1e-16, not exactly: `0.15 * (i/span)` and `0.15 * (1-(1-p))`
      // round differently in IEEE 754. The exact-equality claims that matter
      // (pull-out lands on exactly 1.0) are asserted elsewhere.
      expect(za).toBeCloseTo(zb, 12);
      expect(za + evalExpr(b.z, { on: i, iw: width, ih: height })).toBeCloseTo(2.15, 9);
    }
  });

  it('pans and tilts are horizontal/vertical mirrors of one another', () => {
    const width = 1080;
    const height = 1920;
    const left = parseZoompan(buildZoompanFilter(3, 25, width, height, 'pan-left'));
    const right = parseZoompan(buildZoompanFilter(3, 25, width, height, 'pan-right'));
    for (let i = 0; i < left.d; i++) {
      const zl = evalExpr(left.z, { on: i, iw: width, ih: height });
      const zr = evalExpr(right.z, { on: i, iw: width, ih: height });
      expect(zl).toBe(zr);
      const xl = evalExpr(left.x, { on: i, zoom: zl, iw: width, ih: height });
      const xr = evalExpr(right.x, { on: i, zoom: zl, iw: width, ih: height });
      const slack = width - width / zl;
      // One starts where the other ends: the two are the same travel, reversed.
      expect(xl + xr).toBeCloseTo(slack, 6);
    }
  });

  it('survives a one-frame shot without dividing by zero', () => {
    // `on` runs 0..frames-1, so dividing by frames would overshoot and dividing
    // by frames-1 is what lands on 1.0. With a single frame that denominator is
    // 0, and the only correct answer is "no motion".
    const p = parseZoompan(buildZoompanFilter(0.02, 25, 1080, 1920, 'push-in'));
    expect(p.d).toBe(1);
    const zoom = evalExpr(p.z, { on: 0, iw: 1080, ih: 1920 });
    expect(zoom).toBe(1);
    expect(evalExpr(p.x, { on: 0, zoom, iw: 1080, ih: 1920 })).toBe(0);
    expect(evalExpr(p.y, { on: 0, zoom, iw: 1080, ih: 1920 })).toBe(0);
  });

  it('falls back to push-in for an unknown move rather than emitting a broken filter', () => {
    // The worker normalizes before calling, but this is the last line of
    // defence: a caller's bad string must not reach ffmpeg.
    const bogus = buildZoompanFilter(3, 25, 1080, 1920, 'zoom-in-really-fast' as CameraMove);
    const expected = buildZoompanFilter(3, 25, 1080, 1920, 'push-in');
    expect(bogus).toBe(expected);
  });
});

describe('buildZoompanFilter — real ffmpeg encode', () => {
  const toolingAvailable = (() => {
    try {
      execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  })();

  const runOrSkip = toolingAvailable ? it : it.skip;

  /**
   * Mean luma per frame, via ffmpeg's own signalstats.
   *
   * Rendering a pure white source means a black band from an out-of-bounds crop
   * is the only thing that can darken a frame, so comparing each frame against
   * the brightest frame detects a black edge without hardcoding a colour range
   * (white is 255 full-range and 235 limited; the ratio is what matters here).
   *
   * The two options that make this work are easy to get wrong, so they are
   * deliberate: `-loop` is an INPUT option and must precede its `-i` (with
   * zoompan's `d=` duplicating the single source frame, no loop is needed at
   * all), and `metadata=print` writes to av_log by default — hidden by
   * `-loglevel error` — so it must name `file=-` to reach stdout.
   */
  function perFrameLuma(filter: string, size: number): number[] {
    const out = execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'lavfi', '-i', `color=white:s=${size * 2}x${size * 2}:d=1`,
      '-vf', `${filter},signalstats,metadata=print:file=-`,
      '-f', 'null', '-',
    ], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', shell: true });

    const luma = [...out.matchAll(/signalstats\.YAVG=([0-9.]+)/g)].map((m) => Number(m[1]));
    if (luma.length === 0) {
      throw new Error(`ffmpeg produced no signalstats output (stdout was: ${out.slice(0, 400)})`);
    }
    return luma;
  }

  for (const move of MOVES) {
    runOrSkip(`${move} paints no black edge in a real encode`, () => {
      const size = 160;
      const seconds = 1;
      const zoompan = buildZoompanFilter(seconds, 25, size, size, move);
      const filter = `scale=${size}:${size}:force_original_aspect_ratio=increase,crop=${size}:${size},${zoompan}`;
      const luma = perFrameLuma(filter, size);

      expect(luma.length).toBeGreaterThan(1);
      const brightest = Math.max(...luma);
      const darkest = Math.min(...luma);
      expect(brightest).toBeGreaterThan(0);
      // 2% of full range. A 1px black edge on a 160px frame is 0.6% per axis and
      // would slip under that, so the threshold is deliberately tighter than
      // the smallest defect this test is able to see.
      expect(
        (brightest - darkest) / brightest,
        `${move} dimmed across frames (brightest ${brightest}, darkest ${darkest})`
      ).toBeLessThan(0.02);
    });
  }

  runOrSkip('renders real motion per move under the worker recipe (not a frozen still)', () => {
    // The white-source test proves no black edges, but white is insensitive to
    // whether the crop MOVES. This renders each move with the render worker's
    // EXACT recipe (see scripts/render-worker.ts: -loop 1 still, TTS-like
    // audio, -map video+audio, -tune stillimage, -shortest) against a textured
    // still and demands the pixels change between the first and last frame.
    //
    // This is the test that caught the `in`-vs-`on` regression: zoompan's `in`
    // is the INPUT frame counter and never advances while it generates output
    // frames, so an `(in/...)` progress renders every frame identical — MAD ~0
    // — while the equivalent `on` (output counter) expression moves, MAD > 10.
    // THE MEASURED NUMBERS: still-dawn.png at 1080x1920, 54 frames, in-based
    // MAD < 0.03 (frozen), on-based MAD > 11 (moving). Thresholds below sit
    // well clear of both regimes.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clipped-zm-'));
    try {
      const still = path.join(tmp, 'still.png');
      execFileSync('ffmpeg', [
        '-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=320x320',
        '-frames:v', '1', still,
      ], { stdio: ['ignore', 'pipe', 'pipe'] });

      const frameMAD = (mp4: string): number => {
        const raw = execFileSync('ffmpeg', [
          '-v', 'error', '-i', mp4, '-vf', 'scale=32:32,format=gray', '-f', 'rawvideo', '-',
        ], { stdio: ['ignore', 'pipe', 'ignore'] });
        const bytes = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
        const per = 32 * 32;
        const nf = bytes.length / per;
        expect(nf, 'encode produced no video frames').toBeGreaterThan(1);
        expect(Number.isInteger(nf), 'partial frame buffer').toBe(true);
        let sum = 0;
        for (let k = 0; k < per; k++) sum += Math.abs(bytes[k] - bytes[(nf - 1) * per + k]);
        return sum / per;
      };

      for (const move of MOVES) {
        const size = 320;
        const seconds = 1;
        const zoompan = buildZoompanFilter(seconds, 25, size, size, move);
        const filter = `scale=${size}:${size}:force_original_aspect_ratio=increase,crop=${size}:${size},${zoompan}`;
        const out = path.join(tmp, `${move}.mp4`);
        execFileSync('ffmpeg', [
          '-y', '-v', 'error',
          '-loop', '1', '-i', still, '-t', String(seconds),
          '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', String(seconds),
          '-vf', filter, '-map', '0:v:0', '-map', '1:a:0',
          '-c:v', 'libx264', '-c:a', 'aac', '-b:a', '192k', '-pix_fmt', 'yuv420p',
          '-tune', 'stillimage', '-shortest', out,
        ], { stdio: ['ignore', 'pipe', 'pipe'] });

        const m = frameMAD(out);
        if (move === 'static') {
          expect(m, `${move} must be (near-)still, got MAD ${m.toFixed(3)}`).toBeLessThan(1.5);
        } else {
          expect(m, `${move} must actually move in the encode, got MAD ${m.toFixed(3)}`).toBeGreaterThan(3);
        }
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
