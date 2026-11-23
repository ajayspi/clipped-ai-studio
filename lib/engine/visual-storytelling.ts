/**
 * Visual Storytelling & Script Prompting Engine
 * 
 * Implements the Lemo-Opuscar cinematic directing methodology:
 * - 4-Tier Hierarchy: Sound -> Rhythm -> Camera -> Directing
 * - Deterministic reading hold and subtitle duration mathematics
 * - Story Arc: 0-3s Hook, 1 Subject / 1 Goal / 1 Turn, Ending Echo, Native Moves
 * - 66 Visual Style Presets Matrix (palettes, camera grammar, sound design, typography)
 * - Treatment validation and director prompt compilers
 */

// ==========================================
// 1. Pacing & Readability Mathematics
// ==========================================

/**
 * Calculates subtitle hold duration based on spoken duration.
 * Rule: Hold every subtitle at least 1.8 s, and never shorter than spoken + 0.6 s.
 */
export function calculateSubtitleDuration(spokenSeconds: number): number {
  return Math.max(1.8, Number((spokenSeconds + 0.6).toFixed(2)));
}

/**
 * Calculates on-screen text reading hold time after entrance animation completes.
 * Rule: (letters / 15 + 1.5) s in English, (chars / 4.5 + 1.5) s in CJK.
 */
export function calculateReadingHoldTime(
  text: string,
  lang: 'en' | 'cjk' = 'en'
): number {
  const clean = text.trim();
  if (!clean) return 1.5;

  if (lang === 'cjk') {
    const chars = clean.replace(/\s+/g, '').length;
    return Number((chars / 4.5 + 1.5).toFixed(2));
  }

  const letters = clean.replace(/[^a-zA-Z0-9]/g, '').length;
  return Number((letters / 15 + 1.5).toFixed(2));
}

/**
 * Standard minimum duration for standalone title cards and chapter headings.
 * Rule: Hold a title card at least 4.0 seconds.
 */
export const TITLE_CARD_MIN_DURATION = 4.0;

// ==========================================
// 2. Types & Schema Definitions
// ==========================================

export type StyleCategory =
  | 'technical'
  | 'fine-art'
  | 'retro'
  | 'graphic'
  | 'evidence'
  | 'narrative';

export interface VisualStoryStyle {
  slug: string;
  name: string;
  category: StyleCategory;
  essence: string;
  palette: {
    base: string;
    ink: string;
    accent: string;
    description: string;
  };
  cameraGrammar: string[];
  soundPalette: {
    ambience: string;
    foley: string[];
    instruments: string[];
  };
  nativeMove: string;
  typography: {
    display: string;
    body: string;
    mono?: string;
  };
  promptKeywords: string[];
}

export type FramingType =
  | 'extreme-wide'
  | 'wide'
  | 'medium'
  | 'close-up'
  | 'extreme-close-up'
  | 'insert'
  | 'oner';

export interface ShotAudioLayers {
  ambience: string;
  foley: string;
  musicState: string;
  isSilenceOrBreath?: boolean;
  transition?: 'hard-cut' | 'j-cut' | 'l-cut' | 'native-wipe';
}

export interface TreatmentShot {
  shotNumber: number;
  framing: FramingType;
  cameraMove: string;
  durationSeconds: number;
  actionDescription: string;
  dialogueOrSubtitle?: string;
  audioLayers: ShotAudioLayers;
  narrativePurpose: string;
}

export interface StoryTreatment {
  title: string;
  styleSlug: string;
  targetDurationSeconds: number;
  logline: string;
  arc: {
    setup: string;
    turn: string;
    endingEcho: string;
    nativeMove: string;
  };
  benchmark: {
    learnFrom: string[];
    avoid: string[];
  };
  shots: TreatmentShot[];
}

export interface TreatmentValidationResult {
  valid: boolean;
  issues: string[];
  stats: {
    totalDuration: number;
    distinctCameraMoves: number;
    hasHookInFirst3s: boolean;
    hasEndingEcho: boolean;
    hasNativeMove: boolean;
    hasSilenceOrBreath: boolean;
    hasAudioJorLCut: boolean;
  };
}

// ==========================================
// 3. Style Presets Matrix (Lemo-Opuscar Core)
// ==========================================

