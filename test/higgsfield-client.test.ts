import { describe, test, expect, vi, beforeEach } from 'vitest';
import { 
  parseHiggsfieldCredentials, 
  buildAuthHeader, 
  submitAndWait, 
  estimate 
} from '../lib/media/higgsfield-client';

describe('Higgsfield Client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('Credentials', () => {
    test('T30-CRD-01 splits id and secret correctly', () => {
      const creds = parseHiggsfieldCredentials('myid:mysecret');
      expect(creds.keyId).toBe('myid');
      expect(creds.keySecret).toBe('mysecret');
      expect(buildAuthHeader(creds)).toBe('Key myid:mysecret');
    });

    test('T30-CRD-02 splits on the first colon only', () => {
      const creds = parseHiggsfieldCredentials('myid:mysecret:with:colons');
      expect(creds.keyId).toBe('myid');
      expect(creds.keySecret).toBe('mysecret:with:colons');
    });

    test('T30-CRD-03 throws on malformed credentials', () => {
      expect(() => parseHiggsfieldCredentials('')).toThrow();
      expect(() => parseHiggsfieldCredentials('nocolon')).toThrow();
      expect(() => parseHiggsfieldCredentials(':nosecret')).toThrow();
      expect(() => parseHiggsfieldCredentials('noid:')).toThrow();
    });

    test('T30-CRD-04 secret never appears in error messages', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve(''),
      } as any);

      await expect(
        submitAndWait({ endpointId: 'test', input: { p: 1 } }, { keyId: 'id', keySecret: 'supersecret' })
      ).rejects.toThrowError(/Submit failed: 401 Unauthorized/);
      
      try {
        await submitAndWait({ endpointId: 'test', input: { p: 1 } }, { keyId: 'id', keySecret: 'supersecret' });
      } catch (e: any) {
        expect(e.message).not.toContain('supersecret');
      }
    });
  });

  describe('Submit and Poll', () => {
    const creds = { keyId: 'test', keySecret: 'secret' };

    test('T30-SUB-01 POSTs with auth header and body', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ request_id: 'req1', status_url: 'https://api.higgsfield.ai/status' }),
      } as any);
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'completed', image: { url: 'img.jpg' } }),
      } as any);

      await submitAndWait({ endpointId: 'endpt1', input: { prompt: 'hello' } }, creds);
      
      expect(fetch).toHaveBeenCalledWith('https://api.higgsfield.ai/endpt1', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Key test:secret',
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ prompt: 'hello' })
      }));
    });

    test('T30-SUB-02 polls the returned status_url', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ request_id: 'req1', status_url: 'https://api.higgsfield.ai/poll-here' }),
      } as any);
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'completed', image: { url: 'img.jpg' } }),
      } as any);

      await submitAndWait({ endpointId: 'endpt1', input: { p: 1 } }, creds);
      expect(fetch).toHaveBeenCalledWith('https://api.higgsfield.ai/poll-here', expect.anything());
    });

    test('T30-SUB-03 host-confusion guard', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ request_id: 'req1', status_url: 'https://evil.com/status' }),
      } as any);

      const job = await submitAndWait({ endpointId: 'endpt1', input: { p: 1 } }, creds);
      expect(job.status).toBe('failed');
      expect(job.error).toMatch(/Invalid status URL/);
    });

    test('T30-SUB-04 video URL creates video asset', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ request_id: 'req1', status_url: 'https://api.higgsfield.ai/poll-here' }),
      } as any);
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'completed', video: { url: 'vid.mp4' } }),
      } as any);

      const job = await submitAndWait({ endpointId: 'endpt1', input: { p: 1 } }, creds);
      expect(job.status).toBe('completed');
      expect(job.asset?.kind).toBe('video');
      expect(job.asset?.url).toBe('vid.mp4');
      expect(job.asset?.provider).toBe('higgsfield');
      expect(job.asset?.generated).toBe(true);
    });

    test('T30-SUB-05 image URLs create image asset', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ request_id: 'req1', status_url: 'https://api.higgsfield.ai/poll-here' }),
      } as any);
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'completed', image: { url: 'img.png' } }),
      } as any);

      const job = await submitAndWait({ endpointId: 'endpt1', input: { p: 1 } }, creds);
      expect(job.status).toBe('completed');
      expect(job.asset?.kind).toBe('image');
      expect(job.asset?.url).toBe('img.png');
    });

    test('T30-SUB-06 prompt is carried onto asset', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ request_id: 'req1', status_url: 'https://api.higgsfield.ai/poll-here' }),
      } as any);
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'completed', image: { url: 'img.png' } }),
      } as any);

      const job = await submitAndWait({ endpointId: 'endpt1', input: { prompt: 'my prompt' } }, creds);
      expect(job.asset?.prompt).toBe('my prompt');
    });

    test('T30-SUB-07 returns failed job on timeout', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ request_id: 'req1', status_url: 'https://api.higgsfield.ai/poll-here' }),
      } as any);
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'processing' }),
      } as any);

      const job = await submitAndWait({ endpointId: 'endpt1', input: { p: 1 }, timeoutMs: 10, pollIntervalMs: 5 }, creds);
      expect(job.status).toBe('failed');
      expect(job.error).toMatch(/Job timed out/);
    });

    test('T30-SUB-08 returns failed job on poll failure', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ request_id: 'req1', status_url: 'https://api.higgsfield.ai/poll-here' }),
      } as any);
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      } as any);

      const job = await submitAndWait({ endpointId: 'endpt1', input: { p: 1 } }, creds);
      expect(job.status).toBe('failed');
      expect(job.error).toMatch(/Poll failed/);
    });

    test('T30-SUB-09 throws on submit non-OK', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      } as any);

      await expect(submitAndWait({ endpointId: 'endpt1', input: { p: 1 } }, creds)).rejects.toThrow();
    });

    test('T30-SUB-10 terminal nsfw returns failed and is not retried', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ request_id: 'req1', status_url: 'https://api.higgsfield.ai/poll-here' }),
      } as any);
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'nsfw', reason: 'Blocked content' }),
      } as any);

      const job = await submitAndWait({ endpointId: 'endpt1', input: { p: 1 } }, creds);
      expect(job.status).toBe('failed');
      expect(job.error).toContain('nsfw');
    });
  });

  describe('Concurrency 400', () => {
    const creds = { keyId: 'test', keySecret: 'secret' };

    test('T30-CON-01 concurrency 400 is reported as retryable-busy', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('{"error": "Maximum number of concurrent requests (4) has been reached"}')
      } as any);

      const job = await submitAndWait({ endpointId: 'endpt1', input: { p: 1 } }, creds);
      expect(job.status).toBe('failed');
      expect(job.error).toMatch(/Maximum number of concurrent requests/i);
    });

    test('T30-CON-02 plain 400 is not classified as busy', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('{"error": "Malformed request"}'),
        statusText: 'Bad Request'
      } as any);

      await expect(submitAndWait({ endpointId: 'endpt1', input: { p: 1 } }, creds)).rejects.toThrowError(/Submit failed: 400/);
    });
  });

  describe('Estimate', () => {
    const creds = { keyId: 'test', keySecret: 'secret' };

    test('T30-EST-01 returns parsed credits and usd', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ credits: 10, usd: 0.15 })
      } as any);

      const result = await estimate('endpt1', { p: 1 }, creds);
      expect(result).toEqual({ credits: 10, usd: 0.15 });
      expect(fetch).toHaveBeenCalledWith('https://api.higgsfield.ai/estimate/endpt1', expect.anything());
    });

    test('T30-EST-02 non-OK or unparseable returns null', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500
      } as any);

      expect(await estimate('endpt1', { p: 1 }, creds)).toBeNull();

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ foo: 'bar' })
      } as any);

      expect(await estimate('endpt1', { p: 1 }, creds)).toBeNull();
    });
  });
});
