/**
 * Fallback sample-clip catalog for dry-run / mock video generation.
 *
 * NOTE: this module never existed in git history — three engine importers
 * (mission-orchestrator, video-generator, whiteboard-orchestrator) reference
 * it, so it is defined here to keep them compiling. The URLs below are NOT
 * Mixkit downloads; they reuse the repo's own existing sample-background URLs
 * (same ones the reddit/trivia orchestrators already embed) so no unverified
 * external URL is introduced. Entries only need a stable `url` + orientation;
 * nothing fetches them in tests or dry runs.
 */

export type MixkitOrientation = 'vertical' | 'horizontal' | 'square';

export interface MixkitClip {
  id: string;
  url: string;
  orientation: MixkitOrientation;
  title?: string;
}

export const MIXKIT_CLIPS: MixkitClip[] = [
  {
    id: 'sample-portrait',
    url: 'https://storage.clipped.ai/gaming/subway-surfers-1.mp4',
    orientation: 'vertical',
    title: 'Sample portrait fallback',
  },
  {
    id: 'sample-landscape',
    url: 'https://storage.clipped.ai/gaming/gta-parkour-1.mp4',
    orientation: 'horizontal',
    title: 'Sample landscape fallback',
  },
  {
    id: 'sample-square',
    url: 'https://storage.clipped.ai/gaming/minecraft-parkour-1.mp4',
    orientation: 'square',
    title: 'Sample square fallback',
  },
];
