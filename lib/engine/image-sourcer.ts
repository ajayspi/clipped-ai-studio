import { Video as Image } from "./types"
import { getApiKey } from '@/lib/keys';

export const PLATFORMS = ['pexels', 'pixabay', 'unsplash'] as const;
export type PlatformId = (typeof PLATFORMS)[number];

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  src: { original: string; large2x: string; large: string; medium: string; small: string; portrait: string; landscape: string; tiny: string };
  alt: string;
}

interface PixabayPhoto {
  id: number;
  tags: string;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  previewURL: string;
}

export class ImageSourcer {
  async searchPexels(query: string, perPage = 5): Promise<Image[]> {
    const key = await getApiKey('pexels', 'PEXELS_API_KEY');
    if (!key) return [];

    try {
      const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}`, {
        headers: { Authorization: key },
        next: { revalidate: 3600 }
      });
      
      if (!res.ok) return [];
      
      const data = await res.json();
      return (data.photos ?? []).map((photo: PexelsPhoto) => {
        return {
          id: `pexels-img-${photo.id}`,
          url: photo.src.large2x || photo.src.large || photo.src.original,
          title: photo.alt || query,
          platform: 'pexels' as const,
          thumbnail: photo.src.medium,
          duration: 3,
          width: photo.width,
          height: photo.height,
        };
      });
    } catch (error) {
      console.error('Pexels API error:', error);
      return [];
    }
  }

  async searchPixabay(query: string, perPage = 5): Promise<Image[]> {
    const key = await getApiKey('pixabay', 'PIXABAY_API_KEY');
    if (!key) return [];

    try {
      const res = await fetch(`https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&image_type=photo&per_page=${perPage}`, {
        next: { revalidate: 3600 }
      });
      
      if (!res.ok) return [];

      const data = await res.json();
      return (data.hits ?? []).map((photo: PixabayPhoto) => {
        return {
          id: `pixabay-img-${photo.id}`,
          url: photo.largeImageURL,
          title: photo.tags || query,
          platform: 'pixabay' as const,
          thumbnail: photo.previewURL,
          duration: 3,
          width: photo.imageWidth,
          height: photo.imageHeight,
        };
      });
    } catch (error) {
      console.error('Pixabay API error:', error);
      return [];
    }
  }

  async search(query: string, platforms: string[] = ['pexels', 'pixabay']): Promise<Image[]> {
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

    const flat = results.flat();
    return flat.sort(() => Math.random() - 0.5); // shuffle to ensure variety
  }
}

export const imageSourcer = new ImageSourcer();
