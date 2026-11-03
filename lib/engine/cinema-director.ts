/**
 * Cinema Director Engine
 * 
 * Inspired by Open-Higgsfield-AI & professional cinematography optics:
 * - Deterministic optical and lens physics (focal lengths, apertures, sensor sizes)
 * - 3D camera motion choreography (orbit 360, dolly zoom, FPV drone, whip pan, steadicam)
 * - Lighting architecture (volumetric god rays, chiaroscuro, cyberpunk neon, golden hour)
 * - Film stocks, color timing & LUTs (Kodak Vision3 500T, Technicolor, Bleach Bypass, Noir)
 * - Multi-image character & scene consistency rig (up to 14 semantic references)
 * - Director-grade prompt compiler for Kling, Wan2.1, Fal, Flux, and Higgsfield models
 */

export type SensorFormat =
  | 'full-frame-35mm'
  | 'super35'
  | 'imax-70mm'
  | 'arri-alexa-65'
  | 'anamorphic-2x';

export type FocalLength =
  | '14mm-ultra-wide'
  | '24mm-wide'
  | '35mm-street'
  | '50mm-standard'
  | '85mm-portrait'
  | '135mm-telephoto'
  | '200mm-long-range';

export type Aperture =
  | 'f/0.95'
  | 'f/1.2'
  | 'f/1.8'
  | 'f/2.8'
  | 'f/4'
  | 'f/8'
  | 'f/16';

export type CameraChoreography =
  | 'orbit-360'
  | 'dolly-zoom-vertigo'
  | 'fpv-drone-rush'
  | 'steadicam-lead'
  | 'steadicam-follow'
  | 'crane-jib-ascend'
  | 'crane-jib-descend'
  | 'whip-pan'
  | 'dutch-angle-tilt'
  | 'bullet-time-freeze'
  | 'push-in'
  | 'pull-out'
  | 'static-tripod';

export type LightingAtmosphere =
  | 'volumetric-god-rays'
  | 'cyberpunk-neon'
  | 'golden-hour-backlight'
  | 'rembrandt-chiaroscuro'
  | 'film-noir-venetian'
  | 'studio-high-key'
  | 'moody-candlelight'
  | 'fluorescent-grit';

export type FilmStockGrade =
  | 'kodak-vision3-500t'
  | 'kodak-portra-400'
  | 'technicolor-3-strip'
  | 'bleach-bypass-silver'
  | 'noir-monochrome'
  | 'blockbuster-teal-orange'
  | 'vintage-1970s-film'
  | 'vhs-camcorder-90s';

export type ReferenceRole =
  | '@face'
  | '@outfit'
  | '@pose'
  | '@lighting'
  | '@environment'
  | '@style';

export interface CinemaReferenceAsset {
  id: string;
  url: string;
  role: ReferenceRole;
  label?: string;
  weight?: number; // 0.1 to 1.0, default 0.85
}

export interface CinemaShotConfig {
  subject: string;
  action?: string;
  environment?: string;
  sensorFormat?: SensorFormat;
  focalLength?: FocalLength;
  aperture?: Aperture;
  cameraMotion?: CameraChoreography;
  lighting?: LightingAtmosphere;
  filmStock?: FilmStockGrade;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '2.39:1';
  motionIntensity?: 'subtle' | 'smooth' | 'dynamic' | 'chaotic';
  references?: CinemaReferenceAsset[];
  additionalPrompt?: string;
}

export interface CompiledCinemaPrompt {
  prompt: string;
  negativePrompt: string;
  cameraDirective: string;
  opticalDescriptor: string;
  lightingDescriptor: string;
  colorGradeDescriptor: string;
  referenceTags: string[];
  parameters: {
    aspectRatio: string;
    motionScore: number;
    sensorFormat: SensorFormat;
    focalLength: FocalLength;
    aperture: Aperture;
  };
}

// ---------------------------------------------------------------------------
// Optical Physics Mappings
// ---------------------------------------------------------------------------

const FOCAL_LENGTH_DESCRIPTORS: Record<FocalLength, string> = {
  '14mm-ultra-wide': '14mm ultra wide-angle lens, expansive perspective, dramatic architectural distortion, expansive field of view',
  '24mm-wide': '24mm wide-angle cinema prime lens, environmental context, dynamic depth perspective',
  '35mm-street': '35mm cinema prime, natural street perspective, documentary realism, balanced spatial depth',
  '50mm-standard': '50mm standard focal prime, human eye perspective, zero focal distortion, pristine clarity',
  '85mm-portrait': '85mm portrait prime lens, smooth optical subject isolation, compressed background, flattering facial proportions',
  '135mm-telephoto': '135mm telephoto cinema lens, pronounced background compression, shallow depth of field separation',
  '200mm-long-range': '200mm extreme telephoto cinema lens, cinematic planar flattening, intense visual intimacy'
};

