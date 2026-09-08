import type { MediaAsset, MediaJob, FalSubmitOptions } from './types';

/**
 * Submits a job to the fal.ai asynchronous queue API and polls until completion.
 * Does NOT require any fal SDK dependencies. Uses native fetch.
 * 
 * @param options - Configuration for the model, input payload, and timeouts.
 * @param apiKey - The FAL_API_KEY. Throws if missing.
 * @returns A completed MediaJob containing the resolved MediaAsset, or a failed job status.
 */
export async function submitAndWait(
  options: FalSubmitOptions,
  apiKey: string
): Promise<MediaJob> {
  const { model, input, timeoutMs = 90000, pollIntervalMs = 2000 } = options;

  if (!model || typeof model !== 'string' || !model.trim()) {
    throw new Error('fal.ai request failed: model is required');
  }
  if (!input || typeof input !== 'object' || Object.keys(input).length === 0) {
    throw new Error('fal.ai request failed: input must be a non-empty object');
  }
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('fal.ai request failed: API key is missing or empty');
  }

  // 1. Submit to queue
  const submitUrl = `https://queue.fal.run/${model}`;
  const submitResp = await fetch(submitUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!submitResp.ok) {
    const errorText = await submitResp.text().catch(() => '');
    throw new Error(`fal.ai request failed: HTTP ${submitResp.status} — ${errorText}`);
  }

  const submitData = await submitResp.json();
  const requestId = submitResp.headers.get('x-fal-request-id') || submitData.request_id;
  if (!requestId) {
    throw new Error('fal.ai request failed: No request_id returned from queue');
  }

  // 2. Poll for status
  const statusUrl = `https://queue.fal.run/${model}/requests/${requestId}/status`;
  const startTime = Date.now();
  
  let statusData: any;
  while (true) {
    if (Date.now() - startTime > timeoutMs) {
      return {
        requestId,
        provider: 'fal-ai',
        model,
        status: 'failed',
        error: `Timed out after ${timeoutMs}ms`,
      };
    }

    const statusResp = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!statusResp.ok) {
       // If polling fails temporarily, we could retry, but for simplicity here we fail
       const errorText = await statusResp.text().catch(() => '');
       return {
         requestId,
         provider: 'fal-ai',
         model,
         status: 'failed',
         error: `Status poll failed: HTTP ${statusResp.status} — ${errorText}`,
       };
    }

    statusData = await statusResp.json();
    if (statusData.status === 'COMPLETED' || statusData.status === 'FAILED') {
      break;
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  if (statusData.status === 'FAILED') {
    return {
      requestId,
      provider: 'fal-ai',
      model,
      status: 'failed',
      error: statusData.error || 'fal job failed',
    };
  }

  // 3. Fetch result
  const resultUrl = `https://queue.fal.run/${model}/requests/${requestId}`;
  const resultResp = await fetch(resultUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!resultResp.ok) {
    const errorText = await resultResp.text().catch(() => '');
    return {
      requestId,
      provider: 'fal-ai',
      model,
      status: 'failed',
      error: `Result fetch failed: HTTP ${resultResp.status} — ${errorText}`,
    };
  }

  const resultData = await resultResp.json();

  // Normalize image vs video output
  let asset: MediaAsset | undefined;
  
  if (resultData?.video?.url) {
    asset = {
      id: `fal-${requestId}`,
      kind: 'video',
      provider: 'fal-ai',
      url: resultData.video.url,
      generated: true,
      prompt: typeof input.prompt === 'string' ? input.prompt : undefined,
    };
  } else if (Array.isArray(resultData?.images) && resultData.images[0]?.url) {
    asset = {
      id: `fal-${requestId}`,
      kind: 'image',
      provider: 'fal-ai',
      url: resultData.images[0].url,
      generated: true,
      prompt: typeof input.prompt === 'string' ? input.prompt : undefined,
    };
  } else if (resultData?.image?.url) {
    asset = {
      id: `fal-${requestId}`,
      kind: 'image',
      provider: 'fal-ai',
      url: resultData.image.url,
      generated: true,
      prompt: typeof input.prompt === 'string' ? input.prompt : undefined,
    };
  }

  return {
    requestId,
    provider: 'fal-ai',
    model,
    status: 'completed',
    asset,
  };
}
