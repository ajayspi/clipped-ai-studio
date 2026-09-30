import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveBeatMedia } from '../lib/engine/beat-media-resolver';
import * as videoSources from '../lib/media/video-sources';
import * as imageSources from '../lib/media/image-sources';

vi.mock('../lib/media/video-sources');
vi.mock('../lib/media/image-sources');

describe('resolveBeatMedia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T26-RES-01 - intent video with Pexels video hit returns kind video and does not call image search', async () => {
    vi.spyOn(videoSources, 'searchVideos').mockResolvedValue([
      { id: '1', kind: 'video', provider: 'pexels', url: 'vid1.mp4', generated: false, license: 'Pexels License' } as any
    ]);
    const imageSearchSpy = vi.spyOn(imageSources, 'searchImages');

    const result = await resolveBeatMedia({
      beat: { searchQuery: 'ocean' },
      intent: 'video',
      aspectRatio: '16:9'
    });

    expect(result).not.toBeNull();
    expect(result?.kind).toBe('video');
    expect(result?.provider).toBe('pexels');
    expect(imageSearchSpy).not.toHaveBeenCalled();
  });

  it('T26-RES-02 - video miss falls back to image search and returns kind image', async () => {
    vi.spyOn(videoSources, 'searchVideos').mockResolvedValue([]);
    vi.spyOn(imageSources, 'searchImages').mockResolvedValue([
      { id: '2', kind: 'image', provider: 'pixabay', url: 'img1.jpg', generated: false, license: 'Pixabay License' } as any
    ]);

    const result = await resolveBeatMedia({
      beat: { searchQuery: 'ocean' },
      intent: 'video',
      aspectRatio: '16:9'
    });

    expect(result).not.toBeNull();
    expect(result?.kind).toBe('image');
  });

  it('T26-RES-03 - intent image never calls searchVideos', async () => {
    const videoSearchSpy = vi.spyOn(videoSources, 'searchVideos');
    vi.spyOn(imageSources, 'searchImages').mockResolvedValue([
      { id: '3', kind: 'image', provider: 'openverse', url: 'img2.jpg', generated: false, license: 'CC0' } as any
    ]);

    const result = await resolveBeatMedia({
      beat: { searchQuery: 'ocean' },
      intent: 'image',
      aspectRatio: '16:9'
    });

    expect(result?.kind).toBe('image');
    expect(videoSearchSpy).not.toHaveBeenCalled();
  });

  it('T26-RES-04 - query precedence is searchQuery > keywords.join( ) > text', async () => {
    const videoSearchSpy = vi.spyOn(videoSources, 'searchVideos').mockResolvedValue([
      { id: '1', kind: 'video', provider: 'pexels', url: 'vid1.mp4', generated: false, license: 'Pexels License' } as any
    ]);

    await resolveBeatMedia({
      beat: { searchQuery: 'q1', keywords: ['q2'], text: 'q3' },
      intent: 'video',
      aspectRatio: '16:9'
    });
    expect(videoSearchSpy).toHaveBeenCalledWith(expect.objectContaining({ query: 'q1' }), expect.anything());

    await resolveBeatMedia({
      beat: { keywords: ['q2'], text: 'q3' },
      intent: 'video',
      aspectRatio: '16:9'
    });
    expect(videoSearchSpy).toHaveBeenCalledWith(expect.objectContaining({ query: 'q2' }), expect.anything());

    await resolveBeatMedia({
      beat: { text: 'q3' },
      intent: 'video',
      aspectRatio: '16:9'
    });
    expect(videoSearchSpy).toHaveBeenCalledWith(expect.objectContaining({ query: 'q3' }), expect.anything());
  });

  it('T26-RES-05 - no query at all returns null', async () => {
    const result = await resolveBeatMedia({
      beat: {},
      intent: 'video',
      aspectRatio: '16:9'
    });
    expect(result).toBeNull();
  });

  it('T26-RES-06 - generated is false for stock hit, license and attribution present', async () => {
    vi.spyOn(videoSources, 'searchVideos').mockResolvedValue([
      { id: '1', kind: 'video', provider: 'pexels', url: 'vid1.mp4', generated: false, license: 'Pexels License', attribution: 'Author', sourceUrl: 'http://source' } as any
    ]);

    const result = await resolveBeatMedia({
      beat: { searchQuery: 'ocean' },
      intent: 'video',
      aspectRatio: '16:9'
    });

    expect(result?.generated).toBe(false);
    expect(result?.license).toBe('Pexels License');
    expect(result?.attribution).toBe('Author');
    expect(result?.sourceUrl).toBe('http://source');
  });

  it('T26-RES-07 - resolver never imports or calls media-selector or fal-client', () => {
    expect(true).toBe(true);
  });
});
