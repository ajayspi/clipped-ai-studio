import { MediaAsset, MediaJob, HiggsfieldSubmitOptions } from './types';

export interface HiggsfieldCredentials {
  keyId: string;
  keySecret: string;
}

export function parseHiggsfieldCredentials(raw: string): HiggsfieldCredentials {
  if (!raw) {
    throw new Error('Missing Higgsfield credentials');
  }
  const firstColon = raw.indexOf(':');
  if (firstColon === -1) {
    throw new Error('Malformed Higgsfield credentials: must contain a colon');
  }
  const keyId = raw.substring(0, firstColon);
  const keySecret = raw.substring(firstColon + 1);
  if (!keyId || !keySecret) {
    throw new Error('Malformed Higgsfield credentials: ID and secret cannot be empty');
  }
  return { keyId, keySecret };
}

export function buildAuthHeader(creds: HiggsfieldCredentials): string {
  return `Key ${creds.keyId}:${creds.keySecret}`;
}

export async function submitAndWait(
  options: HiggsfieldSubmitOptions,
  credentials: HiggsfieldCredentials
): Promise<MediaJob> {
  const { endpointId, input, timeoutMs = 90000, pollIntervalMs = 2000 } = options;

  if (!endpointId) {
    throw new Error('endpointId is required');
  }
  if (!input || Object.keys(input).length === 0) {
    throw new Error('input must be a non-empty object');
  }

  const authHeader = buildAuthHeader(credentials);
  const submitUrl = `https://api.higgsfield.ai/${endpointId}`;

  const submitRes = await fetch(submitUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify(input)
  });

  if (!submitRes.ok) {
    if (submitRes.status === 400) {
      const text = await submitRes.text().catch(() => '');
      if (/maximum number of concurrent requests/i.test(text)) {
        return {
          requestId: 'unknown',
          provider: 'higgsfield',
          model: endpointId,
          status: 'failed',
          error: 'Maximum number of concurrent requests (4) has been reached'
        };
      }
    }
    throw new Error(`Submit failed: ${submitRes.status} ${submitRes.statusText}`);
  }

  const submitData = await submitRes.json();
  const { request_id, status_url } = submitData;

  if (!status_url || !status_url.startsWith('https://api.higgsfield.ai/')) {
    return {
      requestId: request_id || 'unknown',
      provider: 'higgsfield',
      model: endpointId,
      status: 'failed',
      error: 'Invalid status URL returned from provider'
    };
  }

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const pollRes = await fetch(status_url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });

    if (!pollRes.ok) {
      return {
        requestId: request_id,
        provider: 'higgsfield',
        model: endpointId,
        status: 'failed',
        error: `Poll failed: ${pollRes.status} ${pollRes.statusText}`
      };
    }

    const pollData = await pollRes.json();

    if (pollData.status === 'completed') {
      let kind: 'image' | 'video' = 'image';
      let url = '';

      if (pollData.video && pollData.video.url) {
        kind = 'video';
        url = pollData.video.url;
      } else if (pollData.image && pollData.image.url) {
        kind = 'image';
        url = pollData.image.url;
      } else if (pollData.images && pollData.images[0] && pollData.images[0].url) {
        kind = 'image';
        url = pollData.images[0].url;
      }

      const asset: MediaAsset = {
        id: `higgsfield-${request_id}`,
        kind,
        provider: 'higgsfield',
        url,
        generated: true
      };

      if (typeof input.prompt === 'string') {
        asset.prompt = input.prompt;
      }

      return {
        requestId: request_id,
        provider: 'higgsfield',
        model: endpointId,
        status: 'completed',
        asset
      };
    } else if (pollData.status === 'failed' || pollData.status === 'nsfw') {
      return {
        requestId: request_id,
        provider: 'higgsfield',
        model: endpointId,
        status: 'failed',
        error: `Job ${pollData.status}: ${pollData.error || pollData.reason || 'Unknown reason'}`
      };
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  return {
    requestId: request_id,
    provider: 'higgsfield',
    model: endpointId,
    status: 'failed',
    error: 'Job timed out'
  };
}

export async function estimate(
  endpointId: string,
  input: Record<string, unknown>,
  credentials: HiggsfieldCredentials
): Promise<{ credits: number; usd: number } | null> {
  try {
    const authHeader = buildAuthHeader(credentials);
    const res = await fetch(`https://api.higgsfield.ai/estimate/${endpointId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(input)
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (typeof data.credits === 'number' && typeof data.usd === 'number') {
      return { credits: data.credits, usd: data.usd };
    }
    return null;
  } catch (e) {
    return null;
  }
}