const APERTURE_DESCRIPTORS: Record<Aperture, string> = {
  'f/0.95': 'extreme razor-thin depth of field, hyper-creamy dreamy circular bokeh, soft focus falloff',
  'f/1.2': 'ultra-shallow depth of field, sublime circular bokeh highlights, luminous optical separation',
  'f/1.8': 'shallow cinematic depth of field, natural portrait bokeh, sharp subject isolation',
  'f/2.8': 'balanced cinema aperture, cinematic separation with readable background environment',
  'f/4': 'moderate depth of field, crisp commercial clarity, gentle background defocus',
  'f/8': 'deep depth of field, sharp foreground-to-background focus, architectural sharpness',
  'f/16': 'hyper-focal depth of field, razor-sharp edge-to-edge detail, deep landscape clarity'
};

const SENSOR_DESCRIPTORS: Record<SensorFormat, string> = {
  'full-frame-35mm': 'shot on 35mm full-frame cinema camera, authentic optical fidelity, fine organic grain',
  'super35': 'shot on ARRI Super 35 format, Hollywood feature film texture, rich shadow latitude',
  'imax-70mm': 'shot on 70mm IMAX 15-perf camera, colossal visual resolution, breathtaking edge-to-edge fidelity',
  'arri-alexa-65': 'shot on ARRI ALEXA 65 large-format sensor, pristine dynamic range, velvet highlight rolloff',
  'anamorphic-2x': 'shot on 2x squeeze anamorphic glass, oval bokeh, horizontal blue lens streaks, 2.39:1 widescreen scope'
};

const CHOREOGRAPHY_DESCRIPTORS: Record<CameraChoreography, string> = {
  'orbit-360': 'sweeping 360-degree orbital camera rotation around the subject, dynamic revolving parallax perspective',
  'dolly-zoom-vertigo': 'dolly zoom vertigo effect, simultaneous optical camera push-in while zooming out, dramatic spatial distortion',
  'fpv-drone-rush': 'high-velocity FPV drone dive and dynamic banking rush through the space, adrenaline camera trajectory',
  'steadicam-lead': 'smooth steadicam tracking backward leading the moving subject, fluid cinematic glide',
  'steadicam-follow': 'smooth steadicam tracking forward following the subject from behind, immersive third-person motion',
  'crane-jib-ascend': 'grand jib crane ascending upward from ground level to high-angle reveal, monumental cinematic elevation',
  'crane-jib-descend': 'jib crane descending smoothly from sky down to intimate subject framing',
  'whip-pan': 'rapid rotational whip pan motion blur snap, dynamic transition momentum',
  'dutch-angle-tilt': 'stylized canted Dutch angle tilt, diagonal horizon line, psychological tension',
  'bullet-time-freeze': 'bullet time frozen temporal matrix sweep, 3D camera arc around momentary action',
  'push-in': 'deliberate cinematic push-in dolly forward toward subject, building emotional gravity',
  'pull-out': 'smooth cinematic pull-out dolly backward revealing the surrounding world',
  'static-tripod': 'locked-off master tripod composition, perfectly stable frame, patient cinematic stillness'
};

const LIGHTING_DESCRIPTORS: Record<LightingAtmosphere, string> = {
  'volumetric-god-rays': 'volumetric shafts of sunlight, atmospheric dust motes, radiant god rays cutting through shadows',
  'cyberpunk-neon': 'vibrant cyberpunk neon practical lighting, magenta and cyan edge highlights, wet reflective surfaces',
  'golden-hour-backlight': 'golden hour sunset backlight, warm amber rim lighting, incandescent glow, natural optical lens flare',
  'rembrandt-chiaroscuro': 'Rembrandt chiaroscuro portrait lighting, triangular cheek highlight, rich painterly shadow contrast',
  'film-noir-venetian': 'film noir high-contrast low-key lighting, harsh venetian blind shadow slats, mysterious silhouette',
  'studio-high-key': 'commercial studio high-key illumination, soft diffuse beauty dishes, shadowless clean highlights',
  'moody-candlelight': 'warm flickering candlelight, intimate deep amber glow, undulating natural flame shadows',
  'fluorescent-grit': 'industrial overhead green-tinged fluorescent tubes, gritty institutional ambiance, harsh realism'
};

