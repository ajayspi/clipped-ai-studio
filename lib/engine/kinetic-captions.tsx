/**
 * Hormozi-Style Kinetic Bouncy Captions & Context-Aware Auto-Emoji Engine
 * 
 * Inspired by vshukla7/remotion-captions-themes and viral short-form retention patterns
 * (Alex Hormozi, MrBeast, OpusClip, CapCut).
 * 
 * Pairs with VisoTalk word timings to provide elastic spring word scaling,
 * high-contrast neon sweeps, and context-aware floating keyword emojis.
 */

import React from 'react';
import type { WordTiming } from './visotalk-orchestrator';

// ============================================================================
// Types & Keyword-to-Emoji Dictionary
// ============================================================================

export type CaptionTheme = 'hormozi_yellow' | 'beast_neon' | 'cyber_cyan' | 'clean_white';

export interface CaptionWordItem extends WordTiming {
  emoji?: string;
}

export interface KineticCaptionStyle {
  theme?: CaptionTheme;
  fontSize?: number;
  highlightColor?: string;
  outlineColor?: string;
  boxColor?: string;
  showEmojis?: boolean;
}

/**
 * High-precision keyword dictionary mapping spoken words to viral floating emojis.
 */
export const KEYWORD_EMOJI_MAP: Record<string, string> = {
  // Money & Wealth
  money: '💸',
  cash: '💵',
  dollar: '💰',
  dollars: '💰',
  rich: '🤑',
  revenue: '📈',
  profit: '💹',
  cost: '💳',
  price: '🏷️',
  pay: '💸',
  expensive: '💎',

  // Fire, Viral & Speed
  fire: '🔥',
  hot: '🔥',
  viral: '🚀',
  rocket: '🚀',
  fast: '⚡',
  speed: '🏎️',
  quick: '⚡',
  explode: '💥',
  growth: '📈',

  // Brain, Thinking & Ideas
  brain: '🧠',
  mind: '🤯',
  think: '🤔',
  smart: '💡',
  idea: '💡',
  secret: '🤫',
  truth: '👁️',
  learn: '📚',
  study: '📝',

  // Warning, Caution & Mistakes
  warning: '⚠️',
  danger: '🚨',
  stop: '🛑',
  bad: '❌',
  wrong: '🚫',
  mistake: '🤦',
  never: '🙅',
  fail: '📉',
  risk: '⚡',

  // Love, Motivation & Success
  love: '❤️',
  win: '🏆',
  winner: '👑',
  success: '🎯',
  goal: '🎯',
  super: '⭐',
  best: '🥇',
  power: '💪',
  strong: '🏋️',
};

// ============================================================================
// Keyword Detection & Word Enhancement
// ============================================================================

/**
 * Enriches WordTiming tokens with context-aware floating emojis based on keyword matching.
 */
export function enrichWordsWithEmojis(words: WordTiming[]): CaptionWordItem[] {
  return words.map((w) => {
    const clean = w.cleanWord.toLowerCase();
    const emoji = KEYWORD_EMOJI_MAP[clean];
    return {
      ...w,
      emoji,
    };
  });
}

/**
 * Returns color tokens for the selected viral caption theme.
 */
export function getCaptionThemeStyles(theme: CaptionTheme = 'hormozi_yellow') {
  switch (theme) {
    case 'beast_neon':
      return {
        highlight: '#38bdf8', // neon cyan
        textShadow: '0 0 20px rgba(56, 189, 248, 0.9), 3px 3px 0px #000, -2px -2px 0px #000',
        stroke: '#000000',
        activeScale: 1.22,
        fontFamily: '"Impact", "Arial Black", -apple-system, sans-serif',
      };
    case 'cyber_cyan':
      return {
        highlight: '#00f0ff', // cyber neon
        textShadow: '0 0 16px rgba(0, 240, 255, 0.8), 2px 2px 0px #050505',
        stroke: '#000000',
        activeScale: 1.18,
        fontFamily: '"Montserrat", "Arial Black", sans-serif',
      };
    case 'clean_white':
      return {
        highlight: '#ffffff',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        stroke: '#111111',
        activeScale: 1.12,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      };
    case 'hormozi_yellow':
    default:
      return {
        highlight: '#facc15', // intense Alex Hormozi yellow
        textShadow: '0 0 22px rgba(250, 204, 21, 0.9), 3px 3px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000',
        stroke: '#000000',
        activeScale: 1.22,
        fontFamily: '"Arial Black", "Impact", -apple-system, sans-serif',
      };
  }
}

// ============================================================================
// React Kinetic Captions Overlay Component
// ============================================================================

export interface HormoziKineticCaptionsProps {
  words: WordTiming[];
  currentTimeMs: number;
  theme?: CaptionTheme;
  fontSize?: number;
  showEmojis?: boolean;
  maxWidth?: number;
}

export const HormoziKineticCaptions: React.FC<HormoziKineticCaptionsProps> = ({
  words,
  currentTimeMs,
  theme = 'hormozi_yellow',
  fontSize = 44,
  showEmojis = true,
  maxWidth = 860,
}) => {
  if (!words || words.length === 0) return null;

  const enrichedWords = enrichWordsWithEmojis(words);
  const themeStyles = getCaptionThemeStyles(theme);

  // Group words into short dynamic 3-5 word pages so captions don't clutter the screen
  const WORDS_PER_PAGE = 4;
  
  // Find current active word index
  let activeIndex = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (currentTimeMs >= w.startMs && currentTimeMs < w.endMs) {
      activeIndex = i;
      break;
    } else if (currentTimeMs >= w.endMs) {
      activeIndex = i;
    }
  }

  const currentPageIndex = Math.floor(activeIndex / WORDS_PER_PAGE);
  const pageWords = enrichedWords.slice(
    currentPageIndex * WORDS_PER_PAGE,
    (currentPageIndex + 1) * WORDS_PER_PAGE
  );

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px 16px',
        maxWidth: `${maxWidth}px`,
        margin: '0 auto',
        textAlign: 'center',
        fontFamily: themeStyles.fontFamily,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {pageWords.map((wordItem) => {
        const isCurrent = wordItem.index === activeIndex;
        const isSpoken = wordItem.index < activeIndex;

        return (
          <div
            key={`word-${wordItem.index}`}
            style={{
              position: 'relative',
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              transform: isCurrent ? `scale(${themeStyles.activeScale})` : 'scale(1)',
              transition: 'transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {/* Context-Aware Floating Bouncing Emoji */}
            {showEmojis && wordItem.emoji && isCurrent && (
              <span
                style={{
                  position: 'absolute',
                  top: '-38px',
                  fontSize: `${fontSize * 0.9}px`,
                  filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))',
                  animation: 'emojiBounce 0.4s ease-out',
                }}
              >
                {wordItem.emoji}
              </span>
            )}

            {/* Word Typography */}
            <span
              style={{
                fontSize: `${fontSize}px`,
                fontWeight: 900,
                color: isCurrent ? themeStyles.highlight : isSpoken ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                textShadow: isCurrent ? themeStyles.textShadow : '2px 2px 0px #000, -2px -2px 0px #000',
                transition: 'color 0.1s ease, text-shadow 0.1s ease',
              }}
            >
              {wordItem.word}
            </span>
          </div>
        );
      })}
    </div>
  );
};
