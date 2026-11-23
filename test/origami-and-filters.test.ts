import { describe, it, expect } from 'vitest';
import {
  OrigamiLayout,
  SHORT_LAYOUTS,
  renderOrigamiLayout,
  CRTFilter,
  ShockwaveFilter,
  DisplacementFilter,
  RisoFilter,
  WoodblockFilter,
  getFilter,
  applyFilter,
  TheatreHeadlessTimeline,
  PROCEDURAL_SFX_CATALOG
} from '@/lib/engine/2d-studio';

describe('Origami Splits Engine', () => {
  it('correctly calculates single pane bounds for 1080x1920', () => {
    const layout = SHORT_LAYOUTS.single();
    const bounds = layout.getPaneBounds(0, 1080, 1920);
    expect(bounds).toEqual({
      x: 0,
      y: 0,
      w: 1080,
      h: 1920,
      cx: 540,
      cy: 960
    });
  });

  it('correctly calculates top/bottom split bounds', () => {
    const layout = SHORT_LAYOUTS.topBottom(0.5);
    const top = layout.getPaneBounds(0, 1080, 1920);
    const bottom = layout.getPaneBounds(1, 1080, 1920);

    expect(top).toEqual({
      x: 0,
      y: 0,
      w: 1080,
      h: 960,
      cx: 540,
      cy: 480
    });
    expect(bottom).toEqual({
      x: 0,
      y: 960,
      w: 1080,
      h: 960,
      cx: 540,
      cy: 1440
    });
  });

  it('correctly calculates 2x2 quad grid bounds', () => {
    const layout = SHORT_LAYOUTS.quadGrid();
    expect(layout.cells.length).toBe(4);

    const tl = layout.getPaneBounds(0, 1080, 1920);
    const tr = layout.getPaneBounds(1, 1080, 1920);
    const bl = layout.getPaneBounds(2, 1080, 1920);
    const br = layout.getPaneBounds(3, 1080, 1920);

    expect(tl?.w).toBe(540);
    expect(tl?.h).toBe(960);
    expect(tr?.x).toBe(540);
    expect(bl?.y).toBe(960);
    expect(br?.x).toBe(540);
    expect(br?.y).toBe(960);
  });

  it('supports dynamic pane splitting', () => {
    const layout = new OrigamiLayout();
    expect(layout.cells.length).toBe(1);

    const newCellIndex = layout.split(0, 'down', 0.5);
    expect(newCellIndex).toBe(1);
    expect(layout.cells.length).toBe(2);

    const top = layout.getPaneBounds(0, 1080, 1920);
    const bot = layout.getPaneBounds(1, 1080, 1920);
    expect(top?.h).toBe(960);
    expect(bot?.h).toBe(960);
  });

  it('safely renders layout onto canvas context without throwing', () => {
    const layout = SHORT_LAYOUTS.topBottom(0.5);
    const mockCtx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      clip: () => {},
      stroke: () => {},
      fill: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arcTo: () => {},
      rect: () => {},
      closePath: () => {},
      fillText: () => {},
      lineWidth: 1,
      strokeStyle: '',
      fillStyle: '',
      font: '',
    } as unknown as CanvasRenderingContext2D;

    let drawnPanes = 0;
    renderOrigamiLayout(
      mockCtx,
      1080,
      1920,
      layout,
      [
        () => { drawnPanes++; },
        () => { drawnPanes++; }
      ],
      { labels: ['FEED A', 'FEED B'] }
    );

    expect(drawnPanes).toBe(2);

    // Also verify null context guard
    expect(() => {
      renderOrigamiLayout(null as unknown as CanvasRenderingContext2D, 1080, 1920, layout, []);
    }).not.toThrow();
  });
});

