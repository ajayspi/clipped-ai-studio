import {
  CharacterPose,
  CharacterReferenceSheet,
  WhiteboardArchetype,
  WhiteboardStyle,
} from '@/lib/engine/types';
import { supabase } from '@/lib/db';
import { getApiKey } from '@/lib/keys';

export interface GenerateSheetOptions {
  archetype?: WhiteboardArchetype | string;
  customDescription?: string;
  style?: WhiteboardStyle | string;
  mock?: boolean;
}

export const KNOWN_ARCHETYPES: WhiteboardArchetype[] = [
  'stickman',
  'saint',
  'old man',
  'founder',
  'doctor',
  'teacher',
  'scientist',
  'custom',
];

// Normalized 3x3 Grid Bounding Boxes across [0, 0, 1000, 1000] canvas
export const POSE_GRID_BBOXES: Record<string, [number, number, number, number]> = {
  pose_1: [0, 0, 333, 333],
  pose_2: [333, 0, 666, 333],
  pose_3: [666, 0, 1000, 333],
  pose_4: [0, 333, 333, 666],
  pose_5: [333, 333, 666, 666],
  pose_6: [666, 333, 1000, 666],
  pose_7: [0, 666, 333, 1000],
  pose_8: [333, 666, 666, 1000],
  pose_9: [666, 666, 1000, 1000],
};

export const POSE_DEFINITIONS: Array<{ id: string; name: string; defaultDesc: string }> = [
  { id: 'pose_1', name: 'neutral', defaultDesc: 'Standing calmly with balanced posture' },
  { id: 'pose_2', name: 'pointing', defaultDesc: 'Pointing with index finger toward key concept' },
  { id: 'pose_3', name: 'eureka', defaultDesc: 'Idea discovery moment with raised hand and lightbulb' },
  { id: 'pose_4', name: 'explaining', defaultDesc: 'Open hands presenting and explaining ideas' },
  { id: 'pose_5', name: 'reading', defaultDesc: 'Engaged in reading document or book' },
  { id: 'pose_6', name: 'confused', defaultDesc: 'Pondering with hand on chin and question mark' },
  { id: 'pose_7', name: 'sitting', defaultDesc: 'Sitting relaxed at desk or seated surface' },
  { id: 'pose_8', name: 'writing', defaultDesc: 'Inscribing notes with pen on paper or board' },
  { id: 'pose_9', name: 'blessing', defaultDesc: 'Raised hand of wisdom, triumph, and conclusion' },
];

/**
 * Generate vector SVG path strings for each archetype and pose
 */
