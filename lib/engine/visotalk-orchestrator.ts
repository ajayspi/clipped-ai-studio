/**
 * VisoTalk Declarative Word-Anchored Narration Timeline Engine
 * 
 * Inspired by visotalk/visotalk: "Narration is the Timeline".
 * Visual elements, callouts, and transitions anchor directly to spoken words
 * rather than arbitrary absolute timestamps, ensuring 100% synchronization
 * across speech rates, TTS voice swaps, and multilingual dubbing.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type VisoMotionType = 'pop' | 'wipe' | 'fade' | 'slide_up' | 'circle' | 'highlight';

export interface WordTiming {
  index: number;
  word: string;
  startMs: number;
  endMs: number;
  cleanWord: string; // stripped of punctuation
}

export interface WordAnchorCue {
  id: string;
  targetWordIndex: number;
  targetWord: string;
  motion: VisoMotionType;
  label?: string;
  color?: string;
  payload?: Record<string, unknown>;
}

export interface VisoBeat {
  id: string;
  lineId: string;
  narrationText: string;
  words: WordTiming[];
  audioUrl?: string;
  totalDurationMs: number;
  cues: WordAnchorCue[];
}

export interface VisoDocument {
  title: string;
  author?: string;
  beats: VisoBeat[];
  settings?: {
    voice?: string;
    language?: string;
    speed?: number;
    theme?: 'cyber_dark' | 'paper_warm' | 'slate_minimal';
  };
}

export interface ActiveWordState {
  activeWordIndex: number;
  activeWord: string;
  activeCues: WordAnchorCue[];
  progress: number; // 0.0 to 1.0 within beat
  isFinished: boolean;
}

// ============================================================================
// Word Timing Alignment (Deterministic Syllable / Duration Fallback)
// ============================================================================

/**
 * Aligns words to a total duration with syllable-weighting and punctuation pauses.
 * If external word timestamps (from Whisper or Kokoro/ElevenLabs TTS) are provided,
 * normalizes them; otherwise computes deterministic natural speech cadence.
 */
export function alignWordsToNarration(
  narrationText: string,
  totalDurationSeconds: number,
  providedTimings?: Array<{ word: string; start: number; end: number }>
): WordTiming[] {
  if (providedTimings && providedTimings.length > 0) {
    return providedTimings.map((pt, idx) => ({
      index: idx,
      word: pt.word,
      startMs: Math.round(pt.start * 1000),
      endMs: Math.round(pt.end * 1000),
      cleanWord: pt.word.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').toLowerCase(),
    }));
  }

  // Tokenize words while preserving attached punctuation
  const tokens = narrationText.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const totalMs = totalDurationSeconds * 1000;

  // Weight words by length and punctuation pauses (commas = +150ms, periods = +300ms)
  const weights: number[] = [];
  let totalWeight = 0;

  for (const token of tokens) {
    let weight = Math.max(1, token.length);
    if (/[.,!?;:]$/.test(token)) {
      weight += token.endsWith('.') || token.endsWith('!') || token.endsWith('?') ? 4 : 2;
    }
    weights.push(weight);
    totalWeight += weight;
  }

  const msPerWeight = totalMs / totalWeight;
  const wordTimings: WordTiming[] = [];
  let currentMs = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const duration = weights[i] * msPerWeight;
    const startMs = Math.round(currentMs);
    const endMs = Math.min(totalMs, Math.round(currentMs + duration));

    wordTimings.push({
      index: i,
      word: token,
      startMs,
      endMs,
      cleanWord: token.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').toLowerCase(),
    });

    currentMs += duration;
  }

  return wordTimings;
}

// ============================================================================
// Declarative Markup Parser (<Beat>, <Line>, <Appear>)
// ============================================================================

/**
 * Parses VisoTalk declarative markup into a structured VisoDocument.
 * Supports syntax:
 *   <Beat id="intro">
 *     <Line id="l1">
 *       Setting up a <Appear on="py_badge" motion="pop">Python project</Appear> requires tools.
 *     </Line>
 *   </Beat>
 */