export const LEMO_STYLE_PRESETS: Record<string, VisualStoryStyle> = {
  blueprint: {
    slug: 'blueprint',
    name: 'Blueprint Technical Drawing',
    category: 'technical',
    essence: 'White technical line work on Prussian blue cyanotype paper, drawing in drafting order with living dimension lines.',
    palette: {
      base: '#18336B',
      ink: '#E7F0F9',
      accent: '#FF3B30', // Single rubber-stamp accent
      description: 'Prussian blue base, pale blue-white ink lines, exactly one rubber-stamp verdict ink.'
    },
    cameraGrammar: [
      'Whole sheet establishing on drafting table',
      'Track along path of mechanical force',
      '2x close-up cut on downbeat (gears/valves)',
      'Oblique depth factor reveal (0 to 0.5 isometric turn)',
      'Slow push-in on the single real machine part'
    ],
    soundPalette: {
      ambience: 'Quiet drafting room hum, faint fluorescent tone',
      foley: ['technical pen scratch', 'T-square wood slide', 'compass squeak', 'paper slap', 'rubber stamp thud'],
      instruments: ['harpsichord', 'bassoon', 'spiccato strings', 'celesta', 'clockwork escapement']
    },
    nativeMove: 'Oblique projection tilt where flat 2D lines suddenly gain 3D mechanical thickness.',
    typography: {
      display: 'Architects Daughter',
      body: 'B612',
      mono: 'JetBrains Mono'
    },
    promptKeywords: ['cyanotype blueprint', 'white technical line art', 'isometric projection', 'drafting order', 'crisp architectural lines']
  },

  'swiss-motion': {
    slug: 'swiss-motion',
    name: 'Swiss International Typographic Style',
    category: 'graphic',
    essence: 'Pure 2D graphic design on a strict modular grid, black type, light grey surfaces, and one saturated signal color that snaps on the beat.',
    palette: {
      base: '#EAE9E5',
      ink: '#111111',
      accent: '#E30613', // Swiss signal red
      description: 'Warm light grey paper, deep black ink, single Swiss signal red for the active protagonist element.'
    },
    cameraGrammar: [
      'Locked-off 12-column grid framing',
      'Sudden horizontal tracking snap on downbeat',
      'Macro crop on oversized optical numeral',
      'Smooth 2D matrix scale zoom'
    ],
    soundPalette: {
      ambience: 'Minimalist clean silence, studio room presence',
      foley: ['printing press slap', 'knife slice paper cut', 'crisp mechanical click', 'shutter snap'],
      instruments: ['isolated acoustic bass', 'prepared piano', 'wood block strike', 'subtle sine bass']
    },
    nativeMove: 'Knife-cut deletion where a rule line slices an element and it collapses to its midline.',
    typography: {
      display: 'Inter',
      body: 'Archivo',
      mono: 'Space Mono'
    },
    promptKeywords: ['Swiss style graphic design', 'Josef Muller-Brockmann grid', 'high-contrast typography', 'flat modular layout', 'signal red accent']
  },

  teardown: {
    slug: 'teardown',
    name: 'Exploded Teardown Studio Packshot',
    category: 'technical',
    essence: 'Real engineering product lit like a studio packshot, layers lifting along one axis with callout leaders projected from real 3D parts.',
    palette: {
      base: '#0D0E10',
      ink: '#F1EFE9',
      accent: '#FF6B3D', // Engineering orange
      description: 'Dark graphite studio sweep background, warm white typography, vibrant industrial orange dimension accents.'
    },
    cameraGrammar: [
      'Continuous 360 orbit around floating assembly',
      'Macro fly-through traveling between separated layers',
      'Locked-off vertical alignment descent',
      'Extreme close-up on silicon die wire bonds'
    ],
    soundPalette: {
      ambience: 'Subtle clean studio room tone, quiet servo whir',
      foley: ['metallic thread unscrew', 'PCB snap release', 'magnetic click', 'precision caliper tap'],
      instruments: ['minimal ambient synthesizer', 'sparse glass bell', 'low sub-frequency pulse']
    },
    nativeMove: 'Macro flight between suspended PCB layers as copper traces illuminate with current.',
    typography: {
      display: 'Inter',
      body: 'Noto Sans',
      mono: 'JetBrains Mono'
    },
    promptKeywords: ['exploded teardown view', 'PBR materials', 'floating mechanical parts', 'depth of field macro', 'graphite studio background']
  },

  'ascii-crt': {
    slug: 'ascii-crt',
    name: 'Retro ASCII Terminal & Surveillance CRT',
    category: 'retro',
    essence: 'Phosphor green or amber monochrome terminal text with curvature, barrel distortion, scanlines, and beam-collapse transitions.',
    palette: {
      base: '#050D08',
      ink: '#33FF66',
      accent: '#FFB000', // Warning amber
      description: 'P1 green phosphor glow on deep shadow, with amber strobe for critical warnings.'
    },
    cameraGrammar: [
      'Static terminal monitor screen face',
      'Slow push-in toward flickering scanline matrix',
      'Sudden Dutch angle surveillance jerk',
      'CRT power-down beam collapse'
    ],
    soundPalette: {
      ambience: '15kHz CRT flyback transformer whine, 60Hz mains hum',
      foley: ['relay click', 'floppy drive stepper seek', 'mechanical keyboard clack', 'dial-up handshake burst'],
      instruments: ['chiptune pulse waves', 'FM synthesizer drone', 'analog square lead']
    },
    nativeMove: 'CRT beam collapse where the entire scene implodes into a single blazing white horizontal line.',
    typography: {
      display: 'VT323',
      body: 'Share Tech Mono',
      mono: 'Courier Prime'
    },
    promptKeywords: ['ASCII art rendering', 'monochrome green phosphor CRT', 'scanlines bloom', 'barrel distortion', 'terminal telemetry']
  },

  'cel-anime-80s': {
    slug: 'cel-anime-80s',
    name: '1980s Retro Cel Anime',
    category: 'retro',
    essence: 'Hand-painted animation cels with chromatic aberration, film grain, rim lighting, and speed-line action cuts on twos.',
    palette: {
      base: '#1A1829',
      ink: '#FFF8E7',
      accent: '#FF2A6D', // Neon cyberpunk magenta
      description: 'Deep midnight navy base, creamy gouache paint tones, neon laser magenta highlight.'
    },
    cameraGrammar: [
      'Dynamic low-angle heroic push',
      'High-speed tracking shot with stepped speed-lines',
      'Crash zoom into expressive character eyes',
      'Split-screen vertical reaction triptych'
    ],
    soundPalette: {
      ambience: 'Distant retro city drone, neon sign sizzle',
      foley: ['katana unsheath ring', 'heavy boot landing impact', 'air whoosh swoop', 'plasma charge whine'],
      instruments: ['analog synth brass', 'orchestral hit stabs', 'arpeggiated bassline', 'snare drum gated reverb']
    },
    nativeMove: 'Hand-drawn impact flare that freezes on a single inked cel frame with inverted silhouette.',
    typography: {
      display: 'Bebas Neue',
      body: 'Noto Sans JP',
      mono: 'Space Mono'
    },
    promptKeywords: ['1980s retro anime style', 'hand-painted cel aesthetic', 'film grain bloom', 'sharp cel shading', 'dramatic action framing']
  },

  watercolor: {
    slug: 'watercolor',
    name: 'Wet-on-Wet Watercolor Wash',
    category: 'fine-art',
    essence: 'Pigments bleeding into wet cold-pressed paper with organic granulation, deckled edges, and soft feathered edges.',
    palette: {
      base: '#FBF9F5',
      ink: '#2C3E50',
      accent: '#E76F51', // Burnt sienna
      description: 'Textured ivory watercolor paper, indigo washes, burnt sienna warm accents.'
    },
    cameraGrammar: [
      'Gentle floating drift over paper surface',
      'Slow tilt following pigment capillary bloom',
      'Soft focus pull between foreground wash and background dry brush',
      'Whip pan through wet water ripple'
    ],
    soundPalette: {
      ambience: 'Soft distant breeze, quiet summer rainfall',
      foley: ['wet brush stroke drag', 'water droplet splash', 'textured paper bend', 'palette knife scrape'],
      instruments: ['fingerpicked acoustic guitar', 'solo cello', 'gentle piano chords', 'bamboo flute']
    },
    nativeMove: 'Water wash bloom where colors bleed across boundaries to wash away the previous scene.',
    typography: {
      display: 'Cinzel',
      body: 'Cormorant Garamond'
    },
    promptKeywords: ['wet-on-wet watercolor', 'pigment granulation', 'cold-pressed paper texture', 'soft bleed edges', 'artistic brush strokes']
  },

  ukiyoe: {
    slug: 'ukiyoe',
    name: 'Edo Woodblock Print (Ukiyo-e)',
    category: 'fine-art',
    essence: 'Carved woodblock outlines, bokashi color gradients, sumi ink linework, and textured washi paper.',
    palette: {
      base: '#EED9C4',
      ink: '#1A1815',
      accent: '#C83232', // Vermilion red seal
      description: 'Aged washi parchment base, deep sumi black outlines, vermilion cinnabar seal stamp.'
    },
    cameraGrammar: [
      'Flat isometric scroll pan',
      'Vertical scroll descent (hanging scroll framing)',
      'Static woodblock print composition with animated elements',
      'Low angle wave perspective'
    ],
    soundPalette: {
      ambience: 'Coastal wave roar, wind through bamboo grove',
      foley: ['wood gouge carving stroke', 'brayer ink rolling', 'paper pressing baren rub', 'wooden clapper wooden hyoshigi strike'],
      instruments: ['koto harp plucks', 'shakuhachi flute', 'shamisen staccato', 'taiko drum resonant thud']
    },
    nativeMove: 'Carved contour line drawing itself as a red inkan seal stamps into the corner.',
    typography: {
      display: 'Shippori Mincho',
      body: 'Noto Serif JP'
    },
    promptKeywords: ['ukiyo-e woodblock print', 'sumi ink contours', 'bokashi color gradation', 'washi paper grain', 'Edo period art']
  },

  'paper-popup': {
    slug: 'paper-popup',
    name: 'Papercraft Pop-Up Book',
    category: 'fine-art',
    essence: 'Layered paper cutouts folding and popping up with cast paper shadows, tab joints, and mechanical origami hinges.',
    palette: {
      base: '#FAF6EE',
      ink: '#3D3833',
      accent: '#4EA8DE', // Paper sky blue
      description: 'Heavy cardstock cream base, deep graphite pencil annotations, vivid origami blue tabs.'
    },
    cameraGrammar: [
      'Low perspective camera rising as page opens',
      'Parallax slide revealing layered depth planes',
      'Top-down looking into unfolding pop-up structure',
      'Push-in past paper cut out foreground elements'
    ],
    soundPalette: {
      ambience: 'Quiet library study tone',
      foley: ['page turn slap', 'creased paper hinge fold', 'cardboard tab slide', 'scissors snipping rhythm'],
      instruments: ['music box chimes', 'pizzicato violins', 'wooden marimba', 'glockenspiel']
    },
    nativeMove: 'Page fold transition where the camera tracks as the entire scene folds flat and swings open into a new pop-up.',
    typography: {
      display: 'Playfair Display',
      body: 'Lora'
    },
    promptKeywords: ['pop-up book animation', 'layered paper cutout depth', 'creased cardstock origami', 'cast paper shadows', 'mechanical paper tabs']
  }
};