function getVectorPathForPose(archetype: string, poseId: string): string {
  // Base coordinate offsets and scale for 100x100 sub-box
  switch (archetype) {
    case 'stickman': {
      switch (poseId) {
        case 'pose_1': // neutral
          return 'M50,20 A10,10 0 1,0 50,40 A10,10 0 1,0 50,20 M50,40 L50,70 M50,50 L30,60 M50,50 L70,60 M50,70 L35,95 M50,70 L65,95';
        case 'pose_2': // pointing
          return 'M50,20 A10,10 0 1,0 50,40 A10,10 0 1,0 50,20 M50,40 L50,70 M50,50 L25,60 M50,50 L85,35 M85,35 L80,32 M50,70 L35,95 M50,70 L65,95';
        case 'pose_3': // eureka
          return 'M50,25 A10,10 0 1,0 50,45 A10,10 0 1,0 50,25 M50,45 L50,75 M50,55 L25,35 M50,55 L75,35 M50,75 L35,95 M50,75 L65,95 M75,20 A5,5 0 1,0 75,30 M75,12 L75,16 M68,15 L71,18 M82,15 L79,18';
        case 'pose_4': // explaining
          return 'M50,20 A10,10 0 1,0 50,40 A10,10 0 1,0 50,20 M50,40 L50,70 M50,50 L20,45 M50,50 L80,45 M50,70 L35,95 M50,70 L65,95';
        case 'pose_5': // reading
          return 'M50,20 A10,10 0 1,0 50,40 A10,10 0 1,0 50,20 M50,40 L50,70 M50,50 L35,55 L35,65 M50,50 L65,55 L65,65 M30,65 L70,65 L70,75 L30,75 Z M50,70 L35,95 M50,70 L65,95';
        case 'pose_6': // confused
          return 'M50,20 A10,10 0 1,0 50,40 A10,10 0 1,0 50,20 M50,40 L50,70 M50,50 L30,60 M50,50 L55,42 L45,35 M50,70 L35,95 M50,70 L65,95 M75,25 Q80,20 85,25 Q85,32 80,35 L80,38 M80,42 L80,43';
        case 'pose_7': // sitting
          return 'M40,20 A10,10 0 1,0 40,40 A10,10 0 1,0 40,20 M40,40 L40,65 L65,65 M40,50 L60,55 M65,65 L65,90 M30,65 L70,65';
        case 'pose_8': // writing
          return 'M45,20 A10,10 0 1,0 45,40 A10,10 0 1,0 45,20 M45,40 L45,70 M45,50 L65,55 L75,52 M45,70 L35,95 M45,70 L55,95 M60,60 L80,60 L80,75 L60,75 Z';
        case 'pose_9': // blessing
          return 'M50,20 A10,10 0 1,0 50,40 A10,10 0 1,0 50,20 M50,40 L50,70 M50,50 L25,35 M50,50 L75,35 M50,70 L35,95 M50,70 L65,95 M50,10 L50,15 M40,12 L43,16 M60,12 L57,16';
      }
      break;
    }
    case 'saint': {
      // Flowing robe, halo, scroll, beard
      return `M50,15 A12,12 0 1,0 50,39 A12,12 0 1,0 50,15 M50,8 A16,16 0 1,0 50,40 M42,40 Q50,55 58,40 M38,42 L25,88 L75,88 L62,42 Z M35,50 Q20,60 30,70 M65,50 Q80,${poseId === 'pose_9' ? '30' : '60'} 70,${poseId === 'pose_9' ? '25' : '70'}`;
    }
    case 'old man': {
      // Walking stick, glasses, slight hunch, curved back
      return `M45,22 A10,10 0 1,0 45,42 M40,28 L50,28 M38,26 A3,3 0 1,0 44,26 M46,26 A3,3 0 1,0 52,26 M45,42 Q40,60 48,72 M48,72 L38,95 M48,72 L58,95 M42,50 L30,65 L30,95 M45,50 L70,${poseId === 'pose_2' ? '35' : '65'}`;
    }
    case 'founder': {
      // Modern collar, sleek jacket, tablet/pointer gesture
      return `M50,18 A10,10 0 1,0 50,38 M42,38 L30,50 L32,85 L68,85 L70,50 L58,38 Z M46,38 L50,55 L54,38 M30,50 L18,${poseId === 'pose_2' ? '35' : '68'} M70,50 L82,${poseId === 'pose_3' ? '30' : '68'} M38,85 L36,98 M62,85 L64,98`;
    }
    case 'doctor': {
      // Stethoscope, medical coat, pocket, clipboard
      return `M50,18 A10,10 0 1,0 50,38 M40,38 L28,52 L30,88 L70,88 L72,52 L60,38 Z M45,42 Q50,60 55,42 M50,60 L50,68 A4,4 0 1,0 54,68 M35,88 L34,98 M65,88 L66,98 M28,52 L16,65 M72,52 L${poseId === 'pose_2' ? '86,36' : '82,65'}`;
    }
    case 'teacher': {
      // Pointer stick, glasses, chalkboard backdrop gesture
      return `M50,18 A10,10 0 1,0 50,38 M44,27 H56 M40,38 L28,52 L32,88 L68,88 L72,52 L60,38 Z M28,52 L18,65 M72,52 L${poseId === 'pose_2' ? '92,30' : '82,60'} ${poseId === 'pose_2' ? 'M80,45 L95,25' : ''} M38,88 L36,98 M62,88 L64,98`;
    }
    case 'scientist': {
      // Lab coat, goggles, beaker with bubbling reaction
      return `M50,18 A10,10 0 1,0 50,38 M42,26 A4,4 0 1,0 50,26 M50,26 A4,4 0 1,0 58,26 M40,38 L26,52 L28,88 L72,88 L74,52 L60,38 Z M26,52 L14,65 M74,52 L80,${poseId === 'pose_3' ? '40' : '65'} M78,65 L84,65 L87,78 L75,78 Z M81,60 A1.5,1.5 0 1,0 81,57 M36,88 L34,98 M64,88 L66,98`;
    }
    case 'custom':
    default: {
      return `M50,18 A11,11 0 1,0 50,40 M42,40 L30,52 L32,86 L68,86 L70,52 L58,40 Z M30,52 L${poseId === 'pose_2' ? '15,35' : '20,68'} M70,52 L${poseId === 'pose_3' ? '85,32' : '80,68'} M38,86 L36,98 M62,86 L64,98`;
    }
  }
  return 'M50,20 A10,10 0 1,0 50,40 M50,40 L50,70 M50,50 L30,60 M50,50 L70,60 M50,70 L35,95 M50,70 L65,95';
}