export function parseVisoDocument(docMarkup: string, defaultDurationSeconds = 5.0): VisoDocument {
  const beats: VisoBeat[] = [];
  const beatMatches = docMarkup.matchAll(/<Beat\s+id=["']([^"']+)["']>([\s\S]*?)<\/Beat>/g);

  for (const beatMatch of beatMatches) {
    const beatId = beatMatch[1];
    const beatBody = beatMatch[2];

    const lineMatch = beatBody.match(/<Line\s+id=["']([^"']+)["']>([\s\S]*?)<\/Line>/);
    const lineId = lineMatch ? lineMatch[1] : `line_${beatId}`;
    const rawLineContent = lineMatch ? lineMatch[2] : beatBody;

    // Extract <Appear on="..." motion="...">...</Appear> cues
    const cues: WordAnchorCue[] = [];
    let cleanText = rawLineContent;

    const appearMatches = rawLineContent.matchAll(
      /<Appear\s+on=["']([^"']+)["'](?:\s+motion=["']([^"']+)["'])?(?:\s+label=["']([^"']+)["'])?>([\s\S]*?)<\/Appear>/g
    );

    for (const appMatch of appearMatches) {
      const cueId = appMatch[1];
      const motion = (appMatch[2] as VisoMotionType) || 'pop';
      const label = appMatch[3] || cueId;
      const anchoredPhrase = appMatch[4].trim();

      // Estimate anchored word target
      cues.push({
        id: cueId,
        targetWordIndex: 0, // calculated below after word tokenization
        targetWord: anchoredPhrase,
        motion,
        label,
      });

      // Strip <Appear> tags from narration text
      cleanText = cleanText.replace(appMatch[0], anchoredPhrase);
    }

    const narrationText = cleanText.replace(/\s+/g, ' ').trim();
    const words = alignWordsToNarration(narrationText, defaultDurationSeconds);

    // Map cue targetWordIndex based on clean word matching
    for (const cue of cues) {
      const targetFirstWord = cue.targetWord.split(/\s+/)[0]?.toLowerCase().replace(/[^\w]/g, '');
      const matchIndex = words.findIndex((w) => w.cleanWord === targetFirstWord);
      cue.targetWordIndex = matchIndex !== -1 ? matchIndex : 0;
    }

    beats.push({
      id: beatId,
      lineId,
      narrationText,
      words,
      totalDurationMs: defaultDurationSeconds * 1000,
      cues,
    });
  }

  // Fallback if no <Beat> tags found
  if (beats.length === 0) {
    const narrationText = docMarkup.replace(/<[^>]+>/g, '').trim() || 'Welcome to VisoTalk Explainer';
    const words = alignWordsToNarration(narrationText, defaultDurationSeconds);
    beats.push({
      id: 'default_beat',
      lineId: 'default_line',
      narrationText,
      words,
      totalDurationMs: defaultDurationSeconds * 1000,
      cues: [],
    });
  }

  return {
    title: 'VisoTalk Document',
    beats,
  };
}

// ============================================================================
// Real-Time Frame & Word Evaluator
// ============================================================================

/**
 * Given a beat and a playback timestamp in milliseconds, evaluates the active word
 * and any triggered visual cues.
 */
export function evaluateActiveWordAndCues(beat: VisoBeat, currentTimeMs: number): ActiveWordState {
  const clampedTime = Math.max(0, Math.min(currentTimeMs, beat.totalDurationMs));
  const progress = beat.totalDurationMs > 0 ? clampedTime / beat.totalDurationMs : 0;
  const isFinished = currentTimeMs >= beat.totalDurationMs;

  let activeWordIndex = 0;
  let activeWord = beat.words[0]?.word || '';

  for (let i = 0; i < beat.words.length; i++) {
    const w = beat.words[i];
    if (clampedTime >= w.startMs && clampedTime < w.endMs) {
      activeWordIndex = i;
      activeWord = w.word;
      break;
    } else if (clampedTime >= w.endMs) {
      activeWordIndex = i;
      activeWord = w.word;
    }
  }

  // Active cues: any cues whose target word index has already been spoken
  const activeCues = beat.cues.filter((c) => activeWordIndex >= c.targetWordIndex);

  return {
    activeWordIndex,
    activeWord,
    activeCues,
    progress,
    isFinished,
  };
}

// ============================================================================
// Curated VisoTalk Presets
// ============================================================================

