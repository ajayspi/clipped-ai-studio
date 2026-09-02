import crypto from 'crypto';

export type WebhookEventType =
  | 'video.generation.started'
  | 'video.generation.completed'
  | 'video.generation.failed'
  | 'video.published';

export interface WebhookPayload<T = any> {
  event: WebhookEventType;
  timestamp: string;
  data: T;
}

export interface WebhookDispatchResult {
  success: boolean;
  url: string;
  attempts: number;
  lastStatusCode?: number;
  signature: string;
  error?: string;
  dispatchedAt: string;
}

/**
 * Generates an HMAC SHA-256 signature for a webhook payload string.
 */
export function generateHmacSignature(payloadString: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString, 'utf8');
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verifies if an incoming HMAC signature matches the calculated signature.
 */
export function verifyHmacSignature(payloadString: string, signature: string, secret: string): boolean {
  try {
    const expected = generateHmacSignature(payloadString, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Dispatches a webhook payload to the recipient URL with HMAC signature and exponential backoff retry.
 * 
 * @param url Target webhook endpoint URL
 * @param event The event type (e.g. video.generation.completed)
 * @param data Event payload data
 * @param secret HMAC secret key (defaults to environment or standard default)
 * @param maxRetries Maximum number of retry attempts (default 3)
 */
export async function dispatchWebhook<T = any>(
  url: string,
  event: WebhookEventType,
  data: T,
  secret: string = process.env.CLIPPED_WEBHOOK_SECRET || 'clipped_sec_default_key',
  maxRetries: number = 3
): Promise<WebhookDispatchResult> {
  const timestamp = new Date().toISOString();
  const payload: WebhookPayload<T> = {
    event,
    timestamp,
    data,
  };

  const payloadString = JSON.stringify(payload);
  const signature = generateHmacSignature(payloadString, secret);

  let attempts = 0;
  let lastStatusCode: number | undefined;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    attempts = attempt;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Clipped-Webhook-Dispatcher/1.0',
          'x-clipped-signature': signature,
          'x-clipped-event': event,
          'x-clipped-timestamp': timestamp,
          'x-clipped-attempt': String(attempt),
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      lastStatusCode = response.status;

      if (response.ok) {
        return {
          success: true,
          url,
          attempts,
          lastStatusCode,
          signature,
          dispatchedAt: new Date().toISOString(),
        };
      }

      // If client error 4xx (except 429), don't retry as it will never succeed
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        lastError = `HTTP ${response.status} ${response.statusText}`;
        break;
      }

      lastError = `Server responded with HTTP ${response.status}`;
    } catch (err: any) {
      lastError = err.name === 'AbortError' ? 'Webhook delivery timeout' : err.message;
    }

    // Wait with exponential backoff if more attempts remain (100ms, 300ms, 900ms...)
    if (attempt < maxRetries) {
      const backoffMs = Math.min(100 * Math.pow(3, attempt - 1), 3000);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  return {
    success: false,
    url,
    attempts,
    lastStatusCode,
    signature,
    error: lastError || 'Webhook delivery failed after maximum retries',
    dispatchedAt: new Date().toISOString(),
  };
}
