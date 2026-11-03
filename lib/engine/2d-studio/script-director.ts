// lib/engine/2d-studio/script-director.ts
// Natural Language Script-to-Scene & Generative Props Director.
// Automatically transforms raw narrative scripts into fully staged 2D scenes,
// extracting characters, poses, props, companions, vehicles, and audio cues on the fly.

import { PoseName, FigureOutfit } from './rig2d';
import { AgeTier } from './characters';

export interface ScriptDirectorBeat {
  id: string;
  index: number;
  text: string;
  duration: number; // in seconds
  character: {
    name: string;
    role: string;
    ageTier: AgeTier;
    gender: 'male' | 'female';
    expression: 'thinking' | 'shocked' | 'angry' | 'smirk' | 'smile' | 'scared' | 'determined';
    pose: PoseName | 'walk';
    outfit: {
      top: NonNullable<FigureOutfit['top']>;
      color: string;
      head: NonNullable<FigureOutfit['head']>;
    };
  };
  props: {
    held: string | 'none';
    secondary: string | 'none';
    ambient: 'cashRain' | 'none';
  };
  companion: {
    type: 'none' | 'dog' | 'cat';
    breed?: 'labrador' | 'husky' | 'shiba';
    pose?: 'stand' | 'sit' | 'walk' | 'run' | 'play' | 'loaf';
  };
  vehicle: {
    type: 'none' | 'sportsCar' | 'sedan' | 'suv' | 'truck';
    color: string;
  };
  mood: 'dusk' | 'midnight' | 'golden' | 'neon' | 'storybook';
  sfx: string;
  overlay: 'none' | 'counter' | 'matrix' | 'timer';
  overlayData?: Record<string, unknown>;
}

export interface ScriptDirectorProject {
  title: string;
  rawScript: string;
  beats: ScriptDirectorBeat[];
  totalDuration: number;
  extractedPropsCount: number;
}

// ============================================================================
// KEYWORD & HEURISTIC DICTIONARIES
// ============================================================================

const PROP_KEYWORDS: Record<string, string[]> = {
  phone: ['phone', 'call', 'text', 'screen', 'notification', 'dial', 'smartphone', 'mobile', 'ring'],
  laptop: ['laptop', 'computer', 'code', 'coding', 'chart', 'stocks', 'trading', 'crypto', 'dashboard', 'screen', 'terminal'],
  cash: ['money', 'cash', 'dollars', 'rich', 'wealth', 'million', 'billion', 'earn', 'paid', 'income', 'funds'],
  coinTower: ['coins', 'gold', 'crypto', 'tokens', 'stack', 'tokens'],
  briefcase: ['briefcase', 'deal', 'contract', 'executive', 'documents', 'portfolio', 'investment'],
  sword: ['sword', 'blade', 'fight', 'battle', 'strike', 'combat', 'attack', 'slay', 'weapon'],
  shield: ['shield', 'defend', 'block', 'protect', 'defense', 'guard'],
  flask: ['flask', 'chemical', 'chemistry', 'lab', 'scientist', 'potion', 'formula', 'experiment', 'beaker', 'mix'],
  coffee: ['coffee', 'tea', 'cup', 'mug', 'sip', 'caffeine', 'espresso', 'morning'],
  ideaBulb: ['idea', 'eureka', 'realized', 'realize', 'solution', 'thought', 'invent', 'innovation', 'brainstorm'],
  microphone: ['microphone', 'mic', 'speech', 'podcast', 'announce', 'interview', 'talk', 'stage'],
  magnifyingGlass: ['clue', 'detective', 'investigate', 'search', 'inspect', 'mystery', 'evidence', 'crime'],
  gavel: ['court', 'judge', 'verdict', 'law', 'ruling', 'order', 'trial', 'justice'],
  trophy: ['trophy', 'win', 'champion', 'victory', 'award', 'first place', 'success', 'celebrate'],
  book: ['book', 'read', 'library', 'study', 'research', 'guide', 'manual', 'scripture', 'ancient'],
  clock: ['clock', 'time', 'hours', 'seconds', 'late', 'countdown', 'deadline', 'ticking'],
  umbrella: ['umbrella', 'rain', 'storm', 'weather', 'downpour', 'shelter'],
  key: ['key', 'secret', 'vault', 'access', 'unlock', 'door', 'lock'],
};

