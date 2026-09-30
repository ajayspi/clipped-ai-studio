import { searchVideos } from '../media/video-sources';
import { searchImages } from '../media/image-sources';

export interface ResolvedBeatMedia {
  url: string;
  kind: 'video' | 'image';
  provider: string;
  license: string;
  attribution?: string;
  sourceUrl?: string;
  query?: string;
  attempts?: string[];
  generated: boolean;
}

export async function resolveBeatMedia({
  beat,
  intent,
  aspectRatio,
  keys,
}: {
  beat: { text?: string; imagePrompt?: string; searchQuery?: string; keywords?: string[] };
  intent: 'video' | 'image';
  aspectRatio: '16:9' | '9:16' | '1:1';
  keys?: { pexels?: string; pixabay?: string };
}): Promise<ResolvedBeatMedia | null> {
  const query = beat.searchQuery || (beat.keywords && beat.keywords.length > 0 ? beat.keywords.join(' ') : beat.text);
  
  if (!query) {
    return null;
  }

  const apiKeys: Record<string, string> = {};
  if (keys?.pexels) apiKeys.PEXELS_API_KEY = keys.pexels;
  if (keys?.pixabay) apiKeys.PIXABAY_API_KEY = keys.pixabay;

  const attempts: string[] = [];

  if (intent === 'video') {
    try {
      const videos = await searchVideos({ query, limit: 1 }, apiKeys);
      if (videos && videos.length > 0) {
        const best = videos[0];
        return {
          url: best.url,
          kind: 'video',
          provider: best.provider,
          license: best.license || '',
          attribution: best.attribution,
          sourceUrl: best.sourceUrl,
          query,
          attempts: ['searchVideos'],
          generated: best.generated || false,
        };
      }
    } catch (err) {
      attempts.push(`searchVideos error: ${err}`);
    }
  }

  // Fallback to image search if intent is 'image' or video search missed
  try {
    const images = await searchImages({
      query,
      imagePrompt: beat.imagePrompt,
      aspectRatio,
      limit: 1
    }, apiKeys);

    if (images && images.length > 0) {
      const best = images[0];
      return {
        url: best.url,
        kind: 'image',
        provider: best.provider,
        license: best.license || '',
        attribution: best.attribution,
        sourceUrl: best.sourceUrl,
        query,
        attempts: [...attempts, 'searchImages'],
        generated: best.generated || false,
      };
    }
  } catch (err) {
    attempts.push(`searchImages error: ${err}`);
  }

  return null;
}
