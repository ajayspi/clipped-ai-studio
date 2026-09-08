import { NextResponse } from 'next/server';
import { getOmniRouteConfig } from '@/lib/keys';

export const dynamic = 'force-dynamic';

const LEGACY_PROVIDERS = new Set([
  'openai', 'gemini', 'anthropic', 'openrouter', 'fal', 'grok', 'groq',
  'deepseek', 'mistral', 'cerebras', 'github_models', 'ollama',
  'pexels', 'pixabay', 'kling', 'luma', 'huggingface',
  'azure', 'azure_speech', 'azure_region', 'elevenlabs', 'google_tts',
  'deepgram', 'suno', 'heygen', 'did'
]);

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const { provider } = body;

    // If a legacy provider was explicitly requested, reject
    if (provider && typeof provider === 'string') {
      const cleanP = provider.toLowerCase().trim().replace(/^api_/, '');
      const isOmni = cleanP === 'omniroute' || cleanP === 'omniroute_endpoint_url' || cleanP === 'omniroute_api_key';
      if (!isOmni || LEGACY_PROVIDERS.has(cleanP)) {
        return NextResponse.json({
          success: false,
          latencyMs: Date.now() - startTime,
          error: 'Individual AI providers are deprecated. Only OmniRoute configuration is supported.',
          message: 'Individual AI providers are deprecated. Only OmniRoute configuration is supported.',
        }, { status: 400 });
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
    } catch (fetchErr: any) {
      const latencyMs = Date.now() - startTime;
      return NextResponse.json({
        success: false,
        latencyMs,
        error: `Could not connect to OmniRoute at ${endpointUrl}: ${fetchErr.message || 'Network error or timeout'}`,
        message: `Connection failed: ${fetchErr.message || 'Network error'}`,
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
        models = resJson.data.map((m: any) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);
      } else if (Array.isArray(resJson)) {
        models = resJson.map((m: any) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);
      } else if (Array.isArray(resJson?.models)) {
        models = resJson.models.map((m: any) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);
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
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return NextResponse.json({
      success: false,
      latencyMs,
      error: err.message || 'Unexpected error during connection test',
      message: err.message || 'Unexpected error',
    }, { status: 500 });
  }
}