const SFX_KEYWORDS: Record<string, string[]> = {
  impact: ['boom', 'crash', 'slam', 'hit', 'blast', 'destroy', 'collapse'],
  whoosh: ['fast', 'speed', 'rush', 'suddenly', 'quick', 'zoom', 'fly'],
  pop: ['appear', 'reveal', 'spawn', 'pop', 'cash', 'buy', 'unlock'],
  ding: ['idea', 'realize', 'eureka', 'ding', 'spark', 'discovery', 'clever'],
  phonebuzz: ['call', 'buzz', 'vibrate', 'message', 'alert'],
  clock: ['time', 'tick', 'wait', 'hours', 'countdown', 'delay'],
  cheer: ['win', 'crowd', 'celebrate', 'victory', 'champion', 'applause'],
  stinger: ['danger', 'shock', 'twist', 'dark', 'threat', 'betrayal', 'ominous'],
  carpass: ['drive', 'car', 'highway', 'speeding', 'engine', 'away'],
  slowmo: ['slow', 'freeze', 'stop', 'standstill', 'hesitate'],
};

const EMOTION_KEYWORDS: Record<ScriptDirectorBeat['character']['expression'], string[]> = {
  shocked: ['shocked', 'surprised', 'gasp', 'unbelievable', 'insane', 'suddenly', 'what', 'impossible'],
  angry: ['angry', 'furious', 'rage', 'fight', 'screamed', 'threatened', 'hate'],
  smirk: ['smirk', 'clever', 'trick', 'mastermind', 'scheme', 'genius', 'wealthy', 'won'],
  smile: ['happy', 'smiled', 'joy', 'excited', 'loved', 'delighted', 'celebrate'],
  scared: ['scared', 'fear', 'terrified', 'run', 'escape', 'panic', 'hiding'],
  determined: ['determined', 'ready', 'focus', 'resolve', 'train', 'vowed', 'confident'],
  thinking: ['wondered', 'analyzed', 'calculated', 'thought', 'ponder', 'curious', 'question'],
};

const POSE_KEYWORDS: Record<ScriptDirectorBeat['character']['pose'], string[]> = {
  walk: ['walk', 'walking', 'approached', 'step', 'paces', 'moving'],
  holdFront: ['point', 'look at', 'show', 'explained', 'indicated', 'presented'],
  shrug: ['celebrated', 'screamed', 'hands up', 'cheered', 'rejoiced', 'surrender'],
  reach: ['grab', 'reached', 'took', 'picked up', 'grasped', 'held out'],
  sit: ['sat', 'sitting', 'chair', 'desk', 'laptop', 'office'],
  ready: ['ready', 'stance', 'defend', 'armed', 'squared up'],
  stand: ['stood', 'waited', 'stopped', 'stood firm'],
  relaxed: ['chill', 'relaxed', 'easy'],
  phone: ['on phone', 'calling'],
  sad: ['crying', 'sad', 'mourn', 'depressed'],
  facepalm: ['facepalm', 'embarrassed', 'cringe', 'regret'],
  crouch: ['crouch', 'duck', 'hide', 'low'],
  sitBack: ['leaned back', 'relaxed in chair'],
  kneel: ['kneel', 'begged', 'pleaded', 'bow'],
  lie: ['lying', 'fallen', 'ground'],
  dive: ['dive', 'leap', 'plunge'],
  kick: ['kick', 'kicking', 'strike'],
  jump: ['jump', 'jumping', 'leap up'],
  fall: ['fall', 'falling', 'collapse', 'trip'],
};

// ============================================================================
// SCRIPT ANALYZER ENGINE
// ============================================================================

