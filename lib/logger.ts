/**
 * Persistent, append-only diagnostic log.
 *
 * Why this exists: every provider in this app fails soft. `complete()` walks a
 * cascade of LLM providers, the TTS path walks a cascade of voices, and the image
 * path falls back to Pollinations — each one only ever `console.warn`s and moves
 * on. When something is actually broken (a 402, an expired key, a 429), the only
 * trace is a line that scrolled past in a terminal, and the visible symptom is a
 * slow render or a silent quality downgrade. That is exactly the situation where
 * you need the record kept for you instead of hunted for.
 *
 * Writes newline-delimited JSON to `logs/app.log` and mirrors to the console.
 * Deliberately dependency-free and synchronous-ish: it must work in the Next.js
 * server runtime AND in the standalone `tsx` render/publish workers, and it must
 * never throw into a caller that is already handling an error.
 *
 * Every field is best-effort. A logging failure must not become the failure.
 */
import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  [key: string]: unknown;
}

interface LogRecord {
  ts: string;
  level: LogLevel;
  scope: string;
  message: string;
  [key: string]: unknown;
}

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * Locate the repo root.
 *
 * Deliberately does NOT trust `__dirname`. That works under `tsx` (the workers run
 * CommonJS) but inside a Next.js server bundle it resolves to a placeholder — it
 * produced `C:\ROOT\logs\app.log` here, so `/api/logs` reported a valid 200 while
 * reading a file that does not exist. Silent wrong-file reads are worse than no
 * logging, so candidates are probed for a real `package.json` instead, with an
 * explicit env override for unusual deployments.
 */
function resolveRootDir(): string {
  const override = process.env.CLIPPED_LOG_ROOT;
  if (override) return path.resolve(override);

  const candidates = [
    process.cwd(),
    // `__dirname` may be a stub; only keep it if it is a real path.
    typeof __dirname === 'string' && !/^[A-Za-z]:?\\?(ROOT|DO_NOT_USE)/.test(__dirname)
      ? path.resolve(__dirname, '..')
      : null,
    typeof __dirname === 'string' ? path.resolve(__dirname, '..', '..') : null,
  ].filter((c): c is string => Boolean(c));

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
    } catch {
      // Unreadable candidate; try the next one.
    }
  }

  // Nothing looked like a repo root. cwd is the least surprising place for logs.
  return process.cwd();
}

const ROOT_DIR = resolveRootDir();
const LOG_DIR = process.env.CLIPPED_LOG_DIR
  ? path.resolve(process.env.CLIPPED_LOG_DIR)
  : path.join(ROOT_DIR, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const ERROR_FILE = path.join(LOG_DIR, 'error.log');

/** Cap on a single log file so a long-running local server can't fill the disk. */
const MAX_BYTES = 5 * 1024 * 1024;

const MIN_LEVEL: LogLevel = (() => {
  const raw = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return (raw in LEVEL_RANK ? raw : 'info') as LogLevel;
})();

let dirReady = false;

function ensureDir(): boolean {
  if (dirReady) return true;
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    dirReady = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Roll a log file over once it exceeds MAX_BYTES. Failures are ignored: a log that
 * cannot rotate is still a log, and losing rotation must never break the caller.
 */
function rotateIfNeeded(file: string): void {
  try {
    const stat = fs.statSync(file);
    if (stat.size < MAX_BYTES) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.renameSync(file, `${file}.${stamp}.bak`);
  } catch {
    // No file yet, or not rotatable — fall through and append.
  }
}

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  // Authorization / bearer headers and anything that looks like a token.
  [/\b(Bearer\s+)[A-Za-z0-9._\-]{8,}/gi, '$1[redacted]'],
  [/\bsk-[A-Za-z0-9._\-]{6,}/g, 'sk-[redacted]'],
  [/\bghp_[A-Za-z0-9]{10,}/g, 'ghp_[redacted]'],
  [/\bgithub_pat_[A-Za-z0-9_]{10,}/g, 'github_pat_[redacted]'],
  [/\bxai-[A-Za-z0-9\-]{10,}/g, 'xai-[redacted]'],
  [/\bAIza[A-Za-z0-9_\-]{10,}/g, 'AIza[redacted]'],
  [/\bgsk_[A-Za-z0-9]{10,}/g, 'gsk_[redacted]'],
  [/\bcsk-[A-Za-z0-9]{10,}/g, 'csk-[redacted]'],
  [/\bhf_[A-Za-z0-9]{10,}/g, 'hf_[redacted]'],
];

/**
 * Strip credentials out of anything on its way to disk or the console. Provider
 * keys leak easily through error payloads (a 401 body often echoes the header) and
 * this file is on disk in a gitignored directory that still gets copied around.
 */
export function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    let out = value;
    for (const [pattern, replacement] of SECRET_PATTERNS) {
      out = out.replace(pattern, replacement);
    }
    return out;
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redact(value.message),
      stack: typeof value.stack === 'string' ? redact(value.stack) : undefined,
    };
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = /key|secret|token|password|authorization/i.test(key) ? '[redacted]' : redact(val);
    }
    return out;
  }
  return value;
}