describe('WebGL2 GPU Shader Filters', () => {
  it('instantiates filter classes cleanly', () => {
    const crt = new CRTFilter(1080, 1920);
    const shock = new ShockwaveFilter(1080, 1920);
    const disp = new DisplacementFilter(1080, 1920);
    const riso = new RisoFilter(1080, 1920);
    const wood = new WoodblockFilter(1080, 1920);

    expect(crt.width).toBe(1080);
    expect(shock.height).toBe(1920);
    expect(disp.width).toBe(1080);
    expect(riso.height).toBe(1920);
    expect(wood.width).toBe(1080);
  });

  it('safely gets filters through manager singleton cache', () => {
    const f1 = getFilter('crt', 1080, 1920);
    const f2 = getFilter('crt', 1080, 1920);
    expect(f1).toBe(f2); // singleton cached

    const shock = getFilter('shockwave', 1080, 1920);
    expect(shock).toBeInstanceOf(ShockwaveFilter);

    const fluid = getFilter('fluid', 1080, 1920);
    expect(fluid).toBeInstanceOf(DisplacementFilter);
  });

  it('safely runs applyFilter fallback without crashing', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;

    // In jsdom without hardware WebGL2 context, render() falls back cleanly to 2d copy
    expect(() => {
      applyFilter(canvas, 'crt', { curvature: 0.1 });
    }).not.toThrow();
  });
});

describe('Theatre.js Headless Timeline Engine', () => {
  it('registers objects and evaluates keyframe interpolation at exact timecodes', () => {
    const timeline = new TheatreHeadlessTimeline({
      projectId: 'ShortsProject',
      fps: 60,
      durationSeconds: 10.0
    });

    timeline.registerObject('hero', { x: 0, y: 0, scale: 1.0 });
    timeline.addKeyframe('hero', 'x', 0.0, 0);
    timeline.addKeyframe('hero', 'x', 2.0, 200);

    // Initial position
    timeline.seek(0.0);
    expect(timeline.getValue<{ x: number }>('hero').x).toBe(0);

    // Halfway (smooth cubic easing at t=1.0)
    timeline.seek(1.0);
    const midX = timeline.getValue<{ x: number }>('hero').x;
    expect(midX).toBe(100);

    // End of track
    timeline.seek(2.0);
    expect(timeline.getValue<{ x: number }>('hero').x).toBe(200);

    // Clamped past duration
    timeline.seek(5.0);
    expect(timeline.getValue<{ x: number }>('hero').x).toBe(200);
  });

  it('supports seekFrame() frame-accurate stepping', () => {
    const timeline = new TheatreHeadlessTimeline({
      projectId: 'FrameStepProject',
      fps: 30,
      durationSeconds: 5.0
    });

    timeline.registerObject('ball', { height: 100 });
    timeline.addKeyframe('ball', 'height', 0.0, 0);
    timeline.addKeyframe('ball', 'height', 1.0, 500);

    timeline.seekFrame(15, 30); // Exactly 0.5s
    expect(timeline.getValue<{ height: number }>('ball').height).toBe(250);
  });

  it('exports declarative timeline state', () => {
    const timeline = new TheatreHeadlessTimeline({
      projectId: 'ExportTest',
      durationSeconds: 8.0
    });

    timeline.registerObject('card', { opacity: 0 });
    timeline.addKeyframe('card', 'opacity', 0.0, 0);
    timeline.addKeyframe('card', 'opacity', 1.0, 1.0);

    const exported = timeline.exportTimelineState();
    expect(exported.projectId).toBe('ExportTest');
    expect(exported.objects).toBeDefined();
  });
});

describe('Procedural Audio DSP Synthesizer Suite', () => {
  it('exposes all 69 procedural physical modeling sound effects', () => {
    expect(PROCEDURAL_SFX_CATALOG.length).toBe(69);

    const names = PROCEDURAL_SFX_CATALOG.map((s) => s.name);
    // Classical foley
    expect(names).toContain('whoosh');
    expect(names).toContain('impact');
    expect(names).toContain('pop');
    expect(names).toContain('ding');
    // Organic materials
    expect(names).toContain('wood_crack');
    expect(names).toContain('timber_tear');
    expect(names).toContain('splash_big');
    // Crowd and vocal formants
    expect(names).toContain('oof');
    expect(names).toContain('hurrah');
    // Acoustic instruments
    expect(names).toContain('glock');
    expect(names).toContain('vibes');
    expect(names).toContain('brass_horn');
    expect(names).toContain('timpani');
  });

  it('validates each sound effect has a valid positive duration and description', () => {
    for (const item of PROCEDURAL_SFX_CATALOG) {
      expect(item.name).toBeTruthy();
      expect(item.dur).toBeGreaterThan(0);
      expect(item.desc.length).toBeGreaterThan(5);
    }
  });
});