const FILM_STOCK_DESCRIPTORS: Record<FilmStockGrade, string> = {
  'kodak-vision3-500t': 'Kodak Vision3 500T 5219 film stock, organic fine grain, warm tungsten highlights, deep teal shadows',
  'kodak-portra-400': 'Kodak Portra 400 aesthetic, soft natural pastel skin tones, low contrast highlight roll-off',
  'technicolor-3-strip': 'Technicolor 3-strip dye transfer process, rich hyper-saturated primary reds and greens, vintage Golden Age Hollywood',
  'bleach-bypass-silver': 'bleach bypass chemical processing, retained silver grain, desaturated palette with crushing dark contrast',
  'noir-monochrome': 'panchromatic 35mm black and white film, deep velvet blacks, bright crisp silver highlights, high micro-contrast',
  'blockbuster-teal-orange': 'modern Hollywood teal and orange color grade, rich skin tone contrast against cyan shadows',
  'vintage-1970s-film': '1970s vintage anamorphic film print, warm sepia undertones, soft halation around practical lights, analog grain',
  'vhs-camcorder-90s': '1990s analog VHS camcorder tape texture, subtle tape noise, chromatic phase jitter, retro home-video nostalgia'
};

// ---------------------------------------------------------------------------
// Director Presets (Famous Filmmaking Styles)
// ---------------------------------------------------------------------------

export interface DirectorPreset {
  id: string;
  name: string;
  director: string;
  description: string;
  config: Partial<CinemaShotConfig>;
}

export const DIRECTOR_PRESETS: DirectorPreset[] = [
  {
    id: 'blade-runner-noir',
    name: 'Neo-Noir Dystopia',
    director: 'Ridley Scott / Denis Villeneuve',
    description: 'Anamorphic blue streaks, volumetric atmospheric rain, and neon practical reflections.',
    config: {
      sensorFormat: 'anamorphic-2x',
      focalLength: '35mm-street',
      aperture: 'f/1.8',
      cameraMotion: 'steadicam-lead',
      lighting: 'cyberpunk-neon',
      filmStock: 'kodak-vision3-500t',
      aspectRatio: '2.39:1',
      motionIntensity: 'smooth'
    }
  },
  {
    id: 'wes-anderson-symmetry',
    name: 'Pastel Symmetry',
    director: 'Wes Anderson',
    description: 'Strict flat perspective, 50mm human eye prime, deep focus, and pastel chromatic palette.',
    config: {
      sensorFormat: 'full-frame-35mm',
      focalLength: '50mm-standard',
      aperture: 'f/8',
      cameraMotion: 'static-tripod',
      lighting: 'studio-high-key',
      filmStock: 'kodak-portra-400',
      aspectRatio: '16:9',
      motionIntensity: 'subtle'
    }
  },
  {
    id: 'nolan-imax-epic',
    name: '70mm IMAX Monumental',
    director: 'Christopher Nolan',
    description: 'Massive 70mm resolution, practical sunlight, and powerful sweeping camera elevation.',
    config: {
      sensorFormat: 'imax-70mm',
      focalLength: '24mm-wide',
      aperture: 'f/4',
      cameraMotion: 'crane-jib-ascend',
      lighting: 'volumetric-god-rays',
      filmStock: 'kodak-vision3-500t',
      aspectRatio: '16:9',
      motionIntensity: 'dynamic'
    }
  },
  {
    id: 'fincher-chiaroscuro',
    name: 'Calculated Chiaroscuro',
    director: 'David Fincher',
    description: 'Precision robotic camera track, low-key venetian contrast, and clinical green-gold grade.',
    config: {
      sensorFormat: 'arri-alexa-65',
      focalLength: '35mm-street',
      aperture: 'f/2.8',
      cameraMotion: 'push-in',
      lighting: 'rembrandt-chiaroscuro',
      filmStock: 'bleach-bypass-silver',
      aspectRatio: '2.39:1',
      motionIntensity: 'subtle'
    }
  },
  {
    id: 'matrix-bullet-time',
    name: 'Wachowski Bullet Time',
    director: 'Lana & Lilly Wachowski',
    description: 'Frozen temporal 3D arc, wide-angle distortion, and green-tinted fluorescent shadows.',
    config: {
      sensorFormat: 'super35',
      focalLength: '14mm-ultra-wide',
      aperture: 'f/2.8',
      cameraMotion: 'bullet-time-freeze',
      lighting: 'fluorescent-grit',
      filmStock: 'blockbuster-teal-orange',
      aspectRatio: '16:9',
      motionIntensity: 'chaotic'
    }
  },
  {
    id: 'tarantino-vintage-35',
    name: '70s Grindhouse Pulp',
    director: 'Quentin Tarantino',
    description: 'Technicolor primary saturation, sudden whip pans, and punchy 85mm close-ups.',
    config: {
      sensorFormat: 'full-frame-35mm',
      focalLength: '85mm-portrait',
      aperture: 'f/1.8',
      cameraMotion: 'whip-pan',
      lighting: 'golden-hour-backlight',
      filmStock: 'technicolor-3-strip',
      aspectRatio: '2.39:1',
      motionIntensity: 'dynamic'
    }
  }
];

