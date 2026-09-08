# Owlie Studio — Editing Video as Code

This workspace is an **Owlie Studio** video project. The timeline is a plain
**OpenTimelineIO (OTIO) JSON** file — you edit it directly with **Read / Edit / Grep**.
**Editing video here = editing JSON.** The `.otio` file is the single source of truth;
the extension renders it with ffmpeg and **git is the undo stack**.

- **Timeline file(s):** `two_clip.otio`
- **Media:** `media/` — put background music under `media/bgm/` (that folder is what turns on BGM ducking).
- **Do NOT touch:** `.video/` (proxies, waveforms, transcripts, thumbnails) and `out/` (renders) — regenerated caches.
- **Owlie Studio extension:** v1.2.0
- **Cloud MCP server:** `owlie-studio` (deterministic helpers only — wired via `.mcp.json`; it never renders).

## Prime directive
1. Edit `project.otio` (or any `*.otio`) directly with **Read / Edit / Grep** — it is OTIO JSON.
2. Make **surgical** edits and **preserve every unknown field byte-exact** — render features live under
   `metadata.owlie_vibes.*` and the compiler depends on them surviving. Never reformat or rewrite the whole file.
3. After **every** edit, call the **`validate_otio`** MCP tool and fix every error before declaring done.
4. **Frame-quantize** all time math (see below). Timecodes are integer frames, not loose floats.

## The OTIO model you are editing

- Nesting: `Timeline.1` → `tracks` (a `Stack.1`) → `children` = **`Track.1[]`** → each track's `children` =
  **`Clip.2` / `Gap.1` / `Transition.1`** in play order.
- A track's `kind` is `"Video"`, `"Audio"`, or `"Subtitle"`.
- **Time is `RationalTime` `{rate, value}`** where seconds = `value / rate` (`rate` is fps, usually 30). Everything
  is **integer frames** — quantize to whole frames; the minimum clip length is 1 frame.
- **There are NO absolute timestamps.** A clip's start on its track = the **cumulative sum of the durations of all
  preceding children** on that track. To place something at time _T_, insert a leading **`Gap.1`** of the right
  frame count before it.
- A clip's `source_range` = `{ start_time (in-point into the media), duration (how long it plays) }`.
- Media is referenced via `media_references.DEFAULT_MEDIA.target_url` — a path **relative to the `.otio` file**
  (forward slashes), with `active_media_reference_key` set to `"DEFAULT_MEDIA"`.

Minimal clip (150 frames @ 30 fps = 5.0 s of `media/clip_a.mp4`):

```json
{
  "OTIO_SCHEMA": "Clip.2",
  "name": "clip_a",
  "source_range": {
    "OTIO_SCHEMA": "TimeRange.1",
    "start_time": { "OTIO_SCHEMA": "RationalTime.1", "rate": 30, "value": 0 },
    "duration":   { "OTIO_SCHEMA": "RationalTime.1", "rate": 30, "value": 150 }
  },
  "media_references": {
    "DEFAULT_MEDIA": {
      "OTIO_SCHEMA": "ExternalReference.1",
      "target_url": "media/clip_a.mp4",
      "available_range": {
        "OTIO_SCHEMA": "TimeRange.1",
        "start_time": { "OTIO_SCHEMA": "RationalTime.1", "rate": 30, "value": 0 },
        "duration":   { "OTIO_SCHEMA": "RationalTime.1", "rate": 30, "value": 150 }
      }
    }
  },
  "active_media_reference_key": "DEFAULT_MEDIA"
}
```

## Structural edits — plain JSON, no metadata

- **Trim / shorten** a clip: lower `source_range.duration.value` (frames). To trim from the **left** (later in-point),
  raise `start_time.value` **and** lower `duration.value` by the same number of frames.
- **Delete** a clip: remove its `Clip.2` node from the track's `children`. **Reorder:** move array items.
- **Move a clip later:** insert or grow a preceding **`Gap.1`** (same `source_range.duration` mechanism, no media).
- **Mute a clip's audio:** set `metadata.owlie_vibes.mute_audio` to `true` on the `Clip.2` (renders silence for it).
- **Add a track:** append a `Track.1` with the desired `kind` to `tracks.children` (or run **Owlie Studio: Add Track…**).

## Render features — set `metadata.owlie_vibes.*`

These are the ONLY effect keys the renderer (`core/src/compiler.ts`) actually applies. Anything else is ignored.

### Transitions (on the *incoming* clip)
Set on the `Clip.2` that the transition leads **into**:
```json
"metadata": { "owlie_vibes": { "transition_in": "black_fade", "duration_frames": 15 } }
```
- `transition_in` ∈ `black_fade` (fade through black) · `white_flash` (quick flash to white) ·
  `blur_dissolve` (soft dissolve) · `zoom_punch` (punch-zoom into the clip).
