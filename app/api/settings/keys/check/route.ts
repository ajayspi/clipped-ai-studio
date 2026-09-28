import { NextResponse } from 'next/server';
import { getOmniRouteConfig } from '@/lib/keys';
import { PROVIDER_REGISTRY } from '@/lib/api-router';
import { createLogger } from '@/lib/logger';

const logger = createLogger('settings/keys-check');

export const dynamic = 'force-dynamic';

/**
 * Verify a direct provider key against that provider's own endpoint.
 *
 * This route used to refuse every non-OmniRoute provider with "Individual AI
 * providers are deprecated", which was accurate when the cascade only spoke to
 * the gateway. It is not accurate now: `lib/engine/llm.ts` reads direct keys out
 * of the same `settings` table and the product can save them, so Settings needs
 * to be able to tell the user whether the key they just pasted actually works.
 */
async function checkDirectProvider(
  providerId: string,
  apiKey: string,
  startTime: number,
): Promise<NextResponse> {
  const entry = PROVIDER_REGISTRY.find((p) => p.id === providerId);
  if (!entry) {
    return NextResponse.json({
      success: false,
      latencyMs: Date.now() - startTime,
      error: `No registry entry for provider "${providerId}" — cannot verify.`,
      message: `Unknown provider "${providerId}"`,
    }, { status: 400 });
  }

  if (!apiKey && !entry.isFree) {
    return NextResponse.json({
      success: false,
      latencyMs: Date.now() - startTime,
      error: `An API key is required to verify ${entry.name}.`,
      message: 'apiKey is required',
    }, { status: 400 });
  }

  // Gemini authenticates via ?key=; everything else that uses a bearer token gets
  // one. `healthAuthHeader` returning an empty string means "not bearer", so fall
  // back to a plain bearer which is wrong for gemini — special-case it.
  const useQueryKey = providerId === 'gemini' || entry.healthAuthHeader?.(apiKey) === '';
  const url = useQueryKey && apiKey
    ? `${entry.healthEndpoint}${entry.healthEndpoint.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`
    : entry.healthEndpoint;

  const headers: Record<string, string> = { Accept: 'application/json' };
  const auth = entry.healthAuthHeader?.(apiKey);
  if (auth) headers['Authorization'] = auth;
  else if (apiKey && !useQueryKey) headers['Authorization'] = `Bearer ${apiKey}`;

  let response: Response;
  try {
    response = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error or timeout';
    logger.warn('Direct provider check could not connect', { provider: providerId, error: message });
    return NextResponse.json({
      success: false,
      latencyMs: Date.now() - startTime,
      error: `Could not connect to ${entry.name}: ${message}`,
      message: `Connection failed: ${message}`,
    });
  }

  const latencyMs = Date.now() - startTime;

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body?.error?.message || body?.message || JSON.stringify(body);
    } catch {
      // Non-JSON error body; statusText is the best we have.
    }
    logger.warn('Direct provider check rejected', { provider: providerId, status: response.status });
    return NextResponse.json({
      success: false,
      latencyMs,
      error: `${entry.name} returned HTTP ${response.status}: ${detail}`,
      message: `Connection failed (HTTP ${response.status})`,
    });
  }

  // Count available models where the endpoint exposes a list; not all do.
  let modelCount: number | null = null;
  try {
    const body = await response.json();
    if (Array.isArray(body?.data)) modelCount = body.data.length;
    else if (Array.isArray(body?.models)) modelCount = body.models.length;
    else if (Array.isArray(body)) modelCount = body.length;
  } catch {
    // Endpoint responded 2xx but with no JSON body — key is still valid.
  }

  return NextResponse.json({
    success: true,
    latencyMs,
    isWorking: true,
    modelCount,
    message: `Connected to ${entry.name} (${latencyMs}ms).${modelCount !== null ? ` ${modelCount} model(s) available.` : ''}`,
  });
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const { provider } = body;

    if (provider && typeof provider === 'string') {
      const cleanP = provider.toLowerCase().trim().replace(/^api_/, '');
      const isOmni = cleanP === 'omniroute' || cleanP === 'omniroute_endpoint_url' || cleanP === 'omniroute_api_key';

      if (!isOmni) {
        const rawKey = body.apiKey !== undefined ? body.apiKey : body.key;
        return checkDirectProvider(cleanP, typeof rawKey === 'string' ? rawKey.trim() : '', startTime);
      }
    }

    // Resolve endpointUrl and apiKey from request body or stored config
    const config = await getOmniRouteConfig();

    const rawEndpointUrl = (
      body.endpointUrl ||
      body.baseUrl ||
      body.url ||
      (provider === 'omniroute_endpoint_url' ? body.apiKey : undefined) ||
      config.baseUrl ||
      'http://localhost:20128'
    );

    const rawApiKey = (
      body.apiKey !== undefined
        ? body.apiKey
        : (body.key !== undefined ? body.key : config.apiKey)
    );

    if (!rawEndpointUrl || typeof rawEndpointUrl !== 'string') {
      return NextResponse.json({
        success: false,
        latencyMs: Date.now() - startTime,
        error: 'Invalid Endpoint URL. Must start with http:// or https://',
        message: 'Invalid Endpoint URL',
      }, { status: 400 });
    }

    const trimmedUrl = rawEndpointUrl.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return NextResponse.json({
        success: false,
        latencyMs: Date.now() - startTime,
        error: 'Invalid Endpoint URL. Must start with http:// or https://',
        message: 'Invalid Endpoint URL',
      }, { status: 400 });
    }

    const endpointUrl = trimmedUrl.replace(/\/+$/, '');
    const apiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : '';

    // Construct test URLs
    let primaryUrl: string;
    let fallbackUrl: string | null = null;

    if (endpointUrl.endsWith('/v1')) {
      primaryUrl = `${endpointUrl}/models`;
    } else {
      primaryUrl = `${endpointUrl}/v1/models`;
      fallbackUrl = `${endpointUrl}/models`;
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    let response: Response;
    try {
      response = await fetch(primaryUrl, {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      if (response.status === 404 && fallbackUrl) {
        response = await fetch(fallbackUrl, {
          headers,
          signal: AbortSignal.timeout(5000),
        });
      }
    } catch (fetchErr) {
      const latencyMs = Date.now() - startTime;
      return NextResponse.json({
        success: false,
        latencyMs,
        error: `Could not connect to OmniRoute at ${endpointUrl}: ${fetchErr instanceof Error ? fetchErr.message : 'Network error or timeout'}`,
        message: `Connection failed: ${fetchErr instanceof Error ? fetchErr.message : 'Network error'}`,
      });
    }

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const errJson = await response.json();
        detail = errJson.error?.message || errJson.message || JSON.stringify(errJson);
      } catch {}

      return NextResponse.json({
        success: false,
        latencyMs,
        error: `OmniRoute endpoint returned HTTP ${response.status}: ${detail}`,
        message: `Connection failed (HTTP ${response.status})`,
      });
    }

    let models: string[] = [];
    try {
      const resJson = await response.json();
      if (Array.isArray(resJson?.data)) {
        models = resJson.data.map((m: string | { id?: string; name?: string }) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);
      } else if (Array.isArray(resJson)) {
        models = resJson.map((m: string | { id?: string; name?: string }) => (typeof m === 'string' ? m : m.id || m.name)).filter((m): m is string => Boolean(m));
      } else if (Array.isArray(resJson?.models)) {
        models = resJson.models.map((m: string | { id?: string; name?: string }) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);
      }
    } catch {
      // Non-fatal if body was not JSON
    }

    return NextResponse.json({
      success: true,
      latencyMs,
      models,
      message: `Successfully connected to OmniRoute (${latencyMs}ms). ${models.length} model(s) available.`,
      isWorking: true,
    });
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return NextResponse.json({
      success: false,
      latencyMs,
      error: err instanceof Error ? err.message : 'Unexpected error during connection test',
      message: err instanceof Error ? err.message : 'Unexpected error',
    }, { status: 500 });
  }
}
