import type { MediaAsset } from './types';

export interface VideoSourceQuery {
  query: string;
  limit?: number;
}

/**
 * Searches for free stock videos in priority order: Pexels -> Pixabay.
 * Returns empty array on miss or error.
 */
export async function searchVideos(
  query: VideoSourceQuery,
  apiKeys: Record<string, string> = {}
): Promise<MediaAsset[]> {
  const limit = query.limit || 5;
  const q = encodeURIComponent(query.query);
  const results: MediaAsset[] = [];

  const fetchPexels = async () => {
    const key = apiKeys.PEXELS_API_KEY;
    if (!key) return;
    try {
      const res = await fetch(`https://api.pexels.com/videos/search?query=${q}&per_page=${limit}`, {
        headers: { Authorization: key },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.videos) {
        for (const item of data.videos) {
          if (!item.video_files || item.video_files.length === 0) continue;
          
          let bestFile = item.video_files[0];
          const hdFiles = item.video_files
            .filter((f: any) => f.width <= 1920)
            .sort((a: any, b: any) => b.width - a.width);
            
          if (hdFiles.length > 0) {
            bestFile = hdFiles[0];
          } else {
            bestFile = item.video_files.sort((a: any, b: any) => b.width - a.width)[0];
          }

          results.push({
            id: `pexels-video-${item.id}`,
            kind: 'video',
            provider: 'pexels',
            url: bestFile.link,
            thumbnailUrl: item.image,
            width: bestFile.width,
            height: bestFile.height,
            title: query.query,
            generated: false,
            license: 'Pexels License',
            attribution: item.user?.name,
            sourceUrl: item.url,
          });
        }
      }
    } catch (e) {
      console.error('Pexels video search error:', e);
    }
  };

  const fetchPixabay = async () => {
    const key = apiKeys.PIXABAY_API_KEY;
    if (!key) return;
    try {
      const res = await fetch(`https://pixabay.com/api/videos/?key=${key}&q=${q}&per_page=${limit}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.hits) {
        for (const item of data.hits) {
          const videoInfo = item.videos?.large || item.videos?.medium || item.videos?.small;
          if (!videoInfo) continue;

          results.push({
            id: `pixabay-video-${item.id}`,
            kind: 'video',
            provider: 'pixabay',
            url: videoInfo.url,
            thumbnailUrl: item.picture_id ? `https://i.vimeocdn.com/video/${item.picture_id}_640x360.jpg` : '',
            width: videoInfo.width,
            height: videoInfo.height,
            title: item.tags,
            generated: false,
            license: 'Pixabay License',
            attribution: item.user,
            sourceUrl: item.pageURL,
          });
        }
      }
    } catch (e) {
      console.error('Pixabay video search error:', e);
    }
  };

  if (apiKeys.PEXELS_API_KEY) {
    await fetchPexels();
  }

  if (apiKeys.PIXABAY_API_KEY) {
    await fetchPixabay();
  }

  return results;
}