- `duration_frames` — length of the effect in frames.
- A real **`Transition.1` node** between two clips (e.g. from the timeline add-transition command) also
  renders now — its `transition_type` maps onto the names above (SMPTE_Dissolve → dissolve). Explicit
  `transition_in` metadata wins if both are present. Transitions render on single-track timelines too.

### Subtitles + styling
- A subtitle track is a `Track.1` with `kind: "Subtitle"` whose `Clip.2` children point their `target_url` at an
  **`.srt` file** (not a video). Use leading `Gap.1`s to place cues; the clip's `source_range` selects the window.
- **Style is set on the TRACK's** `metadata` (not per clip):
```json
"metadata": { "owlie_vibes": { "font_size": 32, "font_color": "yellow", "outline_color": "black", "position": "bottom" } }
```
- `position` ∈ `bottom` · `top` · `center`. Colors accept CSS names (`white`, `black`, `yellow`, `red`, `green`,
  `blue`, `cyan`, `magenta`) or `#RRGGBB`. Defaults: size **24**, white on black, **bottom**.
- Generate the `.srt` from a transcript with the `generate_srt` MCP tool (see below).

### Background music (BGM) with automatic ducking
- **Folder-based — there is no BGM flag.** Add an `Audio`-kind `Track.1` whose clip's `target_url` lives under
  **`media/bgm/`** (any depth). At render the compiler auto-applies **sidechain ducking + ~+12 dB voice boost +
  auto-loop** to fill the video whenever a `media/bgm/` track sits alongside a voice/video track. Nothing else to set.
- Download royalty-free tracks straight into `media/bgm/` via **Owlie Studio: BGM Library**.

### Color grade (per clip)
Set on the `Clip.2` you want graded — applies an ffmpeg `eq` to that clip's video:
```json
"metadata": { "owlie_vibes": { "color_grade": { "brightness": 0.05, "contrast": 1.15, "saturation": 1.2 } } }
```
- `brightness` [-1..1] (0 = none) · `contrast` [0..3] (1 = none) · `saturation` [0..3] (1 = none). Omit any key
  to leave it unchanged; out-of-range values are clamped.

### Per-clip audio (volume + fades)
Set on the `Clip.2`:
```json
"metadata": { "owlie_vibes": { "volume": 0.6, "fade_in": 0.5, "fade_out": 1.0 } }
```
- `volume` — linear gain (1 = unity, 0 = silent, 2 = +6 dB). `fade_in` / `fade_out` — seconds of audio fade at the
  clip's start / end. (BGM sidechain ducking is separate and automatic.)

### Text titles / captions (burned in)
Set `text_overlays` — an array of drawtext titles — on the `Clip.2`:
```json
"metadata": { "owlie_vibes": { "text_overlays": [
  { "text": "How to edit in VS Code", "position": "top", "font_size": 64, "color": "yellow" },
  { "text": "step 1", "position": "bottom", "start": 0, "end": 3 }
] } }
```
- `text` (required). `position` ∈ `top` · `center` · `bottom` (default `bottom`). `font_size` (default 48),
  `color` (CSS name / `#hex`, default white), `box` (bool, default true — a readability backing box),
  `box_color` (default `black@0.5`).
- `start` / `end` — seconds **relative to the clip** to show the title (default: the whole clip).
- Rendered with a system font (Arial / DejaVu); override per-overlay with `font_file`, or globally with the
  `OWLIE_FONT` env var. An overlay whose font can't be found is skipped (never fails the render).

### Ken Burns pan / zoom (great for stills)
Add slow motion to a clip (especially a still image) on the `Clip.2`:
```json
"metadata": { "owlie_vibes": { "ken_burns": { "from": 1.0, "to": 1.2, "pan": "right" } } }
```
- `from` / `to` — start / end zoom (1.0 = no zoom; clamped to [1, 3]). Defaults 1.0 → 1.15.
- `pan` ∈ `none` (centered zoom) · `left` · `right` · `up` · `down`.
- Shorthand: `"ken_burns": true` = a gentle centered zoom-in. The zoom ramps linearly across the whole clip.

### ⚠️ NOT implemented — do not write these
There is **no** `effects` array and **no** `speed_ramp`. `color_grade` is a **direct** `owlie_vibes` key (see
above), NOT an `effects[]` entry — an older `metadata.owlie_vibes.effects` array with `color_grade` / `speed_ramp`
is not wired and renders nothing. (The `color_grade_intent` MCP *prompt* just returns an ffmpeg filter string to
apply by hand; the `color_grade` metadata key above is the stored-and-auto-rendered path.)

## Local media workflows (VS Code commands — run locally, not the cloud MCP)

Open the Command Palette and run **Owlie Studio: …**. All heavy compute runs on the user's machine:
- **Transcribe Media…** — whisper.cpp → `.video/transcripts/sha256-<key>/transcript.json` (+ `.srt`). Grep the
  transcript to find moments by speech.
