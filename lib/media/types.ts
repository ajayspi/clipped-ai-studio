/**
 * lib/media/types.ts
 *
 * Provider-neutral media contracts for the Clipped image/video pipeline.
 * Consumed by: fal-client, image-sources, media-selector, mission-orchestrator, Remotion.
 *
 * Design rules:
 *  - OmniRoute remains the only LLM gateway; these types are media-only.
 *  - Every asset retains provenance (provider, license, attribution, generated flag).
 *  - No GPU/local-model dependency -- this file describes the data layer only.
 */

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export type MediaProvider =
  | 'openverse'
  | 'pexels'
  | 'pixabay'
  | 'pollinations'
  | 'aihorde'
  | 'fal-ai';

export type MediaKind = 'image' | 'video';

// ---------------------------------------------------------------------------
// Core Contracts
// ---------------------------------------------------------------------------

/**
 * A fully resolved, provenance-bearing media asset.
 * imageUrl / videoUrl / selectedVideo on Scene remain populated for backward
 * compatibility; mediaAsset is the canonical richer representation.
 */
export interface MediaAsset {
  /** Stable provider-scoped identifier (e.g. "openverse-12345", "fal-req-abc"). */
  id: string;

  kind: MediaKind;

  provider: MediaProvider;

  /** Direct CDN or source URL of the full-resolution asset. */
  url: string;

  /** Lower-resolution preview URL (optional). */
  thumbnailUrl?: string;

  width?: number;
  height?: number;

  /** Duration in seconds -- only meaningful for video assets. */
  duration?: number;

  title?: string;

  /**
   * SPDX-style license string when provided by the source
   * (e.g. "CC BY", "CC0", "Pexels License").
   */
  license?: string;

  /**
   * Human-readable attribution string required by the license.
   * Must be preserved and rendered wherever the asset is displayed.
   */
  attribution?: string;

  /** Canonical page URL on the source platform (for attribution links). */
  sourceUrl?: string;

  /** true when the asset was AI-generated rather than found in a stock library. */
  generated: boolean;

  /** The generation prompt used, when the asset was AI-generated. */
  prompt?: string;
}

// ---------------------------------------------------------------------------
// fal.ai Queue Job Contract
// ---------------------------------------------------------------------------

export type FalJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

/**
 * Lifecycle record for an asynchronous fal.ai queue job.
 * Created by fal-client.submitAndWait() and consumed by media-selector.
 */
export interface MediaJob {
  /** fal.ai request_id from the queue submission response header. */
  requestId: string;

  provider: 'fal-ai';

  /** fal model identifier, e.g. "fal-ai/flux/dev" or "fal-ai/kling-video/v1". */
  model: string;

  status: FalJobStatus;

  /** Populated when status === 'completed'. */
  asset?: MediaAsset;

  /** Human-readable error from the fal response when status === 'failed'. */
  error?: string;
}

// ---------------------------------------------------------------------------
// fal.ai Client Options
// ---------------------------------------------------------------------------

/**
 * Parameters passed to fal-client.submitAndWait().
 * model and input are required; timeout/poll use sensible defaults.
 */
export interface FalSubmitOptions {
  /**
   * fal model path, e.g. "fal-ai/fast-sdxl" or "fal-ai/kling-video/v1/image-to-video".
   * Must be non-empty.
   */
  model: string;

  /**
   * Model-specific input payload (prompt, image_url, num_images, etc.).
   * Must be a non-empty object.
   */
  input: Record<string, unknown>;

  /**
   * Maximum wall-clock time to wait for a completed result before giving up.
   * Defaults to 90000 ms (90 s) inside the client.
   */
  timeoutMs?: number;

  /**
   * Interval between status polls.
   * Defaults to 2000 ms (2 s) inside the client.
   */
  pollIntervalMs?: number;
}

// ---------------------------------------------------------------------------
// Image Search Contract
// ---------------------------------------------------------------------------

/**
 * Query parameters for the ordered free image source search.
 * Consumed by image-sources.searchImages().
 */
export interface ImageSourceQuery {
  /** Plain-text search keywords. */
  query: string;

  /** Target aspect ratio -- used to bias width/height in results. */
  aspectRatio: '16:9' | '9:16' | '1:1';

  /**
   * Maximum number of results to return from each source.
   * Defaults to 5 inside image-sources.
   */
  limit?: number;
}
