import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const CORE_TABLES = [
  'videos',
  'render_jobs',
  'settings',
  'api_credits',
  'scheduled_posts',
  'users',
];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawUrl = body.url;
    const rawAnonKey = body.anonKey;

    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return NextResponse.json(
        {
          success: false,
          reachable: false,
          latencyMs: null,
          schema: {
            isHealthy: false,
            tables: CORE_TABLES.reduce((acc, t) => ({ ...acc, [t]: { exists: false } }), {}),
            missingTables: CORE_TABLES,
          },
          message: 'Missing or invalid Supabase URL. Please provide a valid project URL.',
        },
        { status: 400 }
      );
    }

    if (!rawAnonKey || typeof rawAnonKey !== 'string' || !rawAnonKey.trim()) {
      return NextResponse.json(
        {
          success: false,
          reachable: false,
          latencyMs: null,
          schema: {
            isHealthy: false,
            tables: CORE_TABLES.reduce((acc, t) => ({ ...acc, [t]: { exists: false } }), {}),
            missingTables: CORE_TABLES,
          },
          message: 'Missing or invalid Supabase Anon Key. Please provide your public anon key.',
        },
        { status: 400 }
      );
    }

    const url = rawUrl.trim().replace(/\/+$/, '');
    const anonKey = rawAnonKey.trim();

    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('URL must use http:// or https://');
      }
    } catch {
      return NextResponse.json(
        {
          success: false,
          reachable: false,
          latencyMs: null,
          schema: {
            isHealthy: false,
            tables: CORE_TABLES.reduce((acc, t) => ({ ...acc, [t]: { exists: false } }), {}),
            missingTables: CORE_TABLES,
          },
          message: 'Malformed Supabase URL. Must be a valid HTTP or HTTPS endpoint (e.g., https://yourproject.supabase.co).',
        },
        { status: 400 }
      );
    }

    // Ping check and measure round-trip latency
    const pingStart = Date.now();
    let reachable = false;
    let latencyMs: number | null = null;

    try {
      // Direct health probe
      const pingResponse = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: anonKey },
        signal: AbortSignal.timeout(6000),
      });
      latencyMs = Math.max(1, Date.now() - pingStart);
      if (pingResponse.ok || pingResponse.status === 401 || pingResponse.status === 200) {
        reachable = true;
      }
    } catch {
      // Fallback: try rest root
      try {
        const restStart = Date.now();
        const restResponse = await fetch(`${url}/rest/v1/`, {
          headers: { apikey: anonKey },
          signal: AbortSignal.timeout(6000),
        });
        latencyMs = Math.max(1, Date.now() - restStart);
        if (restResponse.ok || restResponse.status === 200 || restResponse.status === 401) {
          reachable = true;
        }
      } catch (err: any) {
        reachable = false;
      }
    }

    // Create client to probe schema tables
    const probeClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const tableResults: Record<string, { exists: boolean; error?: string | null }> = {};
    const missingTables: string[] = [];

    const probePromises = CORE_TABLES.map(async (tableName) => {
      try {
        const { error } = await probeClient
          .from(tableName)
          .select('id')
          .limit(1);

        if (error) {
          // Check if table missing error (42P01 in postgres or PGRST200/PGRST204)
          const msg = (error.message || '').toLowerCase();
          const isMissing =
            error.code === '42P01' ||
            error.code === 'PGRST200' ||
            error.code === 'PGRST204' ||
            error.code === 'PGRST301' ||
            msg.includes('relation') ||
            msg.includes('does not exist') ||
            msg.includes('could not find the table') ||
            msg.includes('not found in the schema cache');

          if (isMissing) {
            tableResults[tableName] = { exists: false, error: error.message };
            missingTables.push(tableName);
          } else {
            // Table exists (e.g., empty result or RLS policy 42501)
            reachable = true;
            tableResults[tableName] = { exists: true, error: null };
          }
        } else {
          reachable = true;
          tableResults[tableName] = { exists: true, error: null };
        }
      } catch (err: any) {
        tableResults[tableName] = { exists: false, error: err.message || 'Probe failure' };
        missingTables.push(tableName);
      }
    });

    await Promise.all(probePromises);

    if (!reachable && missingTables.length === CORE_TABLES.length) {
      return NextResponse.json({
        success: false,
        reachable: false,
        latencyMs,
        url,
        schema: {
          isHealthy: false,
          tables: tableResults,
          missingTables,
        },
        message: `Unable to connect to Supabase endpoint at ${url}. Please verify your URL and network connectivity.`,
      });
    }

    const isHealthy = missingTables.length === 0;
    const message = isHealthy
      ? `Connection verified successfully! Latency: ${latencyMs ?? 0}ms. All 6 core tables found.`
      : `Connected (${latencyMs ?? 0}ms), but ${missingTables.length} table(s) are missing: ${missingTables.join(', ')}.`;

    return NextResponse.json({
      success: true,
      reachable: true,
      latencyMs: latencyMs ?? 0,
      url,
      schema: {
        isHealthy,
        tables: tableResults,
        missingTables,
      },
      message,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        reachable: false,
        latencyMs: null,
        schema: {
          isHealthy: false,
          tables: CORE_TABLES.reduce((acc, t) => ({ ...acc, [t]: { exists: false } }), {}),
          missingTables: CORE_TABLES,
        },
        message: error.message || 'Internal error occurred while testing Supabase connection.',
      },
      { status: 500 }
    );
  }
}