- **BGM Library** — download royalty-free music into `media/bgm/`.
- **YouTube Download…** (yt-dlp) · **Extract Audio (WAV)…** (ffmpeg) · **Generate Narration (TTS)…** (Chatterbox,
  supports voice cloning from ~6 s of reference audio). Each imports the result into `media/` automatically.
- Import also builds proxy / waveform / thumbnail caches under `.video/`; rendering is **incremental** (only changed
  clips re-encode).

## MCP tools (`owlie-studio`, cloud) — deterministic escape hatches

Small, no-GPU helpers. Use them to compute what plain JSON edits can't:
- **`validate_otio({ otio })`** — structural diagnostics. **Run after every edit.** Codes include
  `zero_duration_clip`, `transition_without_neighbors`, `source_range_out_of_bounds`, `no_tracks_stack`. It **skips
  local media checks**, so also confirm each `target_url` file actually exists on disk yourself.
- **`compile_ffmpeg_argv({ otio, out_path })`** — preview/explain the ffmpeg command a render would run. Does **not**
  render or touch disk.
- **`generate_srt({ transcript })`** — `transcript.json` → SRT text (for a subtitle track).
- **`detect_filler_words({ transcript })`** — find `um` / `uh` / `you know` with timestamps to trim.
- **`media_metadata({ url })`** — HEAD an HTTPS media URL (type/size) before importing it.
- Prompts: **`color_grade_intent`** (natural language → ffmpeg filter chain to apply manually — NOT auto-rendered) ·
  **`suggest_cuts`** (transcript + style → proposed cut ranges).

Transcript shape (input to the transcript tools): `{ segments: [ { start, end, text, words: [ { word, start, end } ] } ] }`.

## Rendering & preview
- The extension renders **locally**: **Owlie Studio: Render Example** / the Render button → `out/<timeline>/out.mp4`;
  an auto-draft preview lands at `out/<timeline>/preview.mp4` after edits. Just edit + `validate_otio`; the extension
  renders. **The cloud `owlie-studio` MCP never renders** (it only validates/compiles-preview).
- The Render button's **format picker** chooses aspect + resolution: **16:9 · 1080p** (default), **9:16 · 1080p**
  (Shorts/Reels/TikTok), **1:1 · 1080p** (square), **16:9 · 4K**. Vertical/square use crop-to-fill by default.

## Full edit→render→upload loop — the local `owlie-youtube` MCP
Unlike the cloud helpers, the **local** `owlie-youtube` stdio server (installed via **Owlie Studio: Set up YouTube
Upload MCP**) runs on this machine with filesystem access, so you can close the whole loop without the GUI:
1. Edit `project.otio` (surgical JSON edits) and `validate_otio`.
2. **`youtube_render({ project_path, aspect?, resolution?, fit? })`** → renders with the same ffmpeg compiler the
   editor uses and returns an `out_path` (needs ffmpeg on PATH, or `OWLIE_FFMPEG`). `aspect`: `16:9`|`9:16`|`1:1`;
   `resolution`: `720p`|`1080p`|`4k`; `fit`: `cover` (crop-to-fill, the vertical/square default) | `contain` (letterbox).
3. **`youtube_upload_video({ file: out_path, title, privacy? })`** → resumable upload (defaults to `unlisted`).
   Connect a channel once with `youtube_authorize` first. `youtube_list_channels` shows connected channels.

## Git is your undo stack
- Every render can auto-checkpoint: commit the `.otio`, move the `owlie-studio/last-render` tag, push.
- Commands: **Commit Timeline Edit**, **Revert to Last Render Checkpoint**, **New Cut Branch**, **Open Pull Request**.
- Co-author your commits: `Co-Authored-By: Claude <noreply@anthropic.com>`.

## Do NOT
- Reformat or rewrite the whole `.otio` — make surgical edits; unknown fields + `metadata.owlie_vibes.*` must survive byte-exact.
- Compute timecodes as loose floats — frame-quantize (integer `value` at a `rate`).
- Write into `.video/` or `out/` — they are regenerated caches/outputs.
- Invent an absolute clip start time — position is cumulative; place with a leading `Gap.1`.
- Assume a "BGM flag" or a subtitle "type" — BGM is **folder-based** (`media/bgm/`), subtitles are a **`Subtitle` track**
  referencing an `.srt`, and styling/transitions are **metadata**.
- Write an `effects[]` array or a `speed_ramp` expecting it to render — **it won't** (use the direct `color_grade` / `volume` / `fade_in` / `fade_out` keys above).

---
_Generated by the Owlie Studio VS Code extension. Written as AGENTS.md, CLAUDE.md, and GEMINI.md (byte-identical) so
Codex / Claude Code / Gemini auto-load it. Safe to edit — Owlie won't overwrite a file you've changed._
