import { NextResponse } from 'next/server';
import { readLogTail, LOG_PATHS } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Read the tail of the persistent app logs.
 *
 * The provider cascades fail soft by design, so the interesting failures (a 402
 * from a TTS key, a gateway timeout, a lease rejection) are only ever warnings.
 * This makes them readable without tailing a terminal — which is the whole point
 * of writing them to disk in the first place.
 *
 * GET /api/logs?which=error&lines=200
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const which = url.searchParams.get('which') === 'app' ? 'app' : 'error';
    const lines = Math.min(1000, Math.max(1, Number(url.searchParams.get('lines')) || 200));

    const { file, lines: tail, error: readError, exists } = readLogTail(which, lines);

    // Parse best-effort so the UI can show level/scope without re-implementing it.
    const records = tail.map((line) => {
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;
        const { ts, level, scope, message, ...rest } = parsed;
        return { ts, level, scope, message, ...rest };
      } catch {
        return { ts: null, level: 'raw', scope: null, message: line };
      }
    });

    return NextResponse.json({
      // A missing/unreadable log is a failure, not an empty success — otherwise
      // "the logger is broken" and "nothing broke" look identical.
      success: readError === null,
      which,
      file,
      logDir: LOG_PATHS.dir,
      exists,
      readError,
      count: records.length,
      records,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to read logs' },
      { status: 500 },
    );
  }
}
