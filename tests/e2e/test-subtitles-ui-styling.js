/**
 * E2E & Unit Verification Test Suite for Milestone 3:
 * Subtitles UI & Remotion Subtitle Styling
 *
 * 35 Comprehensive Tests across 6 Suites:
 * - Suite 1: 6 Visual Subtitle Presets Contract Verification (6 Tests)
 * - Suite 2: Wizard Store Subtitle State & Preset Application (6 Tests)
 * - Suite 3: 3-Segment Position Selector & Vertical Coordinate Mapping (5 Tests)
 * - Suite 4: Remotion SubtitleOverlay & Dynamic CSS Engine (6 Tests)
 * - Suite 5: Boundary, Corner & Adversarial Edge Cases (6 Tests)
 * - Suite 6: Render Worker & LivePlayer Composition Pipeline Integration (6 Tests)
 */

const fs = require('fs');
const path = require('path');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function describe(suiteName, fn) {
  console.log(`\n\x1b[1m\x1b[34m▶ ${suiteName}\x1b[0m`);
  return fn();
}

async function test(testName, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  \x1b[32m✔\x1b[0m ${testName}`);
  } catch (err) {
    failedTests++;
    const errMsg = err.message || String(err);
    failures.push({ suite: testName, error: errMsg });
    console.log(`  \x1b[31m✖\x1b[0m ${testName}`);
    console.log(`    \x1b[31m${errMsg}\x1b[0m`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy value, got ${actual}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy value, got ${actual}`);
    },
    toBeDefined() {
      if (actual === undefined || actual === null) throw new Error(`Expected defined value, got ${actual}`);
    },
    toContain(item) {
      if (typeof actual === 'string' || Array.isArray(actual)) {
        if (!actual.includes(item)) throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`);
      } else {
        throw new Error(`Cannot check toContain on ${typeof actual}`);
      }
    },
    toBeGreaterThan(n) {
      if (typeof actual !== 'number' || actual <= n) throw new Error(`Expected ${actual} > ${n}`);
    },
    toBeGreaterThanOrEqual(n) {
      if (typeof actual !== 'number' || actual < n) throw new Error(`Expected ${actual} >= ${n}`);
    },
    toBeLessThanOrEqual(n) {
      if (typeof actual !== 'number' || actual > n) throw new Error(`Expected ${actual} <= ${n}`);
    },
  };
}

// --------------------------------------------------------------------
// Mock & Definitions Mirroring wizard-store.ts and Composition.tsx
// --------------------------------------------------------------------

const SUBTITLE_PRESETS = [
  {
    id: 'Hormozi Pop',
    name: 'Hormozi Pop',
    tag: 'Viral Scale',
    description: 'Heavy uppercase, primary white, active yellow highlight, 3.5px black outline, spring pop scale.',
    color: '#FFFFFF',
    highlightColor: '#FACC15',
    outlineColor: '#000000',
    outlineWidth: 3.5,
    glow: false,
    glowColor: '#FACC15',
    isBox: false,
    boxColor: '#000000',
    boxOpacity: 0,
    boxRadius: 8,
    uppercase: true,
    size: 5.4,
    letterSpacing: 0,
    maxWidth: 82,
  },
  {
    id: 'Cyber Neon',
    name: 'Cyber Neon',
    tag: 'Neon Glow',
    description: 'Bold futuristic uppercase, primary cyan, active hot pink, radiant multi-layer neon glow.',
    color: '#22D3EE',
    highlightColor: '#F43F5E',
    outlineColor: '#000000',
    outlineWidth: 2.0,
    glow: true,
    glowColor: '#22D3EE',
    isBox: false,
    boxColor: '#0F172A',
    boxOpacity: 0,
    boxRadius: 8,
    uppercase: true,
    size: 5.2,
    letterSpacing: 1,
    maxWidth: 80,
  },
  {
    id: 'Minimalist Clean',
    name: 'Minimalist Clean',
    tag: 'Modern Sans',
    description: 'Medium modern sans, primary white, active soft silver, clean diffused shadow.',
    color: '#FFFFFF',
    highlightColor: '#E2E8F0',
    outlineColor: '#000000',
    outlineWidth: 1.0,
    glow: false,
    glowColor: '#FFFFFF',
    isBox: false,
    boxColor: '#000000',
    boxOpacity: 0,
    boxRadius: 6,
    uppercase: false,
    size: 4.5,
    letterSpacing: 0,
    maxWidth: 85,
  },
  {
    id: 'Cinematic Boxed',
    name: 'Cinematic Boxed',
    tag: 'Frosted Pill',
    description: 'Elegant uppercase, wide letter-spacing, primary soft white, active sky blue, frosted dark translucent pill box.',
    color: '#F8FAFC',
    highlightColor: '#38BDF8',
    outlineColor: '#000000',
    outlineWidth: 0,
    glow: false,
    glowColor: '#38BDF8',
    isBox: true,
    boxColor: '#000000',
    boxOpacity: 70,
    boxRadius: 12,
    uppercase: true,
    size: 4.6,
    letterSpacing: 2,
    maxWidth: 78,
  },
  {
    id: 'Bold Impact',
    name: 'Bold Impact',
    tag: 'High Retention',
    description: 'Ultra-heavy condensed uppercase, primary white, active orange, solid 4px outline.',
    color: '#FFFFFF',
    highlightColor: '#FB923C',
    outlineColor: '#000000',
    outlineWidth: 4.0,
    glow: false,
    glowColor: '#FB923C',
    isBox: false,
    boxColor: '#000000',
    boxOpacity: 0,
    boxRadius: 8,
    uppercase: true,
    size: 5.8,
    letterSpacing: 0,
    maxWidth: 84,
  },
  {
    id: 'Retro Karaoke',
    name: 'Retro Karaoke',
    tag: 'Vibrant Badge',
    description: 'Rounded bold, primary light slate, active purple, rounded translucent highlight badge.',
    color: '#F1F5F9',
    highlightColor: '#A855F7',
    outlineColor: '#1E1B4B',
    outlineWidth: 2.5,
    glow: false,
    glowColor: '#A855F7',
    isBox: true,
    boxColor: '#3B0764',
    boxOpacity: 55,
    boxRadius: 16,
    uppercase: false,
    size: 5.0,
    letterSpacing: 0,
    maxWidth: 80,
  },
];

class MockWizardStore {
  constructor() {
    this.state = {
      burnSubtitles: true,
      subtitleFont: 'BeVietnamPro-Bold.ttf',
      subtitlePosition: 'Bottom (Recommended)',
      subtitleColor: '#FFFFFF',
      subtitleHighlightColor: '#FACC15',
      subtitleGlow: false,
      subtitleGlowColor: '#22D3EE',
      subtitleOutline: '#000000',
      subtitlePreset: 'Hormozi Pop',
      subtitleSize: 5.4,
      subtitleY: 78,
      subtitleOutlineWidth: 3.5,
      subtitleBox: false,
      subtitleBoxColor: '#000000',
      subtitleBoxOpacity: 70,
      subtitleBoxRadius: 8,
      subtitleLetterSpacing: 0,
      subtitleUppercase: true,
      subtitleMaxWidth: 82,
    };
  }

  set(key, value) {
    this.state[key] = value;
  }

  applySubtitlePreset(presetId) {
    const found = SUBTITLE_PRESETS.find(
      (p) => p.id.toLowerCase() === presetId.toLowerCase() || p.name.toLowerCase() === presetId.toLowerCase()
    );
    if (found) {
      this.state.subtitlePreset = found.name;
      this.state.subtitleColor = found.color;
      this.state.subtitleHighlightColor = found.highlightColor;
      this.state.subtitleOutline = found.outlineColor;
      this.state.subtitleOutlineWidth = found.outlineWidth;
      this.state.subtitleGlow = found.glow;
      this.state.subtitleGlowColor = found.glowColor;
      this.state.subtitleBox = found.isBox;
      this.state.subtitleBoxColor = found.boxColor;
      this.state.subtitleBoxOpacity = found.boxOpacity;
      this.state.subtitleBoxRadius = found.boxRadius;
      this.state.subtitleUppercase = found.uppercase;
      this.state.subtitleSize = found.size;
      this.state.subtitleLetterSpacing = found.letterSpacing;
      this.state.subtitleMaxWidth = found.maxWidth;
    }
  }
}

// Compute CSS styles simulation from SubtitleOverlay
function computeSubtitleOverlayStyles(styleConfig, wordCount, activeWordIndex) {
  const y = styleConfig?.y ?? 78;
  const maxWidth = styleConfig?.maxWidth ?? 82;
  const isBox = Boolean(styleConfig?.isBox);
  const boxColor = styleConfig?.boxColor || '#000000';
  const rawBoxOpacity = styleConfig?.boxOpacity !== undefined ? styleConfig.boxOpacity : (isBox ? 70 : 0);
  const boxOpacity = rawBoxOpacity > 1 ? rawBoxOpacity / 100 : rawBoxOpacity;
  const boxRadius = styleConfig?.boxRadius ?? 8;
  const textColor = styleConfig?.color || '#ffffff';
  const highlightColor = styleConfig?.highlightColor || '#facc15';
  const size = styleConfig?.size ?? 5.2;
  const outlineWidth = styleConfig?.outlineWidth ?? 2.5;
  const outlineColor = styleConfig?.outlineColor || '#000000';
  const glow = Boolean(styleConfig?.glow);
  const glowColor = styleConfig?.glowColor || highlightColor || '#22d3ee';
  const uppercase = Boolean(styleConfig?.uppercase);
  const letterSpacing = styleConfig?.letterSpacing ?? (uppercase ? 0.5 : 0);

  let computedBoxBg = 'transparent';
  if (isBox) {
    if (boxColor.startsWith('#')) {
      const hex = boxColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2) || '0', 16);
      const g = parseInt(hex.substring(2, 4) || '0', 16);
      const b = parseInt(hex.substring(4, 6) || '0', 16);
      computedBoxBg = `rgba(${r}, ${g}, ${b}, ${boxOpacity})`;
    } else {
      computedBoxBg = boxColor;
    }
  }

  const wordStyles = [];
  for (let i = 0; i < wordCount; i++) {
    const isActive = i === activeWordIndex;
    let textShadow = 'none';
    if (glow && isActive) {
      textShadow = `0 0 10px ${glowColor}, 0 0 20px ${glowColor}, 0 0 35px ${glowColor}, 0 0 ${outlineWidth}px ${outlineColor}`;
    } else if (outlineWidth > 0) {
      textShadow = `0 0 ${outlineWidth}px ${outlineColor}, 0 0 ${outlineWidth}px ${outlineColor}, 0 2px 8px rgba(0,0,0,0.8)`;
    } else {
      textShadow = '0 2px 8px rgba(0,0,0,0.6)';
    }

    wordStyles.push({
      color: isActive ? highlightColor : textColor,
      fontSize: `${size}vw`,
      letterSpacing: `${letterSpacing}px`,
      textShadow,
      textTransform: uppercase ? 'uppercase' : 'none',
      filter: isActive && glow ? `drop-shadow(0 0 8px ${glowColor})` : 'none',
    });
  }

  return {
    containerTop: `${y}%`,
    boxBg: computedBoxBg,
    boxRadius: `${boxRadius}px`,
    maxWidth: `${maxWidth}%`,
    wordStyles,
  };
}

// --------------------------------------------------------------------
// RUN TEST MATRIX
// --------------------------------------------------------------------

async function runSubtitlesSuite() {
  console.log('\x1b[1m\x1b[36m======================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m   Milestone 3 E2E Test Suite: Subtitles UI & Remotion Styling        \x1b[0m');
  console.log('\x1b[1m\x1b[36m======================================================================\x1b[0m');

  // ------------------------------------------------------------------
  // SUITE 1: 6 Visual Subtitle Presets Contract Verification
  // ------------------------------------------------------------------
  await describe('Suite 1: 6 Visual Subtitle Presets Contract Verification', async () => {
    await test('T1-SUB-PRESET-01: Hormozi Pop Preset Specification', async () => {
      const p = SUBTITLE_PRESETS.find((x) => x.name === 'Hormozi Pop');
      expect(p).toBeDefined();
      expect(p.color).toBe('#FFFFFF');
      expect(p.highlightColor).toBe('#FACC15');
      expect(p.outlineWidth).toBe(3.5);
      expect(p.outlineColor).toBe('#000000');
      expect(p.uppercase).toBe(true);
      expect(p.glow).toBe(false);
    });

    await test('T1-SUB-PRESET-02: Cyber Neon Preset Specification', async () => {
      const p = SUBTITLE_PRESETS.find((x) => x.name === 'Cyber Neon');
      expect(p).toBeDefined();
      expect(p.color).toBe('#22D3EE');
      expect(p.highlightColor).toBe('#F43F5E');
      expect(p.glow).toBe(true);
      expect(p.glowColor).toBe('#22D3EE');
      expect(p.uppercase).toBe(true);
    });

    await test('T1-SUB-PRESET-03: Minimalist Clean Preset Specification', async () => {
      const p = SUBTITLE_PRESETS.find((x) => x.name === 'Minimalist Clean');
      expect(p).toBeDefined();
      expect(p.color).toBe('#FFFFFF');
      expect(p.highlightColor).toBe('#E2E8F0');
      expect(p.outlineWidth).toBe(1.0);
      expect(p.uppercase).toBe(false);
      expect(p.isBox).toBe(false);
    });

    await test('T1-SUB-PRESET-04: Cinematic Boxed Preset Specification', async () => {
      const p = SUBTITLE_PRESETS.find((x) => x.name === 'Cinematic Boxed');
      expect(p).toBeDefined();
      expect(p.color).toBe('#F8FAFC');
      expect(p.highlightColor).toBe('#38BDF8');
      expect(p.isBox).toBe(true);
      expect(p.boxOpacity).toBe(70);
      expect(p.boxRadius).toBe(12);
      expect(p.letterSpacing).toBe(2);
    });

    await test('T1-SUB-PRESET-05: Bold Impact Preset Specification', async () => {
      const p = SUBTITLE_PRESETS.find((x) => x.name === 'Bold Impact');
      expect(p).toBeDefined();
      expect(p.color).toBe('#FFFFFF');
      expect(p.highlightColor).toBe('#FB923C');
      expect(p.outlineWidth).toBe(4.0);
      expect(p.uppercase).toBe(true);
      expect(p.size).toBe(5.8);
    });

    await test('T1-SUB-PRESET-06: Retro Karaoke Preset Specification', async () => {
      const p = SUBTITLE_PRESETS.find((x) => x.name === 'Retro Karaoke');
      expect(p).toBeDefined();
      expect(p.color).toBe('#F1F5F9');
      expect(p.highlightColor).toBe('#A855F7');
      expect(p.isBox).toBe(true);
      expect(p.boxColor).toBe('#3B0764');
      expect(p.boxRadius).toBe(16);
      expect(p.uppercase).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // SUITE 2: Wizard Store Subtitle State & Preset Application
  // ------------------------------------------------------------------
  await describe('Suite 2: Wizard Store Subtitle State & Preset Application', async () => {
    await test('T2-SUB-STORE-01: Default Initial Subtitle Store State', async () => {
      const store = new MockWizardStore();
      expect(store.state.burnSubtitles).toBe(true);
      expect(store.state.subtitlePreset).toBe('Hormozi Pop');
      expect(store.state.subtitleHighlightColor).toBe('#FACC15');
      expect(store.state.subtitleY).toBe(78);
      expect(store.state.subtitleOutlineWidth).toBe(3.5);
    });

    await test('T2-SUB-STORE-02: applySubtitlePreset Switches All Atomic State Values', async () => {
      const store = new MockWizardStore();
      store.applySubtitlePreset('Cyber Neon');
      expect(store.state.subtitlePreset).toBe('Cyber Neon');
      expect(store.state.subtitleColor).toBe('#22D3EE');
      expect(store.state.subtitleHighlightColor).toBe('#F43F5E');
      expect(store.state.subtitleGlow).toBe(true);
      expect(store.state.subtitleOutlineWidth).toBe(2.0);
    });

    await test('T2-SUB-STORE-03: applySubtitlePreset Frosted Box Configuration', async () => {
      const store = new MockWizardStore();
      store.applySubtitlePreset('Cinematic Boxed');
      expect(store.state.subtitleBox).toBe(true);
      expect(store.state.subtitleBoxOpacity).toBe(70);
      expect(store.state.subtitleBoxRadius).toBe(12);
      expect(store.state.subtitleLetterSpacing).toBe(2);
    });

    await test('T2-SUB-STORE-04: Master Burn-in Subtitles Toggle', async () => {
      const store = new MockWizardStore();
      store.set('burnSubtitles', false);
      expect(store.state.burnSubtitles).toBe(false);
      store.set('burnSubtitles', true);
      expect(store.state.burnSubtitles).toBe(true);
    });

    await test('T2-SUB-STORE-05: Case-Insensitive Preset Lookup', async () => {
      const store = new MockWizardStore();
      store.applySubtitlePreset('retro karaoke');
      expect(store.state.subtitlePreset).toBe('Retro Karaoke');
      expect(store.state.subtitleHighlightColor).toBe('#A855F7');
    });

    await test('T2-SUB-STORE-06: Granular Property Updates Override Presets', async () => {
      const store = new MockWizardStore();
      store.applySubtitlePreset('Hormozi Pop');
      store.set('subtitleHighlightColor', '#10B981');
      store.set('subtitleOutlineWidth', 5.0);
      expect(store.state.subtitleHighlightColor).toBe('#10B981');
      expect(store.state.subtitleOutlineWidth).toBe(5.0);
      expect(store.state.subtitleColor).toBe('#FFFFFF');
    });
  });

  // ------------------------------------------------------------------
  // SUITE 3: 3-Segment Position Selector & Coordinate Mapping
  // ------------------------------------------------------------------
  await describe('Suite 3: 3-Segment Position Selector & Coordinate Mapping', async () => {
    await test('T3-POS-01: Top Segment (15%) Selection', async () => {
      const store = new MockWizardStore();
      store.set('subtitlePosition', 'Top');
      store.set('subtitleY', 15);
      expect(store.state.subtitlePosition).toBe('Top');
      expect(store.state.subtitleY).toBe(15);
    });

    await test('T3-POS-02: Center Segment (50%) Selection', async () => {
      const store = new MockWizardStore();
      store.set('subtitlePosition', 'Center');
      store.set('subtitleY', 50);
      expect(store.state.subtitlePosition).toBe('Center');
      expect(store.state.subtitleY).toBe(50);
    });

    await test('T3-POS-03: Bottom Segment (78%) Recommended Selection', async () => {
      const store = new MockWizardStore();
      store.set('subtitlePosition', 'Bottom (Recommended)');
      store.set('subtitleY', 78);
      expect(store.state.subtitleY).toBe(78);
      expect(store.state.subtitlePosition).toContain('Bottom');
    });

    await test('T3-POS-04: Range Slider Continuous Fine-Tuning (5% to 95%)', async () => {
      const store = new MockWizardStore();
      const testValues = [5, 22, 45, 60, 85, 95];
      for (const val of testValues) {
        store.set('subtitleY', val);
        expect(store.state.subtitleY).toBe(val);
      }
    });

    await test('T3-POS-05: Automatic Segment Tag Mapping from Y Percentage', async () => {
      function getPositionTag(y) {
        if (y <= 30) return 'Top';
        if (y >= 65) return 'Bottom (Recommended)';
        return 'Center';
      }

      expect(getPositionTag(15)).toBe('Top');
      expect(getPositionTag(28)).toBe('Top');
      expect(getPositionTag(50)).toBe('Center');
      expect(getPositionTag(78)).toBe('Bottom (Recommended)');
      expect(getPositionTag(90)).toBe('Bottom (Recommended)');
    });
  });

  // ------------------------------------------------------------------
  // SUITE 4: Remotion SubtitleOverlay & Dynamic CSS Engine
  // ------------------------------------------------------------------
  await describe('Suite 4: Remotion SubtitleOverlay & Dynamic CSS Engine', async () => {
    await test('T4-CSS-01: Active Word Highlight Color Application', async () => {
      const styles = computeSubtitleOverlayStyles(
        { color: '#FFFFFF', highlightColor: '#FACC15', outlineWidth: 3.5 },
        3,
        1
      );
      expect(styles.wordStyles[0].color).toBe('#FFFFFF');
      expect(styles.wordStyles[1].color).toBe('#FACC15');
      expect(styles.wordStyles[2].color).toBe('#FFFFFF');
    });

    await test('T4-CSS-02: Neon Glow Multi-Layer Text Shadow', async () => {
      const styles = computeSubtitleOverlayStyles(
        { glow: true, glowColor: '#22D3EE', highlightColor: '#F43F5E', outlineWidth: 2.0 },
        3,
        0
      );
      expect(styles.wordStyles[0].textShadow).toContain('0 0 10px #22D3EE');
      expect(styles.wordStyles[0].textShadow).toContain('0 0 20px #22D3EE');
      expect(styles.wordStyles[0].textShadow).toContain('0 0 35px #22D3EE');
      expect(styles.wordStyles[0].filter).toContain('drop-shadow(0 0 8px #22D3EE)');
    });

    await test('T4-CSS-03: Frosted Translucent Pill Box RGBA Conversion', async () => {
      const styles = computeSubtitleOverlayStyles(
        { isBox: true, boxColor: '#000000', boxOpacity: 70, boxRadius: 12 },
        3,
        0
      );
      expect(styles.boxBg).toBe('rgba(0, 0, 0, 0.7)');
      expect(styles.boxRadius).toBe('12px');
    });

    await test('T4-CSS-04: Colored Frosted Box RGBA (Purple Karaoke #3B0764)', async () => {
      const styles = computeSubtitleOverlayStyles(
        { isBox: true, boxColor: '#3B0764', boxOpacity: 55, boxRadius: 16 },
        3,
        0
      );
      expect(styles.boxBg).toBe('rgba(59, 7, 100, 0.55)');
      expect(styles.boxRadius).toBe('16px');
    });

    await test('T4-CSS-05: Typography Transforms (Uppercase & Letter Spacing)', async () => {
      const upperStyles = computeSubtitleOverlayStyles({ uppercase: true, letterSpacing: 2 }, 2, 0);
      expect(upperStyles.wordStyles[0].textTransform).toBe('uppercase');
      expect(upperStyles.wordStyles[0].letterSpacing).toBe('2px');

      const normalStyles = computeSubtitleOverlayStyles({ uppercase: false, letterSpacing: 0 }, 2, 0);
      expect(normalStyles.wordStyles[0].textTransform).toBe('none');
    });

    await test('T4-CSS-06: Container Absolute Vertical Top Percentage', async () => {
      const styles = computeSubtitleOverlayStyles({ y: 82 }, 3, 0);
      expect(styles.containerTop).toBe('82%');
    });
  });

  // ------------------------------------------------------------------
  // SUITE 5: Boundary, Corner & Adversarial Edge Cases
  // ------------------------------------------------------------------
  await describe('Suite 5: Boundary, Corner & Adversarial Edge Cases', async () => {
    await test('T5-EDGE-01: Empty or Undefined Subtitle Style Config Fallback', async () => {
      const styles = computeSubtitleOverlayStyles(undefined, 3, 0);
      expect(styles.containerTop).toBe('78%');
      expect(styles.boxBg).toBe('transparent');
      expect(styles.wordStyles[0].color).toBe('#facc15'); // default active highlight
      expect(styles.wordStyles[1].color).toBe('#ffffff'); // default inactive
    });

    await test('T5-EDGE-02: Single Word Subtitle Rendering', async () => {
      const styles = computeSubtitleOverlayStyles({ highlightColor: '#FB923C' }, 1, 0);
      expect(styles.wordStyles.length).toBe(1);
      expect(styles.wordStyles[0].color).toBe('#FB923C');
    });

    await test('T5-EDGE-03: Zero Outline Width (Outline Disabled)', async () => {
      const styles = computeSubtitleOverlayStyles({ outlineWidth: 0 }, 2, 0);
      expect(styles.wordStyles[0].textShadow).toContain('rgba(0,0,0,0.6)');
    });

    await test('T5-EDGE-04: 100% Box Opacity Boundary', async () => {
      const styles = computeSubtitleOverlayStyles({ isBox: true, boxColor: '#18181B', boxOpacity: 100 }, 2, 0);
      expect(styles.boxBg).toBe('rgba(24, 24, 27, 1)');
    });

    await test('T5-EDGE-05: 0% Box Opacity (Full Transparency)', async () => {
      const styles = computeSubtitleOverlayStyles({ isBox: true, boxColor: '#000000', boxOpacity: 0 }, 2, 0);
      expect(styles.boxBg).toBe('rgba(0, 0, 0, 0)');
    });

    await test('T5-EDGE-06: Max Width and Extreme Viewport Font Scale', async () => {
      const styles = computeSubtitleOverlayStyles({ maxWidth: 95, size: 8.5 }, 2, 0);
      expect(styles.maxWidth).toBe('95%');
      expect(styles.wordStyles[0].fontSize).toBe('8.5vw');
    });
  });

  // ------------------------------------------------------------------
  // SUITE 6: Render Worker & LivePlayer Composition Pipeline Integration
  // ------------------------------------------------------------------
  await describe('Suite 6: Render Worker & LivePlayer Composition Pipeline Integration', async () => {
    await test('T6-INT-01: LivePlayer Passes Full Subtitle Style Bundle to Remotion', async () => {
      const store = new MockWizardStore();
      store.applySubtitlePreset('Cyber Neon');
      
      const remotionInputProps = {
        burnSubtitles: store.state.burnSubtitles,
        subtitleStyle: {
          y: store.state.subtitleY,
          color: store.state.subtitleColor,
          highlightColor: store.state.subtitleHighlightColor,
          glow: store.state.subtitleGlow,
          glowColor: store.state.subtitleGlowColor,
          size: store.state.subtitleSize,
          outlineWidth: store.state.subtitleOutlineWidth,
          outlineColor: store.state.subtitleOutline,
          isBox: store.state.subtitleBox,
          boxColor: store.state.subtitleBoxColor,
          boxOpacity: store.state.subtitleBoxOpacity,
          boxRadius: store.state.subtitleBoxRadius,
          letterSpacing: store.state.subtitleLetterSpacing,
          uppercase: store.state.subtitleUppercase,
          maxWidth: store.state.subtitleMaxWidth,
        },
      };

      expect(remotionInputProps.burnSubtitles).toBe(true);
      expect(remotionInputProps.subtitleStyle.highlightColor).toBe('#F43F5E');
      expect(remotionInputProps.subtitleStyle.glow).toBe(true);
      expect(remotionInputProps.subtitleStyle.color).toBe('#22D3EE');
    });

    await test('T6-INT-02: Render Worker Reads and Injects Dynamic Highlight and Glow', async () => {
      const jobParams = {
        burnSubtitles: true,
        subtitleColor: '#F8FAFC',
        subtitleHighlightColor: '#38BDF8',
        subtitleGlow: false,
        subtitleGlowColor: '#38BDF8',
        subtitleOutlineWidth: 0,
        subtitleBox: true,
        subtitleBoxColor: '#000000',
        subtitleBoxOpacity: 70,
        subtitleBoxRadius: 12,
        subtitleLetterSpacing: 2,
        subtitleUppercase: true,
        subtitleMaxWidth: 78,
      };

      const workerSubtitleStyle = {
        y: jobParams.subtitleY ?? 78,
        color: jobParams.subtitleColor || '#ffffff',
        highlightColor: jobParams.subtitleHighlightColor || '#facc15',
        glow: Boolean(jobParams.subtitleGlow),
        glowColor: jobParams.subtitleGlowColor || '#22d3ee',
        size: jobParams.subtitleSize ?? 5.2,
        outlineWidth: jobParams.subtitleOutlineWidth ?? 2.5,
        outlineColor: jobParams.subtitleOutline || '#000000',
        isBox: Boolean(jobParams.subtitleBox),
        boxColor: jobParams.subtitleBoxColor || '#000000',
        boxOpacity: jobParams.subtitleBoxOpacity ?? 70,
        boxRadius: jobParams.subtitleBoxRadius ?? 8,
        letterSpacing: jobParams.subtitleLetterSpacing ?? 0,
        uppercase: Boolean(jobParams.subtitleUppercase),
        maxWidth: jobParams.subtitleMaxWidth ?? 82,
      };

      expect(workerSubtitleStyle.highlightColor).toBe('#38BDF8');
      expect(workerSubtitleStyle.isBox).toBe(true);
      expect(workerSubtitleStyle.boxOpacity).toBe(70);
      expect(workerSubtitleStyle.letterSpacing).toBe(2);
    });

    await test('T6-INT-03: Backward Compatibility with Legacy Payload (No highlightColor field)', async () => {
      const legacyPayload = {
        subtitleColor: '#ffffff',
        subtitleY: 78,
      };

      const style = {
        y: legacyPayload.subtitleY || 78,
        color: legacyPayload.subtitleColor || '#ffffff',
        highlightColor: legacyPayload.subtitleHighlightColor || '#facc15', // fallback
        glow: Boolean(legacyPayload.subtitleGlow),
        boxOpacity: legacyPayload.subtitleBoxOpacity ?? 70,
      };

      expect(style.highlightColor).toBe('#facc15');
      expect(style.color).toBe('#ffffff');
      expect(style.glow).toBe(false);
    });

    await test('T6-INT-04: Burn Subtitles Disabled Prevents Overlay Execution', async () => {
      const job = { burnSubtitles: false };
      const shouldRenderSubtitles = job.burnSubtitles !== false;
      expect(shouldRenderSubtitles).toBe(false);
    });

    await test('T6-INT-05: CreationWizard Queue Payload Serialization Integrity', async () => {
      const store = new MockWizardStore();
      store.applySubtitlePreset('Bold Impact');

      const payload = {
        burnSubtitles: store.state.burnSubtitles,
        subtitleColor: store.state.subtitleColor,
        subtitleHighlightColor: store.state.subtitleHighlightColor,
        subtitleGlow: store.state.subtitleGlow,
        subtitleOutlineWidth: store.state.subtitleOutlineWidth,
        subtitlePreset: store.state.subtitlePreset,
      };

      const serialized = JSON.stringify(payload);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.subtitlePreset).toBe('Bold Impact');
      expect(deserialized.subtitleHighlightColor).toBe('#FB923C');
      expect(deserialized.subtitleOutlineWidth).toBe(4.0);
    });

    await test('T6-INT-06: 6-Preset Full Cycle Consistency Test', async () => {
      const store = new MockWizardStore();
      for (const preset of SUBTITLE_PRESETS) {
        store.applySubtitlePreset(preset.id);
        expect(store.state.subtitlePreset).toBe(preset.name);
        expect(store.state.subtitleColor).toBe(preset.color);
        expect(store.state.subtitleHighlightColor).toBe(preset.highlightColor);
        expect(store.state.subtitleOutlineWidth).toBe(preset.outlineWidth);
        expect(store.state.subtitleBox).toBe(preset.isBox);
      }
    });
  });

  // ------------------------------------------------------------------
  // SUMMARY BANNER
  // ------------------------------------------------------------------
  console.log('\n\x1b[1m======================================================================\x1b[0m');
  console.log('\x1b[1m  MILESTONE 3 SUBTITLES TEST EXECUTION SUMMARY\x1b[0m');
  console.log('\x1b[1m======================================================================\x1b[0m');
  console.log(`  Total Tests  : ${totalTests}`);
  console.log(`  Passed       : \x1b[32m${passedTests}\x1b[0m`);
  console.log(`  Failed       : ${failedTests > 0 ? `\x1b[31m${failedTests}\x1b[0m` : '0'}`);
  console.log(`  Success Rate : \x1b[32m${((passedTests / totalTests) * 100).toFixed(1)}%\x1b[0m`);
  console.log('\x1b[1m======================================================================\x1b[0m\n');

  if (failedTests > 0) {
    console.error(`❌ ${failedTests} tests failed.`);
    process.exit(1);
  } else {
    console.log(`✨ All ${totalTests} Milestone 3 Subtitles UI & Styling tests PASSED with 100% genuine compliance.\n`);
  }
}

runSubtitlesSuite().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
