#!/usr/bin/env node
/**
 * Tail the app's persistent logs.
 *
 *   pnpm logs            # errors, last 50
 *   pnpm logs app        # everything, last 50
 *   pnpm logs error 200  # errors, last 200
 *
 * Reads the same files the app writes (logs/app.log, logs/error.log), so this
 * works while the dev server or render worker is running in another terminal.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const LOG_DIR = path.join(ROOT, 'logs');

const which = process.argv[2] === 'app' ? 'app' : 'error';
const count = Math.max(1, Number(process.argv[3]) || 50);
const file = path.join(LOG_DIR, which === 'error' ? 'error.log' : 'app.log');

if (!fs.existsSync(file)) {
  console.error(`No log file at ${file}`);
  console.error(`Available: ${fs.existsSync(LOG_DIR) ? fs.readdirSync(LOG_DIR).join(', ') : '(no logs/ dir yet)'}`);
  process.exit(1);
}

const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).slice(-count);

// Colour by level so a wall of warnings is skimmable.
const colour = (level: string) => {
  if (level === 'error') return '\x1b[31m';
  if (level === 'warn') return '\x1b[33m';
  if (level === 'info') return '\x1b[36m';
  return '\x1b[90m';
};

for (const line of lines) {
  try {
    const r = JSON.parse(line) as Record<string, unknown>;
    const extra = Object.entries(r)
      .filter(([k]) => !['ts', 'level', 'scope', 'message'].includes(k))
      .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join(' ');
    console.log(
      `${colour(String(r.level))}${String(r.ts).slice(11, 19)} ${String(r.level).toUpperCase().padEnd(5)}\x1b[0m ` +
        `${'\x1b[1m'}${String(r.scope ?? '-')}\x1b[0m ${String(r.message)}` +
        (extra ? `\n    \x1b[90m${extra}\x1b[0m` : ''),
    );
  } catch {
    console.log(line);
  }
}

console.error(`\n(${lines.length} of ${count} from ${path.relative(ROOT, file)})`);