export const VISOTALK_PRESETS: Record<string, { title: string; description: string; markup: string; duration: number }> = {
  python_tooling: {
    title: "Python Modern Project Setup",
    description: "Explains uv, virtual environments, and PyPI packaging with word-anchored badge animations",
    duration: 6.0,
    markup: `<Beat id="intro">
  <Line id="l1">
    Setting up a <Appear on="badge_python" motion="pop" label="Python 3.12">Python project</Appear> in 2026 no longer requires juggling multiple tools. With <Appear on="badge_uv" motion="wipe" label="uv fast pkg">modern package managers</Appear>, dependency resolution is instantaneous and <Appear on="badge_lock" motion="circle" label="100% Deterministic">fully reproducible</Appear>.
  </Line>
</Beat>`,
  },
  nextjs_app_router: {
    title: "Next.js 16 Server Components & Streaming",
    description: "Visualizes React Server Components (RSC) rendering and Suspense hydration boundaries anchored to voice cues",
    duration: 7.0,
    markup: `<Beat id="arch">
  <Line id="l2">
    In Next.js 16, <Appear on="rsc_node" motion="slide_up" label="Server Component">React Server Components</Appear> execute directly on the edge. Client bundles only hydrate when <Appear on="suspense_node" motion="pop" label="Suspense Boundary">Suspense boundaries</Appear> stream payload chunks down to the browser.
  </Line>
</Beat>`,
  },
  quantum_superposition: {
    title: "Quantum Superposition & Qubits",
    description: "Demonstrates quantum state probability amplitudes and Bloch sphere rotation synced to narration",
    duration: 6.5,
    markup: `<Beat id="quantum">
  <Line id="l3">
    Unlike a classical bit which is either zero or one, a <Appear on="qubit_sphere" motion="pop" label="|ψ⟩ = α|0⟩ + β|1⟩">quantum qubit</Appear> exists in a coherent superposition until <Appear on="collapse_detector" motion="highlight" label="Wavefunction Collapse">physical measurement</Appear> collapses the state.
  </Line>
</Beat>`,
  },
};

// ============================================================================
// Headless HTML5 Compiler (window.seekToMs & window.seekToWord)
// ============================================================================

/**
 * Compiles a VisoDocument into a self-contained HTML5 file with seekable playback hooks
 * for deterministic headless video rendering workers.
 */
export function generateVisoTalkHtml(doc: VisoDocument): string {
  const jsonDoc = JSON.stringify(doc);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${doc.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #08090d;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      width: 1080px;
      height: 1920px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 80px 60px;
      position: relative;
    }
    .stage {
      width: 100%;
      background: #11131c;
      border: 2px solid rgba(56, 189, 248, 0.25);
      border-radius: 24px;
      padding: 48px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      gap: 36px;
    }
    .words-container {
      font-size: 38px;
      line-height: 1.6;
      color: #64748b;
      word-spacing: 4px;
    }
    .word-token {
      transition: color 0.15s ease, text-shadow 0.15s ease;
      display: inline-block;
      margin-right: 8px;
    }
    .word-active {
      color: #38bdf8;
      font-weight: 700;
      text-shadow: 0 0 12px rgba(56, 189, 248, 0.6);
      transform: scale(1.05);
    }
    .word-spoken {
      color: #f1f5f9;
    }
    .cues-shelf {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      min-height: 80px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 24px;
    }
    .cue-badge {
      background: rgba(16, 185, 129, 0.15);
      border: 1.5px solid #10b981;
      color: #34d399;
      padding: 10px 20px;
      border-radius: 12px;
      font-size: 20px;
      font-weight: 600;
      opacity: 0;
      transform: translateY(12px) scale(0.9);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .cue-active {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  </style>
</head>
<body>
  <div class="stage">
    <div class="words-container" id="wordsMount"></div>
    <div class="cues-shelf" id="cuesMount"></div>
  </div>

  <script>
    const doc = ${jsonDoc};
    const beat = doc.beats[0];
    const wordsMount = document.getElementById('wordsMount');
    const cuesMount = document.getElementById('cuesMount');

    // Mount initial DOM
    beat.words.forEach((w, i) => {
      const span = document.createElement('span');
      span.className = 'word-token';
      span.id = 'word-' + i;
      span.innerText = w.word;
      wordsMount.appendChild(span);
    });

    beat.cues.forEach(c => {
      const div = document.createElement('div');
      div.className = 'cue-badge';
      div.id = 'cue-' + c.id;
      div.innerText = '✨ ' + (c.label || c.id);
      cuesMount.appendChild(div);
    });

    function seekToMs(ms) {
      let activeIdx = 0;
      beat.words.forEach((w, i) => {
        const el = document.getElementById('word-' + i);
        if (ms >= w.startMs && ms < w.endMs) {
          el.className = 'word-token word-active';
          activeIdx = i;
        } else if (ms >= w.endMs) {
          el.className = 'word-token word-spoken';
          activeIdx = i;
        } else {
          el.className = 'word-token';
        }
      });

      beat.cues.forEach(c => {
        const el = document.getElementById('cue-' + c.id);
        if (activeIdx >= c.targetWordIndex) {
          el.classList.add('cue-active');
        } else {
          el.classList.remove('cue-active');
        }
      });
    }

    window.seekToMs = seekToMs;
    window.seekToFrame = function(frame, fps = 30) {
      seekToMs((frame / fps) * 1000);
    };

    // Auto-advance loop for browser preview
    let currentMs = 0;
    setInterval(() => {
      currentMs = (currentMs + 33) % beat.totalDurationMs;
      seekToMs(currentMs);
    }, 33);
  </script>
</body>
</html>`;
}
