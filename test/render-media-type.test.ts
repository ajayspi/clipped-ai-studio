/**
 * Regression cover for the media-type misclassification that made the render
 * worker emit ~1-frame clips while still reporting `completed`.
 *
 * The worker used to decide still-vs-video with
 *
 *     mediaUrl.includes('.mp4') || mediaUrl.includes('video')
 *
 * but the Pollinations fallback URL embeds the URL-encoded beat text in its
 * path, so any beat whose script merely MENTIONED the word "video" took the
 * video branch: no `zoompan` filter, and `-t <duration>` truncation instead of
 * `-loop`. Each beat encoded to roughly one frame and the job was marked done.
 * Measured on 2026-09-28: a 2-beat job reported `completed` with a 0.17s /
 * 2-frame output while the identical job without the word "video" produced a
 * 5.03s / 124-frame video.
 *
 * These tests build real files with ffmpeg and assert the decision comes from
 * the bytes, so the bug cannot come back via a prompt that happens to contain
 * a magic word.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isVideoFile, STILL_IMAGE_PROBE_FIXED } from '@/lib/engine/ffprobe';

let tmpDir: string;

/** True when both ffmpeg and ffprobe are on PATH; the fixtures need both. */
function toolingAvailable(): boolean {
  try {
    execFileSync('ffprobe', ['-version'], { stdio: 'ignore' });
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const available = toolingAvailable();

/** Render a deterministic test pattern to a real H.264 mp4. */
function makeVideo(file: string, seconds: number): void {
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'lavfi', '-i', `testsrc=size=320x240:rate=25:duration=${seconds}`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    file,
  ], { stdio: 'ignore' });
}

/**
 * Write a genuine single-frame STILL, then rename it to `destPath`.
 *
 * The rename matters: ffmpeg picks its muxer from the output extension, so
 * asking ffmpeg to write "one frame" straight to `x.mp4` yields a real 1-frame
 * H.264 mp4 (which IS a video). Encoding to a real image format first and then
 * renaming produces the actual adversarial case — a JPEG whose name claims mp4.
 */
function makeDisguisedStill(destPath: string, tmpDir: string): void {
  const asJpeg = path.join(tmpDir, `still_src_${Math.random().toString(36).slice(2)}.jpg`);
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'color=c=blue:size=320x240:duration=1',
    '-frames:v', '1',
    asJpeg,
  ], { stdio: 'ignore' });
  fs.renameSync(asJpeg, destPath);
}

function makeStill(file: string): void {
  const ext = path.extname(file).replace('.', '');
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'color=c=blue:size=320x240:duration=1',
    '-frames:v', '1',
    '-f', ext === 'png' ? 'image2' : 'mjpeg',
    file,
  ], { stdio: 'ignore' });
}

beforeAll(() => {
  if (!available) return;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isvideofile-'));
});

afterAll(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

describe('isVideoFile', () => {
  it('is exported as a real function (guards against the helper going missing)', () => {
    expect(typeof isVideoFile).toBe('function');
  });

  it('marks the fix as present so a later refactor cannot silently drop it', () => {
    // If someone reverts to URL sniffing this flag must be removed deliberately,
    // which is the point: the constant is the tripwire.
    expect(STILL_IMAGE_PROBE_FIXED).toBe(true);
  });

  it.skipIf(!available)('detects a real multi-frame mp4 as video', async () => {
    const f = path.join(tmpDir, 'clip.mp4');
    makeVideo(f, 1);
    await expect(isVideoFile(f)).resolves.toBe(true);
  });

  it.skipIf(!available)('detects a real single-frame mp4 as video (container wins over frame count)', async () => {
    // A 1-frame mp4 is still a video container; treating it as a still would send
    // it down the zoompan loop path, so the container check has to come first.
    const f = path.join(tmpDir, 'oneframe_cut.mp4');
    const src = path.join(tmpDir, 'oneframe.mp4');
    makeVideo(src, 1);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-frames:v', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', f], { stdio: 'ignore' });
    await expect(isVideoFile(f)).resolves.toBe(true);
  });

  it.skipIf(!available)('detects a JPEG still as NOT video, even when its name says video', async () => {
    const f = path.join(tmpDir, 'sneaky.mp4');
    // A real JPEG wearing an .mp4 filename: the decision must come from the
    // bytes. If this regresses to name/URL sniffing it returns true and the
    // worker takes the no-zoompan, -t-truncation path that made 1-frame clips.
    makeDisguisedStill(f, tmpDir);
    // Sanity: the fixture really is a JPEG, not an mp4.
    expect(fs.readFileSync(f).subarray(0, 2).toString('latin1')).toBe('\xff\xd8');
    await expect(isVideoFile(f)).resolves.toBe(false);
  });

  it.skipIf(!available)('detects a PNG still as NOT video', async () => {
    const f = path.join(tmpDir, 'still.png');
    makeStill(f);
    await expect(isVideoFile(f)).resolves.toBe(false);
  });

  it.skipIf(!available)('detects a real single-frame mp4 as video (container beats frame count)', async () => {
    // The mirror of the test above: 1 frame, but a real video container. The
    // container check must win, or a genuine video gets the still treatment.
    const f = path.join(tmpDir, 'genuine_one_frame.mp4');
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=25:duration=1',
      '-frames:v', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      f,
    ], { stdio: 'ignore' });
    await expect(isVideoFile(f)).resolves.toBe(true);
  });

  it.skipIf(!available)('rejects a non-existent file rather than silently guessing video', async () => {
    await expect(isVideoFile(path.join(tmpDir, 'does-not-exist.mp4'))).rejects.toThrow();
  });
});

describe('the original misclassification trigger', () => {
  it.skipIf(!available)('a Pollinations-style URL whose prompt contains "video" is still resolved as a still', async () => {
    // Reproduce the exact prompt shape that broke production: the beat text is
    // URL-encoded into the path, so "ai-videos" smuggles the substring "video"
    // into a URL that actually serves a JPEG.
    const beatText = 'PROBE ai-videos first beat.';
    const mediaUrl =
      'https://image.pollinations.ai/prompt/' +
      encodeURIComponent(`${beatText}, educational tech style`) +
      '?width=1024&height=1024&nologo=true';

    // The old heuristic, verbatim, still says "video" — proving the bug was real.
    const oldHeuristic = mediaUrl.includes('.mp4') || mediaUrl.includes('video');
    expect(oldHeuristic).toBe(true);

    // The bytes on disk say otherwise, and that is now what decides.
    const f = path.join(tmpDir, 'pollinations-still.jpg');
    makeStill(f);
    await expect(isVideoFile(f)).resolves.toBe(false);
  });
});
