// lib/engine/2d-studio/theatre-timeline.ts
// Headless Declarative Timeline Engine powered by Theatre.js
// Enables visual keyframing in studio UI and deterministic frame-by-frame seeking during headless rendering.

export interface TheatrePropertySchema {
  [key: string]: number | string | boolean;
}

export interface TheatreTimelineConfig {
  projectId: string;
  sheetId?: string;
  state?: Record<string, unknown>;
  fps?: number;
  durationSeconds?: number;
}

export interface KeyframeDefinition<T = number> {
  position: number; // time in seconds
  value: T;
  curve?: [number, number, number, number]; // bezier handles [x1, y1, x2, y2]
}

export class TheatreHeadlessTimeline {
  projectId: string;
  sheetId: string;
  fps: number;
  durationSeconds: number;
  currentTime: number = 0;

  private registeredObjects: Map<string, { schema: TheatrePropertySchema; values: TheatrePropertySchema }> = new Map();
  private keyframeTracks: Map<string, Map<string, KeyframeDefinition[]>> = new Map();
  private theatreSheet: unknown = null;

  constructor(config: TheatreTimelineConfig) {
    this.projectId = config.projectId;
    this.sheetId = config.sheetId || 'Scene 1';
    this.fps = config.fps || 60;
    this.durationSeconds = config.durationSeconds || 15.0;

    // Check if running in browser/headless DOM with Theatre.js loaded
    if (typeof window !== 'undefined' && (window as unknown as { Theatre?: { core?: unknown } }).Theatre?.core) {
      const core = (window as unknown as { Theatre: { core: { getProject: (id: string, opts?: unknown) => { sheet: (id: string) => unknown } } } }).Theatre.core;
      try {
        const project = core.getProject(this.projectId, config.state ? { state: config.state } : undefined);
        this.theatreSheet = project.sheet(this.sheetId);
      } catch {
        // Fall back gracefully to internal deterministic solver
        this.theatreSheet = null;
      }
    }
  }

  /**
   * Register an animatable object with default properties and optional keyframe tracks.
   */
  registerObject<T extends TheatrePropertySchema>(
    objectKey: string,
    defaultProps: T,
    tracks?: Partial<Record<keyof T, KeyframeDefinition[]>>
  ): void {
    this.registeredObjects.set(objectKey, {
      schema: { ...defaultProps },
      values: { ...defaultProps }
    });

    if (tracks) {
      const propTracks = new Map<string, KeyframeDefinition[]>();
      for (const [propName, kfs] of Object.entries(tracks)) {
        if (kfs) {
          propTracks.set(propName, [...kfs].sort((a, b) => a.position - b.position));
        }
      }
      this.keyframeTracks.set(objectKey, propTracks);
    }
  }

  /**
   * Add a keyframe to a registered property track.
   */
  addKeyframe(
    objectKey: string,
    property: string,
    positionSeconds: number,
    value: number
  ): void {
    let propMap = this.keyframeTracks.get(objectKey);
    if (!propMap) {
      propMap = new Map();
      this.keyframeTracks.set(objectKey, propMap);
    }

    let track = propMap.get(property);
    if (!track) {
      track = [];
      propMap.set(property, track);
    }

    track.push({ position: positionSeconds, value });
    track.sort((a, b) => a.position - b.position);
  }

  /**
   * Deterministic seek to an exact time in seconds.
   */
  seek(timeInSeconds: number): void {
    this.currentTime = Math.max(0, Math.min(this.durationSeconds, timeInSeconds));

    // If native Theatre.js sheet is attached, sync its sequence position
    if (this.theatreSheet && typeof (this.theatreSheet as { sequence?: { position: number } }).sequence === 'object') {
      (this.theatreSheet as { sequence: { position: number } }).sequence.position = this.currentTime;
    }

    // Evaluate interpolated property values
    for (const [objKey, objData] of this.registeredObjects.entries()) {
      const propMap = this.keyframeTracks.get(objKey);
      if (!propMap) continue;

      for (const [propName, keyframes] of propMap.entries()) {
        if (keyframes.length === 0) continue;

        if (this.currentTime <= keyframes[0].position) {
          objData.values[propName] = keyframes[0].value;
          continue;
        }

        const last = keyframes[keyframes.length - 1];
        if (this.currentTime >= last.position) {
          objData.values[propName] = last.value;
          continue;
        }

        // Interpolate between surrounding keyframes
        for (let i = 0; i < keyframes.length - 1; i++) {
          const k0 = keyframes[i];
          const k1 = keyframes[i + 1];
          if (this.currentTime >= k0.position && this.currentTime <= k1.position) {
            const span = k1.position - k0.position;
            const progress = span > 0 ? (this.currentTime - k0.position) / span : 0;
            // Smooth cubic easing by default
            const easedProgress = 3 * progress * progress - 2 * progress * progress * progress;
            objData.values[propName] = k0.value + (k1.value - k0.value) * easedProgress;
            break;
          }
        }
      }
    }
  }

  /**
   * Deterministic seek to integer frame index.
   */
  seekFrame(frameIndex: number, fps: number = this.fps): void {
    this.seek(frameIndex / fps);
  }

  /**
   * Read interpolated property value for an object.
   */
  getValue<T extends TheatrePropertySchema>(objectKey: string): T {
    const obj = this.registeredObjects.get(objectKey);
    if (!obj) {
      throw new Error(`TheatreHeadlessTimeline: Object "${objectKey}" is not registered.`);
    }
    return { ...obj.values } as T;
  }

  /**
   * Export declarative animation state to portable JSON.
   */
  exportTimelineState(): Record<string, unknown> {
    const exported: Record<string, unknown> = {
      projectId: this.projectId,
      sheetId: this.sheetId,
      fps: this.fps,
      durationSeconds: this.durationSeconds,
      objects: {} as Record<string, unknown>
    };

    for (const [objKey, objData] of this.registeredObjects.entries()) {
      const tracks: Record<string, KeyframeDefinition[]> = {};
      const propMap = this.keyframeTracks.get(objKey);
      if (propMap) {
        for (const [prop, kfs] of propMap.entries()) {
          tracks[prop] = [...kfs];
        }
      }
      (exported.objects as Record<string, unknown>)[objKey] = {
        defaultValues: objData.schema,
        tracks
      };
    }

    return exported;
  }
}
