import { Video } from "./types"

export const PLATFORMS = ['pexels', 'pixabay', 'openverse'] as const;
export type PlatformId = (typeof PLATFORMS)[number];

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  image: string;
  duration: number;
  video_files: Array<{ quality: string; width: number; height: number; link: string }>;
}

interface PixabayVideo {
  id: number;
  tags: string;
  duration: number;
  videos: {
    large?: { url: string; width: number; height: number; thumbnail?: string };
    medium?: { url: string; width: number; height: number; thumbnail?: string };
  };
}

export class VideoSourcer {
  async searchPexels(query: string, perPage = 5): Promise<Video[]> {
    const key = process.env.PEXELS_API_KEY;
    if (!key) return [];

    try {
      const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}`, {
        headers: { Authorization: key },
        next: { revalidate: 3600 } // cache for an hour
      });
      
      if (!res.ok) return [];
      
      const data = await res.json();
      return (data.videos ?? []).map((video: PexelsVideo) => {
        const files = [...(video.video_files ?? [])].sort((a, b) => b.width - a.width);
        const best = files.find((f) => f.width <= 1920) ?? files[0];

        return {
          id: `pexels-${video.id}`,
          url: best?.link ?? '',
          title: query,
          platform: 'pexels' as const,
          thumbnail: video.image,
          duration: video.duration,
          width: best?.width ?? video.width,
          height: best?.height ?? video.height,
        };
      });
    } catch (error) {
      console.error('Pexels API error:', error);
      return [];
    }
  }

  async searchPixabay(query: string, perPage = 5): Promise<Video[]> {
    const key = process.env.PIXABAY_API_KEY;
    if (!key) return [];

    try {
      const res = await fetch(`https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(query)}&per_page=${perPage}`, {
        next: { revalidate: 3600 }
      });
      
      if (!res.ok) return [];

      const data = await res.json();
      return (data.hits ?? []).map((video: PixabayVideo) => {
        const rendition = video.videos.large ?? video.videos.medium;
        return {
          id: `pixabay-${video.id}`,
          url: rendition?.url ?? '',
          title: video.tags || query,
          platform: 'pixabay' as const,
          thumbnail: rendition?.thumbnail ?? `https://i.vimeocdn.com/video/${video.id}_295x166.jpg`,
          duration: video.duration,
          width: rendition?.width ?? 1920,
          height: rendition?.height ?? 1080,
        };
      });
    } catch (error) {
      console.error('Pixabay API error:', error);
      return [];
    }
  }

  async search(query: string, platforms: string[] = ['pexels', 'pixabay']): Promise<Video[]> {
    const wanted = platforms.filter((p): p is PlatformId =>
      (PLATFORMS as readonly string[]).includes(p),
    );

    const results = await Promise.all(
      wanted.map((platform) => {
        if (platform === 'pexels') return this.searchPexels(query);
        if (platform === 'pixabay') return this.searchPixabay(query);
        return [];
      }),
    );

    return results.flat().filter((video) => video.url);
  }

  async searchForKeywords(keywords: string[], platforms: string[] = ['pexels', 'pixabay']): Promise<Video[]> {
    const results = await Promise.all(
      keywords.slice(0, 4).map((keyword) => this.search(keyword, platforms)),
    );

    const seen = new Set<string>();
    return results.flat().filter((video) => {
      if (seen.has(video.id)) return false;
      seen.add(video.id);
      return true;
    });
  }
}

export const videoSourcer = new VideoSourcer();
