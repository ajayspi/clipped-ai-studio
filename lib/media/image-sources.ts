import type { MediaAsset, ImageSourceQuery } from './types';

/**
 * Searches across multiple free image sources in priority order.
 * Follows the cascade: Openverse -> Pexels -> Pixabay -> Pollinations -> AI Horde.
 *
 * @param query - The search query and configuration.
 * @param apiKeys - Object containing available keys (PEXELS_API_KEY, PIXABAY_API_KEY).
 * @returns Array of fully resolved MediaAssets.
 */
export async function searchImages(
  query: ImageSourceQuery,
  apiKeys: Record<string, string> = {}
): Promise<MediaAsset[]> {
  const limit = query.limit || 5;
  const q = encodeURIComponent(query.query);
  const results: MediaAsset[] = [];

  // Helper to fetch Openverse
  const fetchOpenverse = async () => {
    try {
      const res = await fetch(`https://api.openverse.engineering/v1/images/?q=${q}&page_size=${limit}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.results) {
        for (const item of data.results) {
          results.push({
            id: `openverse-${item.id}`,
            kind: 'image',
            provider: 'openverse',
            url: item.url,
            thumbnailUrl: item.thumbnail,
            title: item.title,
            generated: false,
            license: item.license,
            attribution: item.attribution,
            sourceUrl: item.foreign_landing_url,
          });
        }
      }
    } catch (e) {
      console.error('Openverse search error:', e);
    }
  };

  // Helper to fetch Pexels
  const fetchPexels = async () => {
    const key = apiKeys.PEXELS_API_KEY;
    if (!key) return;
    try {
      const res = await fetch(`https://api.pexels.com/v1/search?query=${q}&per_page=${limit}`, {
        headers: { Authorization: key },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.photos) {
        for (const item of data.photos) {
          results.push({
            id: `pexels-${item.id}`,
            kind: 'image',
            provider: 'pexels',
            url: item.src.original,
            thumbnailUrl: item.src.medium,
            width: item.width,
            height: item.height,
            title: query.query,
            generated: false,
            license: 'Pexels License',
            attribution: item.photographer,
            sourceUrl: item.url,
          });
        }
      }
    } catch (e) {
      console.error('Pexels search error:', e);
    }
  };

  // Helper to fetch Pixabay
  const fetchPixabay = async () => {
    const key = apiKeys.PIXABAY_API_KEY;
    if (!key) return;
    try {
      const res = await fetch(`https://pixabay.com/api/?key=${key}&q=${q}&per_page=${limit}&image_type=photo`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.hits) {
        for (const item of data.hits) {
          results.push({
            id: `pixabay-${item.id}`,
            kind: 'image',
            provider: 'pixabay',
            url: item.largeImageURL,
            thumbnailUrl: item.previewURL,
            width: item.imageWidth,
            height: item.imageHeight,
            title: item.tags,
            generated: false,
            license: 'Pixabay License',
            attribution: item.user,
            sourceUrl: item.pageURL,
          });
        }
      }
    } catch (e) {
      console.error('Pixabay search error:', e);
    }
  };

  // 1. Try Openverse first
  await fetchOpenverse();

  // 2. Try Pexels
  if (apiKeys.PEXELS_API_KEY) {
    await fetchPexels();
  }

  // 3. Try Pixabay
  if (apiKeys.PIXABAY_API_KEY) {
    await fetchPixabay();
  }

  // 4. Fallback to Pollinations (Generative AI) if nothing found
  if (results.length === 0) {
    let width = 1024, height = 1024;
    if (query.aspectRatio === '16:9') { width = 1920; height = 1080; }
    else if (query.aspectRatio === '9:16') { width = 1080; height = 1920; }
    
    results.push({
      id: `pollinations-${Date.now()}`,
      kind: 'image',
      provider: 'pollinations',
      url: `https://image.pollinations.ai/prompt/${q}?width=${width}&height=${height}&nologo=true`,
      width,
      height,
      generated: true,
      prompt: query.query,
    });
  }

  return results;
}