function write(level: LogLevel, scope: string, message: string, fields?: LogFields): void {
  if (LEVEL_RANK[level] < LEVEL_RANK[MIN_LEVEL]) return;

  const record: LogRecord = {
    ts: new Date().toISOString(),
    level,
    scope,
    message: redact(message) as string,
    ...(fields ? (redact(fields) as LogFields) : {}),
  };

  const line = `${JSON.stringify(record)}\n`;

  try {
    if (ensureDir()) {
      rotateIfNeeded(LOG_FILE);
      fs.appendFileSync(LOG_FILE, line, 'utf8');
      if (level === 'error') {
        rotateIfNeeded(ERROR_FILE);
        fs.appendFileSync(ERROR_FILE, line, 'utf8');
      }
    }
  } catch {
    // Swallow: logging must never escalate a caller's error.
  }

  // Keep the terminal behaviour people rely on today.
  const consoleFn =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  consoleFn(`[${level.toUpperCase()}] ${scope}: ${record.message}`);
}

/** A named logger, e.g. `createLogger('llm')`. */
export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(subScope: string): Logger;
}

export function createLogger(scope: string): Logger {
  const full = (sub?: string) => (sub ? `${scope}:${sub}` : scope);
  return {
    debug: (message, fields) => write('debug', full(), message, fields),
    info: (message, fields) => write('info', full(), message, fields),
    warn: (message, fields) => write('warn', full(), message, fields),
    error: (message, fields) => write('error', full(), message, fields),
    child: (subScope) => createLogger(full(subScope)),
  };
}

export const log = createLogger('app');

/** Absolute paths, so tooling and the /api/logs route can read the same files. */
export const LOG_PATHS = { dir: LOG_DIR, app: LOG_FILE, error: ERROR_FILE } as const;

/**
 * Read the tail of a log file. Used by the /api/logs route so failures are
 * readable from a browser without tailing a terminal.
 *
 * Reports *why* a read failed instead of returning an empty list, because "no
 * errors recorded" and "the log file is not where I think it is" are completely
 * different situations and only one of them is good news.
 */
export function readLogTail(
  which: 'app' | 'error' = 'error',
  lines = 200,
): { file: string; lines: string[]; error: string | null; exists: boolean } {
  const file = which === 'error' ? ERROR_FILE : LOG_FILE;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const all = raw.split('\n').filter(Boolean);
    return { file, lines: all.slice(-Math.max(1, lines)), error: null, exists: true };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    const reason =
      code === 'ENOENT'
        ? 'log file does not exist yet — nothing has been logged since start'
        : err instanceof Error
          ? err.message
          : 'unknown read error';
    return { file, lines: [], error: reason, exists: false };
  }
}