/**
 * Generates an SVG 3x3 character sheet data URI
 */
function generateCompositeSheetSvg(
  archetype: string,
  style: string,
  markerColor = '#1E293B'
): string {
  const bgColor = style === 'blackboard_chalk' ? '#0F172A' : style === 'blueprint' ? '#0B2447' : '#FFFFFF';
  const strokeColor = style === 'blackboard_chalk' ? '#E2E8F0' : style === 'blueprint' ? '#67E8F9' : markerColor;

  let poseCellsSvg = '';
  POSE_DEFINITIONS.forEach((def, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const originX = col * 333.33;
    const originY = row * 333.33;
    const path = getVectorPathForPose(archetype, def.id);

    poseCellsSvg += `
      <g transform="translate(${originX}, ${originY})">
        <rect x="5" y="5" width="323.33" height="323.33" fill="none" stroke="${strokeColor}" stroke-opacity="0.15" stroke-dasharray="4,4" rx="8" />
        <text x="16" y="28" font-family="sans-serif" font-size="14" font-weight="600" fill="${strokeColor}" fill-opacity="0.7">${def.id}: ${def.name}</text>
        <g transform="translate(66.66, 50) scale(2)">
          <path d="${path}" fill="none" stroke="${strokeColor}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      </g>
    `;
  });

  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
    <rect width="1000" height="1000" fill="${bgColor}" />
    <text x="500" y="30" font-family="sans-serif" font-size="16" font-weight="bold" fill="${strokeColor}" text-anchor="middle" fill-opacity="0.5">CHARACTER REFERENCE SHEET: ${archetype.toUpperCase()} (9-POSE GRID)</text>
    ${poseCellsSvg}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(fullSvg)}`;
}

export class GeminiCharacterGenerator {
  /**
   * Generates a consistent 9-pose character reference sheet.
   * Leverages Google Gemini if API key is present; otherwise produces
   * deterministic high-contrast vector line-art representations.
   */
  async generateCharacterSheet(options: GenerateSheetOptions): Promise<CharacterReferenceSheet> {
    const rawArchetype = (options.archetype || 'stickman').toLowerCase().trim();
    const archetype: WhiteboardArchetype = KNOWN_ARCHETYPES.includes(rawArchetype as WhiteboardArchetype)
      ? (rawArchetype as WhiteboardArchetype)
      : 'stickman';

    const style: WhiteboardStyle = (options.style as WhiteboardStyle) || 'monoline_marker';
    const customDescription = options.customDescription || (archetype === 'custom' ? 'Custom persona with expressive line-art gestures' : undefined);
    const characterId = `char_${archetype.replace(/\s+/g, '_')}_${Date.now()}`;

    // 1. Check for live API generation if mock is not explicitly requested
    if (!options.mock) {
      try {
        const liveSheet = await this.generateWithOmniroute(
          archetype,
          customDescription,
          style,
          characterId
        );
        if (liveSheet) {
          return liveSheet;
        }
      } catch (err: any) {
        console.warn(`[GeminiCharacterGenerator] Live Omniroute API call failed (${err?.message || err}). Falling back to deterministic vector generator.`);
      }
    }

    // 2. Deterministic high-quality vector reference sheet
    return this.generateDeterministicSheet(archetype, customDescription, style, characterId);
  }

  /**
   * Calls Omniroute REST API to construct structured character reference sheet descriptors
   */
  private async generateWithOmniroute(
    archetype: WhiteboardArchetype,
    customDescription: string | undefined,
    style: WhiteboardStyle,
    characterId: string
  ): Promise<CharacterReferenceSheet | null> {
    const prompt = `You are a professional character animator and whiteboard storyboard illustrator.
