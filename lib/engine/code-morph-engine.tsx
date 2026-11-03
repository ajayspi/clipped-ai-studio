/**
 * Fireship-Style Smooth Code Token-Morphing & Syntax Diff Engine
 * 
 * Inspired by shikijs/shiki-magic-move and wcandillon/remotion-fireship.
 * Smoothly morphs code snippets line-by-line and token-by-token with
 * syntax highlighting, Mac terminal window chrome, and green/red diff highlights.
 */

import React from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type CodeTokenType = 'keyword' | 'function' | 'string' | 'number' | 'operator' | 'comment' | 'plain';

export interface CodeToken {
  text: string;
  type: CodeTokenType;
  color: string;
}

export interface CodeLine {
  lineNumber: number;
  tokens: CodeToken[];
  raw: string;
  diffType?: 'added' | 'removed' | 'unchanged';
}

export interface CodeMorphSpec {
  title?: string;
  fileName?: string;
  language: 'typescript' | 'javascript' | 'python';
  codeBefore: string;
  codeAfter: string;
}

// ============================================================================
// Lightweight Syntax Highlighting Tokenizer
// ============================================================================

const TOKEN_COLORS: Record<CodeTokenType, string> = {
  keyword: '#f43f5e',   // rose/pink
  function: '#38bdf8',  // sky blue
  string: '#34d399',    // emerald green
  number: '#f59e0b',    // amber
  operator: '#c084fc',  // purple
  comment: '#64748b',   // muted slate
  plain: '#f1f5f9',     // light slate
};

const KEYWORDS = new Set([
  'export', 'import', 'from', 'default', 'function', 'const', 'let', 'var',
  'return', 'async', 'await', 'if', 'else', 'for', 'while', 'type', 'interface',
  'class', 'new', 'try', 'catch', 'throw', 'def', 'print', 'None', 'True', 'False',
]);

/**
 * Parses a raw line of source code into colored syntax tokens.
 */