// ---------------------------------------------------------------------------
// Prompt Compiler
// ---------------------------------------------------------------------------

/**
 * Compiles a director-grade cinematic prompt incorporating optical physics,
 * camera choreography, lighting, film stock, and multi-image references.
 */
export function compileCinematicPrompt(shot: CinemaShotConfig): CompiledCinemaPrompt {
  const sensor = shot.sensorFormat || 'full-frame-35mm';
  const focal = shot.focalLength || '35mm-street';
  const aperture = shot.aperture || 'f/1.8';
  const motion = shot.cameraMotion || 'push-in';
  const lighting = shot.lighting || 'golden-hour-backlight';
  const grade = shot.filmStock || 'kodak-vision3-500t';
  const aspect = shot.aspectRatio || '16:9';
  const intensity = shot.motionIntensity || 'smooth';

  const opticalDirective = `${SENSOR_DESCRIPTORS[sensor]}, ${FOCAL_LENGTH_DESCRIPTORS[focal]}, ${APERTURE_DESCRIPTORS[aperture]}`;
  const motionDirective = CHOREOGRAPHY_DESCRIPTORS[motion];
  const lightingDirective = LIGHTING_DESCRIPTORS[lighting];
  const gradeDirective = FILM_STOCK_DESCRIPTORS[grade];

  // Process multi-image references (up to 14)
  const referenceTags: string[] = [];
  const refTokens: string[] = [];

  if (shot.references && shot.references.length > 0) {
    // Clamp to 14 maximum references
    const activeRefs = shot.references.slice(0, 14);
    for (const ref of activeRefs) {
      const tag = `${ref.role}:${ref.label || ref.id}`;
      referenceTags.push(tag);
      if (ref.role === '@face') {
        refTokens.push(`consistent character facial structure matching reference ${ref.id}`);
      } else if (ref.role === '@outfit') {
        refTokens.push(`exact matching wardrobe and clothing style from reference ${ref.id}`);
      } else if (ref.role === '@environment') {
        refTokens.push(`consistent architectural background and environment matching ${ref.id}`);
      } else if (ref.role === '@style') {
        refTokens.push(`artistic and aesthetic continuity matching reference ${ref.id}`);
      }
    }
  }

  // Build the positive prompt
  const promptParts: string[] = [];

  // 1. Core Subject & Action
  let sceneSubject = shot.subject.trim();
  if (shot.action) sceneSubject += `, ${shot.action.trim()}`;
  if (shot.environment) sceneSubject += `, set within ${shot.environment.trim()}`;
  promptParts.push(sceneSubject);

  // 2. Optical Physics & Camera Angle
  promptParts.push(opticalDirective);

  // 3. Camera Choreography & Movement
  promptParts.push(`Camera movement: ${motionDirective} with ${intensity} cinematic camera velocity`);

  // 4. Lighting & Color Grading
  promptParts.push(`Lighting: ${lightingDirective}`);
  promptParts.push(`Color grading: ${gradeDirective}`);

  // 5. Reference Alignment
  if (refTokens.length > 0) {
    promptParts.push(`Character and scene consistency: ${refTokens.join('; ')}`);
  }

  // 6. Additional Directives
  if (shot.additionalPrompt) {
    promptParts.push(shot.additionalPrompt.trim());
  }

  // 7. Master Photographic Finisher
  promptParts.push('8k UHD, award-winning cinematography, photorealistic, cinematic masterpiece, mastershot, 24fps motion cadence');

  const finalPrompt = promptParts.join('. ');

  // Standard cinematic negative prompt
  const negativePrompt =
    'amateur video, shaky cam, jerky motion, stutter, blur, washed out, low resolution, blown out highlights, plastic skin, 3d render look, cartoon, anime, deformed anatomy, bad eyes, extra limbs, floating artifacts, digital noise, oversaturated, watermark, signature, text overlays';

  const motionScoreMap: Record<string, number> = {
    subtle: 3,
    smooth: 5,
    dynamic: 7,
    chaotic: 9
  };

  return {
    prompt: finalPrompt,
    negativePrompt,
    cameraDirective: motionDirective,
    opticalDescriptor: opticalDirective,
    lightingDescriptor: lightingDirective,
    colorGradeDescriptor: gradeDirective,
    referenceTags,
    parameters: {
      aspectRatio: aspect,
      motionScore: motionScoreMap[intensity] || 5,
      sensorFormat: sensor,
      focalLength: focal,
      aperture: aperture
    }
  };
}