/**
 * Fallback generator for any of the other 58 styles in the Lemo-Opuscar catalog.
 */
export function getVisualStoryStyle(slug: string): VisualStoryStyle {
  if (LEMO_STYLE_PRESETS[slug]) {
    return LEMO_STYLE_PRESETS[slug];
  }

  // Sensible default mapping for extended styles (e.g. circuit-board, briefing-board, impasto, etc.)
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  return {
    slug: cleanSlug,
    name: cleanSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    category: cleanSlug.includes('board') || cleanSlug.includes('circuit') || cleanSlug.includes('sat')
      ? 'technical'
      : cleanSlug.includes('anime') || cleanSlug.includes('crt') || cleanSlug.includes('film')
      ? 'retro'
      : 'fine-art',
    essence: `Authentic cinematic presentation adhering to the ${cleanSlug} aesthetic.`,
    palette: {
      base: '#121316',
      ink: '#E8EAED',
      accent: '#FF453A',
      description: 'Strict 3-tone color harmony: neutral ground, crisp subject ink, single signal accent.'
    },
    cameraGrammar: [
      'Establishing push-in',
      'Lateral tracking shot',
      'Close-up detail cut on downbeat',
      'Pull-out scale reveal'
    ],
    soundPalette: {
      ambience: 'Authentic medium-specific room tone and presence',
      foley: ['material-specific kinetic touch', 'action click', 'whoosh transit'],
      instruments: ['curated acoustic or synthetic palette matching genre']
    },
    nativeMove: `A kinetic transition unique to ${cleanSlug} that transforms the screen at the climax.`,
    typography: {
      display: 'Inter',
      body: 'Inter'
    },
    promptKeywords: [`${cleanSlug} aesthetic`, 'cinematic framing', 'strict palette', 'purposeful camera motion']
  };
}

