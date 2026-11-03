# remotion

## Overview
Remotion video composition package providing MainComposition to render timed multi-beat video sequences with image Ken Burns pan/zoom effects, voiceover and background audio mixing, and customizable burned-in subtitles.

## Interface
- [Composition.tsx:MainComposition] React functional component (React.FC<MainCompositionProps>) rendering the Remotion video composition timeline.
- [Composition.tsx:MainCompositionProps] Component props interface defining beats (Beat[]), burnSubtitles (boolean), audioUrl (string), and subtitleStyle configuration.
- [Composition.tsx:Beat] Data contract interface representing an individual video beat containing id, text, duration in seconds, optional media URLs (clipUrl, imageUrl, videoUrl, audioUrl), and selectedVideo metadata.

## Invariants
- [Composition.tsx:beatsWithTiming] Duration in frames for each beat is clamped to a minimum of 1 frame (Math.max(1, Math.round(beat.duration * fps))).
- [Composition.tsx:beatsWithTiming] Timeline sequence is strictly continuous and gapless: each beat's startFrame equals the cumulative sum of all preceding beat frame durations.
- [Composition.tsx:isVideoAsset] Video assets take precedence over image assets if videoUrl is specified or if clipUrl ends with '.mp4' or '.webm'.
- [Composition.tsx:mediaUrl] Media URL resolution prioritizes videoUrl > clipUrl > imageUrl > selectedVideo.url > selectedVideo.thumbnail; falls back to dark solid background (#222) if absent.
- [Composition.tsx:zoomType] Image Ken Burns zoom direction deterministically alternates by beat index: even indices zoom in (1 -> 1.1), odd indices zoom out (1.1 -> 1).
- [Composition.tsx:panDir] Image Ken Burns pan direction cycles modulo 4: 0 = static, 1 = right (progress * 2), 2 = left (-progress * 2), 3 = down (progress * 2).
- [Composition.tsx:burnSubtitles] Subtitles are burned in only when burnSubtitles is true and beat.text is non-empty; position defaults to top 75% and horizontally centered.

## Side Effects
- [Composition.tsx:MainComposition] Mounts and executes Remotion React animation sequences, rendering DOM media elements (<Video>, <Img>, <Audio>, <AbsoluteFill>, <Sequence>) into the video canvas pipeline.
- [Composition.tsx:Img] Requests external or local media resources across the network or filesystem during Remotion canvas composition rendering.

## Verification
- Run: `pnpm test`
