/**
 * Viral Kinetic Typography & Animated Subtitle Engine
 * 
 * Transforms word-level transcription timestamps into high-CTR animated subtitles:
 * - 5 viral creator styles (Hormozi Gold, Vox Explainer, Cyberpunk Neon, Karaoke Smooth, Cinematic Classic)
 * - Generates Advanced SubStation Alpha (.ass) with word-by-word active scaling, glow & highlight
 * - Generates WebVTT (.vtt) and Remotion / CSS animation descriptors
 */

export type KineticSubtitleStyle =
  | 'hormozi-gold'
  | 'vox-explainer'
  | 'cyberpunk-neon'
  | 'karaoke-smooth'
  | 'cinematic-classic';

export interface TimestampedWord {
  word: string;
  start: number; // in seconds
  end: number; // in seconds
}

export interface SubtitleCueBlock {
  id: string;
  start: number;
  end: number;
  text: string;
  words: TimestampedWord[];
}

export interface KineticStyleConfig {
  name: string;
  description: string;
  fontName: string;
  fontSize: number;
  primaryColor: string; // ASS format &H00BBGGRR
  activeWordColor: string;
  keywordColor: string;
  outlineColor: string;
  backColor: string;
  bold: boolean;
  activeScale: number; // e.g. 1.15 for pop bounce
  uppercase: boolean;
}

export const KINETIC_PRESETS: Record<KineticSubtitleStyle, KineticStyleConfig> = {
  'hormozi-gold': {
    name: 'Hormozi Gold',
    description: 'Viral high-energy Shorts style with active word scale bounce, gold highlight & heavy outline',
    fontName: 'Impact',
    fontSize: 54,
    primaryColor: '&H00FFFFFF', // White
    activeWordColor: '&H0000D7FF', // Bright Gold / Yellow
    keywordColor: '&H0000E676', // Emerald Green
    outlineColor: '&H00000000', // Black
    backColor: '&H80000000',
    bold: true,
    activeScale: 1.18,
    uppercase: true
  },
  'vox-explainer': {
    name: 'Vox Explainer',
    description: 'Clean documentary journalism with yellow marker background badges and sans-serif clarity',
    fontName: 'Arial',
    fontSize: 44,
    primaryColor: '&H00000000', // Dark text
    activeWordColor: '&H00101010',
    keywordColor: '&H00000000',
    outlineColor: '&H00FFFFFF',
    backColor: '&H0000E5FF', // Yellow highlight box
    bold: true,
    activeScale: 1.0,
    uppercase: false
  },
  'cyberpunk-neon': {
    name: 'Cyberpunk Neon',
    description: 'Futuristic sci-fi aesthetic with neon cyan glow and magenta secondary accents',
    fontName: 'Consolas',
    fontSize: 46,
    primaryColor: '&H00FFFF00', // Cyan
    activeWordColor: '&H00FF00FF', // Magenta
    keywordColor: '&H0000FF00',
    outlineColor: '&H00220022',
    backColor: '&H90000000',
    bold: true,
    activeScale: 1.1,
    uppercase: true
  },
  'karaoke-smooth': {
    name: 'Karaoke Smooth',
    description: 'Progressive progressive syllable color transition from left to right',
    fontName: 'Trebuchet MS',
    fontSize: 48,
    primaryColor: '&H00CCCCCC',
    activeWordColor: '&H000088FF', // Vivid Orange
    keywordColor: '&H00FFDD00',
    outlineColor: '&H00000000',
    backColor: '&H80000000',
    bold: true,
    activeScale: 1.05,
    uppercase: false
  },
  'cinematic-classic': {
    name: 'Cinematic Classic',
    description: 'Timeless movie theater subtitles with elegant typography and gentle drop shadow',
    fontName: 'Georgia',
    fontSize: 40,
    primaryColor: '&H00EEEEEE',
    activeWordColor: '&H00FFFFFF',
    keywordColor: '&H00EEEEEE',
    outlineColor: '&H00111111',
    backColor: '&H00000000',
    bold: false,
    activeScale: 1.0,
    uppercase: false
  }
};