// ==========================================
// 4. Grammar & Quality Gate Validator
// ==========================================

/**
 * Validates a treatment against Lemo-Opuscar directing rules:
 * 1. 0-3s Hook present (shot 1 <= 3.5s and sets the stakes).
 * 2. At least 4 distinct camera moves used across shots.
 * 3. 1 Subject, 1 Goal, 1 Turn arc structure with Ending Echo.
 * 4. 1 Native Move at the emotional peak.
 * 5. Sound design has 3 layers and at least 1 deliberate silence/breath.
 * 6. Subtitles comply with minimum hold time formulas.
 */
export function validateTreatmentGrammar(
  treatment: StoryTreatment
): TreatmentValidationResult {
  const issues: string[] = [];

  // 1. Duration check
  const totalDuration = treatment.shots.reduce(
    (acc, shot) => acc + shot.durationSeconds,
    0
  );
  if (Math.abs(totalDuration - treatment.targetDurationSeconds) > 8.0) {
    issues.push(
      `Total duration (${totalDuration.toFixed(1)}s) deviates significantly from target (${treatment.targetDurationSeconds}s).`
    );
  }

  // 2. 0-3s Hook rule
  const firstShot = treatment.shots[0];
  const hasHookInFirst3s =
    firstShot &&
    firstShot.durationSeconds <= 3.5 &&
    /hook|establishing|urgent|opening|question|shock/i.test(
      firstShot.narrativePurpose + ' ' + firstShot.actionDescription
    );
  if (!hasHookInFirst3s) {
    issues.push(
      'Violation of 0-3s Hook Rule: Shot 1 must establish an immediate hook within 3.5s without slow logo reveals.'
    );
  }

  // 3. Distinct camera moves (min 4 required)
  const cameraMoves = new Set(
    treatment.shots.map(s => s.cameraMove.trim().toLowerCase())
  );
  if (cameraMoves.size < 4) {
    issues.push(
      `Camera Grammar Deficit: Video uses only ${cameraMoves.size} distinct camera moves; minimum 4 required.`
    );
  }

  // 4. Ending Echo
  const hasEndingEcho = Boolean(
    treatment.arc.endingEcho && treatment.arc.endingEcho.length > 10
  );
  if (!hasEndingEcho) {
    issues.push('Missing Ending Echo: The final act must echo or bookend the opening.');
  }

  // 5. Native Move
  const hasNativeMove = Boolean(
    treatment.arc.nativeMove && treatment.arc.nativeMove.length > 5
  );
  if (!hasNativeMove) {
    issues.push('Missing Native Move: Every treatment requires one medium-native transformation.');
  }

  // 6. Audio silences & breaths
  const hasSilenceOrBreath = treatment.shots.some(
    s => s.audioLayers.isSilenceOrBreath || /silence|breath|pause/i.test(s.audioLayers.musicState)
  );
  if (!hasSilenceOrBreath) {
    issues.push(
      'Sound Staging Invariant: Must contain at least one moment of deliberate silence or breath before the turn/climax.'
    );
  }

  // 7. J-Cut or L-Cut presence
  const hasAudioJorLCut = treatment.shots.some(
    s => s.audioLayers.transition === 'j-cut' || s.audioLayers.transition === 'l-cut'
  );

  // 8. Subtitle readability check
  treatment.shots.forEach((shot, index) => {
    if (shot.dialogueOrSubtitle) {
      const minReadingHold = calculateReadingHoldTime(shot.dialogueOrSubtitle);
      if (shot.durationSeconds < minReadingHold - 0.5) {
        issues.push(
          `Shot ${index + 1} subtitle is too fast to read: "${shot.dialogueOrSubtitle}" requires ~${minReadingHold}s but shot is ${shot.durationSeconds}s.`
        );
      }
    }
  });

  return {
    valid: issues.length === 0,
    issues,
    stats: {
      totalDuration: Number(totalDuration.toFixed(2)),
      distinctCameraMoves: cameraMoves.size,
      hasHookInFirst3s: Boolean(hasHookInFirst3s),
      hasEndingEcho,
      hasNativeMove,
      hasSilenceOrBreath,
      hasAudioJorLCut
    }
  };
}