export function analyzeScriptToBeats(rawScript: string): ScriptDirectorProject {
  const clean = rawScript.trim();
  if (!clean) {
    return {
      title: 'Untitled Video',
      rawScript: '',
      beats: [],
      totalDuration: 0,
      extractedPropsCount: 0,
    };
  }

  // 1. Segment script into beats
  // Split on scene markers [Scene X], Beat X, numbered lines, or sentence groupings
  let rawSegments: string[] = [];

  if (clean.includes('[Scene') || clean.includes('Scene ') || clean.includes('Beat ')) {
    rawSegments = clean
      .split(/(?=\[?(?:Scene|Beat)\s*\d+[:\]]?)/i)
      .map((s) => s.replace(/^\[?(?:Scene|Beat)\s*\d+[:\]]?\s*/i, '').trim())
      .filter(Boolean);
  } else if (clean.includes('\n\n')) {
    rawSegments = clean
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    // Split into sentences (2-3 sentences per beat for optimal 8-10s Shorts pacing)
    const sentences = clean
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const chunked: string[] = [];
    let current = '';
    for (const sent of sentences) {
      if (current && (current.split(' ').length + sent.split(' ').length > 25)) {
        chunked.push(current);
        current = sent;
      } else {
        current = current ? `${current} ${sent}` : sent;
      }
    }
    if (current) chunked.push(current);
    rawSegments = chunked.length > 0 ? chunked : [clean];
  }

  let totalPropsFound = 0;
  const beats: ScriptDirectorBeat[] = [];

  rawSegments.forEach((segmentText, idx) => {
    const textLower = segmentText.toLowerCase();
    const wordCount = segmentText.split(/\s+/).length;
    // Pacing: roughly 2.6 words/sec, clamped to 5s min, 12s max per YouTube Shorts formula
    const duration = Math.min(12, Math.max(5, Math.round(wordCount / 2.6)));

    // A. Detect Props
    const detectedProps: string[] = [];
    for (const [propName, keywords] of Object.entries(PROP_KEYWORDS)) {
      if (keywords.some((kw) => textLower.includes(kw))) {
        detectedProps.push(propName);
      }
    }

    // Cash rain check
    const isCashRain =
      textLower.includes('rain') ||
      textLower.includes('sky') ||
      textLower.includes('millions') ||
      textLower.includes('billion') ||
      textLower.includes('shower') ||
      (textLower.includes('money') && textLower.includes('everywhere'));

    const heldProp = detectedProps[0] || 'none';
    const secondaryProp = detectedProps[1] || 'none';
    if (heldProp !== 'none') totalPropsFound++;
    if (secondaryProp !== 'none') totalPropsFound++;
    if (isCashRain) totalPropsFound++;

    // B. Detect Age Tier & Role
    let ageTier: AgeTier = 'adult';
    let role = 'Everyman';
    let gender: 'male' | 'female' = 'male';

    if (textLower.includes('grandpa') || textLower.includes('elder') || textLower.includes('old man') || textLower.includes('grandmother') || textLower.includes('cane')) {
      ageTier = 'elderly';
      role = 'Elder Storyteller';
    } else if (textLower.includes('toddler') || textLower.includes('baby') || textLower.includes('crawl')) {
      ageTier = 'toddler';
      role = 'Curious Chibi';
    } else if (textLower.includes('kid') || textLower.includes('child') || textLower.includes('school') || textLower.includes('boy') || textLower.includes('girl')) {
      ageTier = 'child';
      role = 'Young Adventurer';
    } else if (textLower.includes('teen') || textLower.includes('student') || textLower.includes('college')) {
      ageTier = 'teen';
      role = 'Slouching Teen';
    }

    // Role heuristics
    if (textLower.includes('scientist') || textLower.includes('doctor') || textLower.includes('lab') || textLower.includes('researcher')) {
      role = 'Mad Scientist';
    } else if (textLower.includes('detective') || textLower.includes('inspector') || textLower.includes('crime') || textLower.includes('noir')) {
      role = 'Noir Detective';
    } else if (textLower.includes('trader') || textLower.includes('investor') || textLower.includes('billionaire') || textLower.includes('ceo') || textLower.includes('business')) {
      role = 'Wall Street Mogul';
    } else if (textLower.includes('knight') || textLower.includes('warrior') || textLower.includes('soldier') || textLower.includes('blade')) {
      role = 'Valiant Knight';
    } else if (textLower.includes('judge') || textLower.includes('court') || textLower.includes('lawyer')) {
      role = 'Chief Magistrate';
    }

    if (textLower.includes('woman') || textLower.includes('girl') || textLower.includes('she ') || textLower.includes('her ') || textLower.includes('female')) {
      gender = 'female';
    }

    // Outfit choice
    let outfitTop: NonNullable<FigureOutfit['top']> = 'hoodie';
    let outfitColor = '#f59e0b';
    let outfitHead: NonNullable<FigureOutfit['head']> = 'none';

    if (role === 'Wall Street Mogul') {
      outfitTop = 'suit';
      outfitColor = '#1e293b';
    } else if (role === 'Mad Scientist') {
      outfitTop = 'labcoat';
      outfitColor = '#e2e8f0';
    } else if (role === 'Noir Detective') {
      outfitTop = 'trench';
      outfitColor = '#78350f';
      outfitHead = 'fedora';
    } else if (role === 'Valiant Knight') {
      outfitTop = 'tshirt';
      outfitColor = '#94a3b8';
      outfitHead = 'beanie';
    } else if (gender === 'female' && ageTier === 'adult') {
      outfitTop = 'dress';
      outfitColor = '#ec4899';
    }

    // C. Detect Emotion Expression
    let expression: ScriptDirectorBeat['character']['expression'] = 'thinking';
    for (const [expr, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      if (keywords.some((kw) => textLower.includes(kw))) {
        expression = expr as ScriptDirectorBeat['character']['expression'];
        break;
      }
    }

    // D. Detect Pose
    let pose: ScriptDirectorBeat['character']['pose'] = 'stand';
    for (const [p, keywords] of Object.entries(POSE_KEYWORDS)) {
      if (keywords.some((kw) => textLower.includes(kw))) {
        pose = p as ScriptDirectorBeat['character']['pose'];
        break;
      }
    }

    // E. Detect Animal Companion
    let companionType: ScriptDirectorBeat['companion']['type'] = 'none';
    let animalBreed: ScriptDirectorBeat['companion']['breed'] = 'labrador';
    let animalPose: ScriptDirectorBeat['companion']['pose'] = 'stand';

    if (textLower.includes('dog') || textLower.includes('puppy') || textLower.includes('hound') || textLower.includes('husky')) {
      companionType = 'dog';
      animalBreed = textLower.includes('husky') ? 'husky' : textLower.includes('shiba') ? 'shiba' : 'labrador';
      animalPose = textLower.includes('run') ? 'run' : textLower.includes('play') || textLower.includes('bark') ? 'play' : 'stand';
    } else if (textLower.includes('cat') || textLower.includes('kitten') || textLower.includes('feline')) {
      companionType = 'cat';
      animalPose = textLower.includes('sleep') || textLower.includes('loaf') ? 'loaf' : 'sit';
    }

    // F. Detect Vehicle
    let vehicleType: ScriptDirectorBeat['vehicle']['type'] = 'none';
    let vehicleColor = '#ef4444';

    if (textLower.includes('car') || textLower.includes('drive') || textLower.includes('speed') || textLower.includes('highway') || textLower.includes('lamborghini') || textLower.includes('ferrari')) {
      vehicleType = textLower.includes('truck') ? 'truck' : textLower.includes('suv') ? 'suv' : 'sportsCar';
      vehicleColor = textLower.includes('blue') ? '#2563eb' : textLower.includes('black') ? '#0f172a' : '#ef4444';
    }

    // G. Detect Lighting Mood
    let mood: ScriptDirectorBeat['mood'] = 'dusk';
    if (textLower.includes('night') || textLower.includes('dark') || textLower.includes('shadow') || textLower.includes('midnight') || textLower.includes('hacker')) {
      mood = 'midnight';
    } else if (textLower.includes('neon') || textLower.includes('cyber') || textLower.includes('future') || textLower.includes('matrix')) {
      mood = 'neon';
    } else if (textLower.includes('gold') || textLower.includes('sun') || textLower.includes('dawn') || textLower.includes('morning') || textLower.includes('rich')) {
      mood = 'golden';
    } else if (textLower.includes('magic') || textLower.includes('fairy') || textLower.includes('tale') || textLower.includes('story') || textLower.includes('peaceful')) {
      mood = 'storybook';
    }

    // H. Detect SFX Audio Cue
    let sfx = 'whoosh';
    for (const [sfxName, keywords] of Object.entries(SFX_KEYWORDS)) {
      if (keywords.some((kw) => textLower.includes(kw))) {
        sfx = sfxName;
        break;
      }
    }

    // I. Analytical Overlay
    let overlay: ScriptDirectorBeat['overlay'] = 'none';
    if (textLower.includes('matrix') || textLower.includes('game theory') || textLower.includes('payoff') || textLower.includes('cooperate') || textLower.includes('defect')) {
      overlay = 'matrix';
    } else if (textLower.includes('ratio') || textLower.includes('counter') || textLower.includes('1,000') || textLower.includes('1000') || textLower.includes('population')) {
      overlay = 'counter';
    } else if (textLower.includes('timer') || textLower.includes('countdown') || textLower.includes('seconds left')) {
      overlay = 'timer';
    }

    beats.push({
      id: `beat_${idx + 1}`,
      index: idx + 1,
      text: segmentText,
      duration,
      character: {
        name: role,
        role,
        ageTier,
        gender,
        expression,
        pose,
        outfit: {
          top: outfitTop,
          color: outfitColor,
          head: outfitHead,
        },
      },
      props: {
        held: heldProp,
        secondary: secondaryProp,
        ambient: isCashRain ? 'cashRain' : 'none',
      },
      companion: {
        type: companionType,
        breed: animalBreed,
        pose: animalPose,
      },
      vehicle: {
        type: vehicleType,
        color: vehicleColor,
      },
      mood,
      sfx,
      overlay,
    });
  });

  const totalDuration = beats.reduce((acc, b) => acc + b.duration, 0);

  return {
    title: 'Procedural 2D Story',
    rawScript: clean,
    beats,
    totalDuration,
    extractedPropsCount: totalPropsFound,
  };
}

// Preset demonstration scripts that prove the automatic prop & scene generation
export const SCRIPT_DIRECTOR_PRESETS = [
  {
    name: 'The Wall Street Paradox',
    description: 'High-speed finance story demonstrating laptop trading, cash rain, smartphone alerts, and luxury sports car escape.',
    script: `[Scene 1] A Wall Street trader sat at his laptop staring at stock charts, frantically looking for a breakthrough.
[Scene 2] Suddenly, the crypto market surged and piles of money began raining down from the sky as he cheered with joy.
[Scene 3] His smartphone started buzzing with incoming calls from international billionaires eager to partner.
[Scene 4] He grabbed his gold coin stacks and luxury briefcase, jumping into his red sports car to speed off into the golden sunset.`,
  },
  {
    name: 'The Mad Chemist Experiment',
    description: 'Laboratory mystery showcasing lab flasks, sudden eureka ideas, smoke reactions, and faithful companion dog.',
    script: `[Scene 1] In a dark subterranean laboratory, an eccentric scientist carefully measured glowing chemicals into a glass flask.
[Scene 2] He pondered deeply, wondering if the formula would cure all human fatigue once and for all.
[Scene 3] A bright idea struck him with an eureka spark, causing the formula to bubble and steam violently.
[Scene 4] He celebrated triumphantly while his loyal golden retriever leaped with excitement by his side.`,
  },
  {
    name: 'The Detective & The Missing Key',
    description: 'Atmospheric noir case featuring magnifying glass clues, ticking countdown clocks, and a locked golden vault.',
    script: `[Scene 1] A sharp detective stepped through the dark alleyway, raising his magnifying glass to inspect muddy footprints.
[Scene 2] A ticking pocket watch warned him that only three minutes remained before the suspect fled the city.
[Scene 3] Behind a loose brick, he discovered an antique golden key that unlocked the master conspiracy vault.
[Scene 4] With victory in hand, he held up the championship evidence and stepped into the neon night.`,
  },
  {
    name: 'The Overconfident Day Trader (Choreographed)',
    description: 'Comedic viral screenplay with dynamic staging, snap push camera, jaw-drop reaction, and vinyl scratch punchline pause.',
    script: `[STAGE: 0.25] [ACTION: enter_stage] [POSE: explaining] [CAMERA: slow_zoom_in]
I just found the ultimate secret trading strategy that cannot possibly fail.

[STAGE: 0.45] [ACTION: walk_right] [POSE: pointing] [SFX: pop]
Step one: buy high when everyone is hyping it on Twitter.

[STAGE: 0.5] [POSE: victory] [REACTION: lightbulb] [SFX: cash_register]
Step two: refuse to take profit because we are going straight to the moon!

[STAGE: 0.5] [ACTION: freeze] [POSE: facepalm] [REACTION: jaw_drop] [CAMERA: snap_push] [SFX: record_scratch] [PAUSE: 0.6s]
Wait... why is the chart going backwards?

[STAGE: 0.75] [ACTION: sprint] [POSE: hands_up] [REACTION: sweat_drop] [CAMERA: shake] [SFX: cartoon_boing]
I am now professionally diversified into instant ramen noodles for the next decade.`,
  },
  {
    name: 'The Gym Bro Epiphany (Choreographed)',
    description: 'Physical comedy with dramatic Dutch tilt, heavy metal intent, freeze-frame facepalm, and post-workout sprint.',
    script: `[STAGE: 0.3] [ACTION: walk_right] [POSE: explaining] [CAMERA: slow_zoom_in]
I told myself today was the day I turn into an absolute Greek statue.

[STAGE: 0.5] [POSE: ready] [REACTION: lightbulb] [SFX: ding]
Pre-workout consumed. Heavy metal playlist on maximum volume.

[STAGE: 0.5] [POSE: sitting] [REACTION: sweat_drop] [CAMERA: dutch_tilt] [SFX: thunder]
I looked at the bench press bar... and the bar looked back at me with violent intent.

[STAGE: 0.5] [ACTION: freeze] [POSE: facepalm] [REACTION: jaw_drop] [CAMERA: snap_push] [SFX: record_scratch] [PAUSE: 0.6s]
One warmup rep in... and my soul temporarily left my physical body.

[STAGE: 0.75] [ACTION: sprint] [POSE: hands_up] [CAMERA: shake] [SFX: whoosh]
We are skipping straight to the post-workout protein smoothie!`,
  },
];