Generate a structured 9-pose character reference sheet for archetype: "${archetype}".
${customDescription ? `Custom character details: "${customDescription}".` : ''}
Visual Style: "${style}" (monoline marker line-art, 3x3 uniform orthographic grid, black on pure white, high-contrast, zero fills).

Return a strictly valid JSON object with the following schema:
{
  "characterId": "${characterId}",
  "archetype": "${archetype}",
  "customDescription": "${customDescription || ''}",
  "poses": {
    "pose_1": { "name": "neutral", "description": "...", "bbox": [0, 0, 333, 333] },
    "pose_2": { "name": "pointing", "description": "...", "bbox": [333, 0, 666, 333] },
    "pose_3": { "name": "eureka", "description": "...", "bbox": [666, 0, 1000, 333] },
    "pose_4": { "name": "explaining", "description": "...", "bbox": [0, 333, 333, 666] },
    "pose_5": { "name": "reading", "description": "...", "bbox": [333, 333, 666, 666] },
    "pose_6": { "name": "confused", "description": "...", "bbox": [666, 333, 1000, 666] },
    "pose_7": { "name": "sitting", "description": "...", "bbox": [0, 666, 333, 1000] },
    "pose_8": { "name": "writing", "description": "...", "bbox": [333, 666, 666, 1000] },
    "pose_9": { "name": "blessing", "description": "...", "bbox": [666, 666, 1000, 1000] }
  }
}`;

    const url = `http://localhost:20128/v1/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-1.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      throw new Error(`Omniroute API returned status ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content;
    if (!rawText) return null;

    const parsed = JSON.parse(rawText);
    const poses: Record<string, CharacterPose> = {};

    POSE_DEFINITIONS.forEach((def) => {
      const fromGemini = parsed?.poses?.[def.id] || {};
      poses[def.id] = {
        name: fromGemini.name || def.name,
        description: fromGemini.description || def.defaultDesc,
        bbox: POSE_GRID_BBOXES[def.id],
        svgPath: getVectorPathForPose(archetype, def.id),
      };
    });

    const sheetImageUrl = generateCompositeSheetSvg(archetype, style);

    return {
      characterId,
      archetype,
      customDescription,
      sheetImageUrl,
      poses,
      style,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Generates deterministic character sheet with exact 9 poses and vector SVGs
   */
  private generateDeterministicSheet(
    archetype: WhiteboardArchetype,
    customDescription: string | undefined,
    style: WhiteboardStyle,
    characterId: string
  ): CharacterReferenceSheet {
    const poses: Record<string, CharacterPose> = {};

    POSE_DEFINITIONS.forEach((def) => {
      let desc = def.defaultDesc;
      if (archetype === 'saint') {
        desc = `Saintly figure in robed vestments: ${def.name}`;
      } else if (archetype === 'scientist') {
        desc = `Lab-coated researcher with apparatus: ${def.name}`;
      } else if (archetype === 'doctor') {
        desc = `Physician in stethoscope attire: ${def.name}`;
      } else if (archetype === 'teacher') {
        desc = `Educator with chalkboard accessory: ${def.name}`;
      } else if (archetype === 'founder') {
        desc = `Executive startup presenter: ${def.name}`;
      } else if (archetype === 'old man') {
        desc = `Wise elder with cane and glasses: ${def.name}`;
      } else if (customDescription) {
        desc = `${customDescription}: ${def.name}`;
      }

      poses[def.id] = {
        name: def.name,
        description: desc,
        bbox: POSE_GRID_BBOXES[def.id],
        svgPath: getVectorPathForPose(archetype, def.id),
      };
    });

    const sheetImageUrl = generateCompositeSheetSvg(archetype, style);

    return {
      characterId,
      archetype,
      customDescription,
      sheetImageUrl,
      poses,
      style,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Maps text, sentiment, or script segment keywords to the best matching character pose (pose_1 to pose_9)
   */
  mapSentimentToPose(textOrSentiment: string): string {
    const lower = (textOrSentiment || '').toLowerCase();

    if (/eureka|idea|lightbulb|spark|discovery|breakthrough|aha|incredible|amazing/i.test(lower)) {
      return 'pose_3'; // eureka
    }
    if (/point|here|look|specifically|important|step|first|second|third|notice|observe/i.test(lower)) {
      return 'pose_2'; // pointing
    }
    if (/explain|because|how|works|understand|process|means|system|function/i.test(lower)) {
      return 'pose_4'; // explaining
    }
    if (/read|history|study|research|according|document|source|records|book/i.test(lower)) {
      return 'pose_5'; // reading
    }
    if (/why|confus|wonder|puzzle|mysterious|question|unknown|problem|challenge|difficult/i.test(lower)) {
      return 'pose_6'; // confused
    }
    if (/sit|relax|meditat|calm|think|ponder|settle|focus|table/i.test(lower)) {
      return 'pose_7'; // sitting
    }
    if (/write|note|record|inscribe|list|formula|equation|code|draft/i.test(lower)) {
      return 'pose_8'; // writing
    }
    if (/bless|peace|triumph|success|celebrate|finally|wisdom|conclusion|greatest|mastery/i.test(lower)) {
      return 'pose_9'; // blessing
    }

    return 'pose_1'; // neutral
  }

  /**
   * Helper to retrieve a pose by ID or name
   */
  getPose(sheet: CharacterReferenceSheet, poseIdentifier: string): CharacterPose | undefined {
    if (!sheet || !sheet.poses) return undefined;
    if (sheet.poses[poseIdentifier]) return sheet.poses[poseIdentifier];

    const match = Object.values(sheet.poses).find(
      (p) => p.name.toLowerCase() === poseIdentifier.toLowerCase()
    );
    return match;
  }

  /**
   * Returns list of supported archetype definitions
   */
  listArchetypes(): Array<{ id: WhiteboardArchetype; name: string; description: string }> {
    return [
      { id: 'stickman', name: 'Stickman Classic', description: 'Timeless minimalist line-drawn stickman' },
      { id: 'saint', name: 'Saint / Philosopher', description: 'Robed historical elder with wisdom gestures' },
      { id: 'old man', name: 'Elder Professor', description: 'Wise old man with glasses and walking cane' },
      { id: 'founder', name: 'Startup Founder', description: 'Sharp executive presenter with modern look' },
      { id: 'doctor', name: 'Medical Doctor', description: 'Clinical physician with stethoscope and lab coat' },
      { id: 'teacher', name: 'Academic Teacher', description: 'Engaging educator with chalkboard pointers' },
      { id: 'scientist', name: 'Lab Scientist', description: 'Researcher with safety goggles and beakers' },
      { id: 'custom', name: 'Custom Character', description: 'Bespoke character generated from prompt' },
    ];
  }
}

export const geminiCharacterGenerator = new GeminiCharacterGenerator();