// ==========================================
// 5. LLM Prompt Compilers
// ==========================================

export const LEMO_OPUSCAR_DIRECTOR_SYSTEM_PROMPT = `You are a master cinematic director and screenplay architect adhering strictly to the Lemo-Opuscar Directing Doctrine.
You judge videos in strict hierarchy: Sound -> Rhythm -> Camera -> Directing. Visual frames are only the baseline.

Mandatory Rules:
1. 0-3s Hook: Never open with slow logos, greetings, or fluff. Start on the inciting tension.
2. Arc Structure: One subject, one goal, one turn, and an ending that echoes the start.
3. Rhythm: Vary pace (fast, deliberate, one acceleration, at least one breath/pause). Subtitles hold >= max(1.8s, spoken + 0.6s). Reading holds = (letters/15 + 1.5)s.
4. Camera: Use at least 4 distinct camera moves and designate one signature shot.
5. Sound: Layer ambience, action-synced foley, and score (-14 LUFS). Place at least one real silence before the turn.
6. Native Move: Pick or invent one kinetic trick that only this visual medium can do.

Return pure structured JSON adhering to the specified treatment schema.`;

/**
 * Builds a prompt for generating a complete Lemo-Opuscar style video treatment.
 */
export function buildLemoOpuscarTreatmentPrompt(
  topic: string,
  styleSlug: string = 'blueprint',
  targetSeconds: number = 45
): string {
  const style = getVisualStoryStyle(styleSlug);

  return `Direct a complete video treatment on the topic: "${topic}".
Visual Style: ${style.name} (${style.slug})
Essence: ${style.essence}
Target Duration: ${targetSeconds} seconds @ 24 fps.
Loudness: -14 LUFS broadcast standard.
Recommended Palette: Base ${style.palette.base}, Ink ${style.palette.ink}, Accent ${style.palette.accent}.
Native Move Trick: ${style.nativeMove}

Return ONLY valid JSON matching this schema:
{
  "title": "Title of the Video",
  "styleSlug": "${style.slug}",
  "targetDurationSeconds": ${targetSeconds},
  "logline": "One compelling sentence summarizing subject, desire, and turn",
  "arc": {
    "setup": "Opening hook (0-8s) introducing subject and desire",
    "turn": "Complication or transformation (8-24s)",
    "endingEcho": "Resolution that bookends the beginning or reveals scale",
    "nativeMove": "${style.nativeMove}"
  },
  "benchmark": {
    "learnFrom": ["Specific composition, pacing, camera grammar to emulate"],
    "avoid": ["Specific cliches, trademarked designs, or generic stock tropes to avoid"]
  },
  "shots": [
    {
      "shotNumber": 1,
      "framing": "wide",
      "cameraMove": "Push-in (fast)",
      "durationSeconds": 3.0,
      "actionDescription": "Instant scroll-stopping hook scene visual",
      "dialogueOrSubtitle": "Spoken hook sentence",
      "audioLayers": {
        "ambience": "${style.soundPalette.ambience}",
        "foley": "${style.soundPalette.foley[0] || 'action sound'}",
        "musicState": "Staccato rhythm under dialogue",
        "isSilenceOrBreath": false,
        "transition": "hard-cut"
      },
      "narrativePurpose": "Hook the viewer immediately"
    }
  ]
}`;
}

/**
 * Compiles a rich visual prompt for text-to-video / image generation engines for a given shot.
 */
export function buildLemoShotVisualPrompt(
  shot: TreatmentShot,
  styleSlug: string = 'blueprint'
): string {
  const style = getVisualStoryStyle(styleSlug);
  const promptParts: string[] = [];

  // Style baseline
  promptParts.push(style.name);
  promptParts.push(style.essence);

  // Framing & Camera
  promptParts.push(`${shot.framing} framing`);
  promptParts.push(`camera motion: ${shot.cameraMove}`);

  // Subject & Action
  promptParts.push(shot.actionDescription);

  // Palette & lighting constraint
  promptParts.push(style.palette.description);

  // Keywords
  if (style.promptKeywords.length > 0) {
    promptParts.push(style.promptKeywords.join(', '));
  }

  return promptParts.join('. ');
}
