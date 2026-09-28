import dns from 'dns/promises';

export class SafeFetchError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'SafeFetchError';
  }
}

function isPrivateIP(ip: string): boolean {
  if (ip === '::1') return true;
  if (ip.startsWith('fd') || ip.startsWith('fc') || ip.startsWith('fe80:')) return true;
  
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  
  const [a, b] = parts.map(Number);
  
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && (b >= 16 && b <= 31)) return true;
  if (a === 192 && b === 168) return true;
  if (a === 0) return true;
  
  return false;
}

export async function safeFetch(urlStr: string, options: { maxBytes?: number, timeout?: number } = {}) {
  const MAX_REDIRECTS = 5;
  const maxBytes = options.maxBytes || 5 * 1024 * 1024;
  const timeoutMs = options.timeout || 10000;
  
  let currentUrl = urlStr;
  let redirects = 0;
  
  while (redirects <= MAX_REDIRECTS) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      throw new SafeFetchError('Invalid URL');
    }
    
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new SafeFetchError('Unsupported protocol');
    }
    
    try {
      const lookup = await dns.lookup(parsed.hostname);
      if (isPrivateIP(lookup.address)) {
        throw new SafeFetchError('Private or local address rejected');
      }
    } catch (err: any) {
      if (err instanceof SafeFetchError) throw err;
      throw new SafeFetchError('DNS resolution failed');
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    let res: Response;
    try {
      res = await fetch(currentUrl, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new SafeFetchError('Request timeout', 504);
      }
      throw new SafeFetchError('Fetch failed: ' + err.message);
    } finally {
      clearTimeout(timeout);
    }
    
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      redirects++;
      if (redirects > MAX_REDIRECTS) {
        throw new SafeFetchError('Too many redirects');
      }
      const location = res.headers.get('location');
      if (!location) {
        throw new SafeFetchError('Redirect missing location header');
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    
    if (!res.ok) {
      throw new SafeFetchError(`HTTP Error: ${res.status}`, res.status);
    }
    
    const contentType = res.headers.get('content-type') || '';
    
    const reader = res.body?.getReader();
    if (!reader) {
      throw new SafeFetchError('Response body is unreadable');
    }
    
    let receivedBytes = 0;
    const chunks: Uint8Array[] = [];
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          receivedBytes += value.length;
          if (receivedBytes > maxBytes) {
            throw new SafeFetchError('Response too large');
          }
          chunks.push(value);
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    const totalBuffer = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      totalBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    
    const text = new TextDecoder().decode(totalBuffer);
    return {
      status: res.status,
      headers: res.headers,
      contentType,
      text: async () => text,
    };
  }
  
  throw new SafeFetchError('Too many redirects');
}
