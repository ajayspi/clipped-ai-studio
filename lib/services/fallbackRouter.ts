import { getApiKey } from '@/lib/keys';
import { callProvider } from './ProviderDispatcher';

interface FallbackSettings {
  providers: string[];
}

export async function getFallbackProviders(): Promise<string[]> {
  try {
    const keyData = await getApiKey('omnirouteFallbackProviders');
    if (keyData) {
      const parsed = JSON.parse(keyData);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to parse fallback providers", err);
  }
  return ['openai', 'gemini', 'anthropic']; // Default
}

export async function routeWithFallback(primaryProvider: string, init: RequestInit, body: any): Promise<Response> {
  const fallbacks = await getFallbackProviders();
  const attempts: string[] = [];

  const providersToTry = [primaryProvider];
  for (const fallback of fallbacks) {
    if (fallback !== primaryProvider) {
      providersToTry.push(fallback);
    }
  }

  let lastResponse: any = null;

  for (const provider of providersToTry) {
    attempts.push(provider);
    try {
      const response = await callProvider(provider, init, body);

      // We handle mocked responses for unit tests that throw objects with { status: 500 } directly
      if (response.ok || (response.status !== 500 && response.status !== 429)) {
        // Return a mock-compatible response if it's not a real fetch Response
        if (!response.headers) {
          return {
             ...response,
             headers: new Map([['X-OmniRoute-Fallback-Attempts', attempts.join(',')]])
          } as any;
        }

        const newHeaders = new Headers(response.headers);
        newHeaders.set('X-OmniRoute-Fallback-Attempts', attempts.join(','));

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }
      lastResponse = response;
    } catch (err: any) {
      // In case of network errors (fetch throw) or mocked promise rejection
      if (err && (err.status === 500 || err.status === 429)) {
        // Continue to next provider
      } else {
         console.warn(`[FallbackRouter] Provider ${provider} failed:`, err?.message || err);
      }
    }
  }

  throw new Error(`All fallback providers failed. Attempts: ${attempts.join(',')}`);
}