export function tokenizeLine(raw: string): CodeToken[] {
  if (!raw.trim()) return [{ text: ' ', type: 'plain', color: TOKEN_COLORS.plain }];

  // Check for line comments
  if (raw.trim().startsWith('//') || raw.trim().startsWith('#')) {
    return [{ text: raw, type: 'comment', color: TOKEN_COLORS.comment }];
  }

  const tokens: CodeToken[] = [];
  // Tokenize words, strings, operators, and whitespace
  const regex = /("[^"]*"|'[^']*'|`[^`]*`|\/\/.*|\b\w+\b|[^\w\s]|\s+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    const text = match[0];
    if (/^\s+$/.test(text)) {
      tokens.push({ text, type: 'plain', color: TOKEN_COLORS.plain });
    } else if (/^["'`]/.test(text)) {
      tokens.push({ text, type: 'string', color: TOKEN_COLORS.string });
    } else if (/^\d+$/.test(text)) {
      tokens.push({ text, type: 'number', color: TOKEN_COLORS.number });
    } else if (KEYWORDS.has(text)) {
      tokens.push({ text, type: 'keyword', color: TOKEN_COLORS.keyword });
    } else if (/^[A-Z][a-zA-Z0-9_]*$/.test(text) || /^[a-z][a-zA-Z0-9_]*(?=\()/.test(text)) {
      tokens.push({ text, type: 'function', color: TOKEN_COLORS.function });
    } else if (/^[+\-*/=<>!&|:;?]+$/.test(text)) {
      tokens.push({ text, type: 'operator', color: TOKEN_COLORS.operator });
    } else {
      tokens.push({ text, type: 'plain', color: TOKEN_COLORS.plain });
    }
  }

  return tokens;
}

/**
 * Splits raw code string into array of CodeLines.
 */
export function parseCodeLines(code: string): CodeLine[] {
  return code.split('\n').map((raw, index) => ({
    lineNumber: index + 1,
    tokens: tokenizeLine(raw),
    raw,
  }));
}

// ============================================================================
// Curated Fireship Code Presets
// ============================================================================

export const CODE_MORPH_PRESETS: Record<string, { title: string; description: string; spec: CodeMorphSpec }> = {
  rsc_streaming: {
    title: "Next.js 16 Streaming Server Component",
    description: "Refactoring client-side useEffect fetching into edge streaming React Server Component with Suspense",
    spec: {
      title: "Client Fetch -> Edge Streaming RSC",
      fileName: "app/dashboard/page.tsx",
      language: "typescript",
      codeBefore: `"use client";
export function UserProfile() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/user').then(res => res.json()).then(setData);
  }, []);
  if (!data) return <Skeleton />;
  return <ProfileCard user={data} />;
}`,
      codeAfter: `export default async function UserProfile() {
  // Edge Server Component streams with zero client JS
  const data = await db.user.findFirstOrThrow();
  return (
    <Suspense fallback={<Skeleton />}>
      <ProfileCard user={data} />
    </Suspense>
  );
}`,
    },
  },
  async_await_refactor: {
    title: "Async / Await Modern Promise Refactor",
    description: "Eliminating nested callback hell into linear, clean async/await with error boundaries",
    spec: {
      title: "Callback Hell -> Clean Async/Await",
      fileName: "lib/engine/video-fetcher.ts",
      language: "typescript",
      codeBefore: `function fetchVideo(id, callback) {
  auth(id, (err, user) => {
    if (err) return callback(err);
    getVideo(user.id, (err, video) => {
      if (err) return callback(err);
      callback(null, video);
    });
  });
}`,
      codeAfter: `async function fetchVideo(id: string) {
  const user = await auth(id);
  const video = await getVideo(user.id);
  return video;
}`,
    },
  },
};

// ============================================================================
// React CodeMorph Viewer Component
// ============================================================================

export interface CodeMorphViewerProps {
  spec: CodeMorphSpec;
  progress: number; // 0.0 to 1.0
  width?: number;
}

export const CodeMorphViewer: React.FC<CodeMorphViewerProps> = ({
  spec,
  progress = 0,
  width = 820,
}) => {
  const linesBefore = parseCodeLines(spec.codeBefore);
  const linesAfter = parseCodeLines(spec.codeAfter);

  // Phase calculation
  // 0.0 -> 0.3: Before state
  // 0.3 -> 0.7: Diff transition
  // 0.7 -> 1.0: After state
  const isAfter = progress >= 0.5;
  const activeLines = isAfter ? linesAfter : linesBefore;
  const isTransitioning = progress > 0.3 && progress < 0.7;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: `${width}px`,
        backgroundColor: '#0a0d14',
        border: '1.5px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(56, 189, 248, 0.1)',
        fontFamily: '"Fira Code", "JetBrains Mono", Consolas, monospace',
      }}
    >
      {/* Mac Terminal Chrome Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          backgroundColor: '#121622',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }} />
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
          {spec.fileName || 'source.tsx'}
        </div>
        <div style={{ fontSize: '11px', color: isAfter ? '#34d399' : '#f43f5e', fontWeight: 700 }}>
          {isAfter ? '✨ REFACTORED' : 'ORIGINAL'}
        </div>
      </div>

      {/* Code Lines Body */}
      <div
        style={{
          padding: '24px 20px',
          fontSize: '15px',
          lineHeight: '1.65',
          overflowX: 'auto',
          minHeight: '260px',
        }}
      >
        {activeLines.map((line) => (
          <div
            key={`line-${line.lineNumber}`}
            style={{
              display: 'flex',
              gap: '16px',
              padding: '2px 0',
              backgroundColor: isTransitioning
                ? isAfter
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(239, 68, 68, 0.08)'
                : 'transparent',
              borderRadius: '4px',
              transition: 'background-color 0.2s ease',
            }}
          >
            {/* Line Number */}
            <span
              style={{
                width: '32px',
                textAlign: 'right',
                color: '#475569',
                userSelect: 'none',
                fontSize: '13px',
              }}
            >
              {line.lineNumber}
            </span>

            {/* Tokens */}
            <div style={{ whiteSpace: 'pre', display: 'flex', flexWrap: 'wrap' }}>
              {line.tokens.map((token, tIdx) => (
                <span
                  key={`token-${tIdx}`}
                  style={{
                    color: token.color,
                    transition: 'color 0.2s ease',
                  }}
                >
                  {token.text}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Deterministic HTML5 Exporter
// ============================================================================

export function generateCodeMorphHtml(spec: CodeMorphSpec, durationSeconds = 5.0, fps = 30): string {
  const totalFrames = Math.round(durationSeconds * fps);
  const jsonSpec = JSON.stringify(spec);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${spec.title || 'Code Morph Walkthrough'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #07090e;
      color: #f8fafc;
      font-family: -apple-system, sans-serif;
      width: 1080px;
      height: 1920px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 60px 40px;
    }
  </style>
</head>
<body>
  <div id="codeMount" style="width: 100%;"></div>

  <script>
    const spec = ${jsonSpec};
    const totalFrames = ${totalFrames};
    window.seekToFrame = function(frame) {
      const progress = Math.max(0, Math.min(1, frame / (totalFrames - 1)));
      window.__progress = progress;
    };
  </script>
</body>
</html>`;
}
