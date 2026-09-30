import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchVideos } from '../lib/media/video-sources';

describe('searchVideos', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('T24-VID-01 - Pexels video hit -> MediaAsset with kind video', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('pexels')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            videos: [{
              id: 123,
              video_files: [{ link: 'v.mp4', width: 1920, height: 1080 }],
              image: 'img.jpg',
              user: { name: 'PexelsUser' },
              url: 'http://pexels.url'
            }]
          })
        });
      }
      return Promise.resolve({ ok: false });
    });

    const res = await searchVideos({ query: 'test' }, { PEXELS_API_KEY: 'key' });
    expect(res).toHaveLength(1);
    expect(res[0].kind).toBe('video');
    expect(res[0].provider).toBe('pexels');
  });

  it('T24-VID-02 - Pixabay video hit -> same', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('pixabay')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            hits: [{
              id: 456,
              videos: { large: { url: 'v2.mp4', width: 1920, height: 1080 } },
              picture_id: 'pic1',
              tags: 'tag1',
              user: 'PixabayUser',
              pageURL: 'http://pixabay.url'
            }]
          })
        });
      }
      return Promise.resolve({ ok: false });
    });

    const res = await searchVideos({ query: 'test' }, { PIXABAY_API_KEY: 'key' });
    expect(res).toHaveLength(1);
    expect(res[0].kind).toBe('video');
    expect(res[0].provider).toBe('pixabay');
  });

  it('T24-VID-03 - both empty -> [] (no generative fallback)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ videos: [], hits: [] })
    });

    const res = await searchVideos({ query: 'test' }, { PEXELS_API_KEY: 'key', PIXABAY_API_KEY: 'key' });
    expect(res).toEqual([]);
  });

  it('T24-VID-04 - Pexels rendition preference', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('pexels')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            videos: [{
              id: 123,
              video_files: [
                { link: '4k.mp4', width: 3840, height: 2160 },
                { link: '1080p.mp4', width: 1920, height: 1080 },
                { link: '720p.mp4', width: 1280, height: 720 }
              ],
              image: 'img.jpg',
              user: { name: 'PexelsUser' },
              url: 'http://pexels.url'
            }]
          })
        });
      }
      return Promise.resolve({ ok: false });
    });

    const res = await searchVideos({ query: 'test' }, { PEXELS_API_KEY: 'key' });
    expect(res).toHaveLength(1);
    expect(res[0].url).toBe('1080p.mp4');
    expect(res[0].width).toBe(1920);
  });

  it('T24-VID-05 - non-OK response yields [] and does not throw', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    const res = await searchVideos({ query: 'test' }, { PEXELS_API_KEY: 'key', PIXABAY_API_KEY: 'key' });
    expect(res).toEqual([]);
  });
});