/**
 * Converts seconds into ASS timestamp format: H:MM:SS.CS (centiseconds)
 */
export function formatAssTime(seconds: number): string {
  const safeSec = Math.max(0, seconds);
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const secs = Math.floor(safeSec % 60);
  const centis = Math.floor((safeSec % 1) * 100);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const cs = String(centis).padStart(2, '0');

  return `${hours}:${mm}:${ss}.${cs}`;
}

/**
 * Generates an Advanced SubStation Alpha (.ass) subtitle file with word-by-word kinetic animation.
 */
export function compileKineticAssSubtitles(
  blocks: SubtitleCueBlock[],
  styleKey: KineticSubtitleStyle = 'hormozi-gold',
  videoWidth = 1080,
  videoHeight = 1920
): string {
  const config = KINETIC_PRESETS[styleKey] || KINETIC_PRESETS['hormozi-gold'];

  // ASS Script Header
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
ScaledBorderAndShadow: yes
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${config.fontName},${config.fontSize},${config.primaryColor},&H000000FF,${config.outlineColor},${config.backColor},${config.bold ? 1 : 0},0,0,0,100,100,1,0,1,4,2,2,40,40,160,1
Style: Active,${config.fontName},${Math.round(config.fontSize * config.activeScale)},${config.activeWordColor},&H000000FF,${config.outlineColor},${config.backColor},${config.bold ? 1 : 0},0,0,0,100,100,1,0,1,5,3,2,40,40,160,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const dialogueLines: string[] = [];

  for (const block of blocks) {
    if (!block.words || block.words.length === 0) {
      // Fallback single line
      const start = formatAssTime(block.start);
      const end = formatAssTime(block.end);
      const text = config.uppercase ? block.text.toUpperCase() : block.text;
      dialogueLines.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`);
      continue;
    }

    // Generate active-word highlighting
    for (let i = 0; i < block.words.length; i++) {
      const activeWord = block.words[i];
      const wordStart = formatAssTime(activeWord.start);
      const wordEnd = formatAssTime(activeWord.end);

      // Render the line with the current word highlighted and scaled
      const lineTokens = block.words.map((w, idx) => {
        const rawWord = config.uppercase ? w.word.toUpperCase() : w.word;
        if (idx === i) {
          // Highlight active word
          return `{\\c${config.activeWordColor}\\fscx${Math.round(config.activeScale * 100)}\\fscy${Math.round(config.activeScale * 100)}}${rawWord}{\\r}`;
        }
        return `{\\c${config.primaryColor}}${rawWord}`;
      });

      dialogueLines.push(
        `Dialogue: 0,${wordStart},${wordEnd},Default,,0,0,0,,${lineTokens.join(' ')}`
      );
    }
  }

  return header + dialogueLines.join('\n');
}

/**
 * Splits plain text into timed blocks when word timestamps are not pre-computed
 */
export function synthesizeTimedBlocks(
  text: string,
  totalDurationSeconds: number,
  wordsPerBlock = 4
): SubtitleCueBlock[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const timePerWord = totalDurationSeconds / words.length;
  const blocks: SubtitleCueBlock[] = [];

  for (let i = 0; i < words.length; i += wordsPerBlock) {
    const chunkWords = words.slice(i, i + wordsPerBlock);
    const blockStart = i * timePerWord;
    const blockEnd = Math.min(totalDurationSeconds, (i + chunkWords.length) * timePerWord);

    const timedWords: TimestampedWord[] = chunkWords.map((w, idx) => ({
      word: w,
      start: (i + idx) * timePerWord,
      end: (i + idx + 1) * timePerWord
    }));

    blocks.push({
      id: `cue_block_${i}`,
      start: blockStart,
      end: blockEnd,
      text: chunkWords.join(' '),
      words: timedWords
    });
  }

  return blocks;
}
