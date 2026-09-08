import type { Scene } from '@/lib/engine/types';
import type { MediaAsset } from './types';
import { searchImages } from './image-sources';
import { submitAndWait } from './fal-client';
import { getApiKey } from '@/lib/keys';

export async function selectSceneMedia(
  scene: Scene,
  options: { allowGenerated?: boolean; aspectRatio?: string } = {}
): Promise<MediaAsset> {
  // 1. Existing video
  if (scene.selectedVideo?.url) {
    return {
      id: `existing-${Date.now()}`,
      kind: 'video',
      provider: 'existing',
      url: scene.selectedVideo.url,
      generated: false,
    };
  }

  // 2. Search stock images
  const pexelsKey = await getApiKey('pexels', 'PEXELS_API_KEY');
  const pixabayKey = await getApiKey('pixabay', 'PIXABAY_API_KEY');
  
  const queryWords = [...(scene.keywords || [])];
  if (queryWords.length === 0 && scene.text) queryWords.push(scene.text);
  const searchQuery = queryWords.join(' ') || 'abstract';

  const stockImages = await searchImages({
    query: searchQuery,
    limit: 1,
    aspectRatio: options.aspectRatio,
  }, {
    ...(pexelsKey ? { PEXELS_API_KEY: pexelsKey } : {}),
    ...(pixabayKey ? { PIXABAY_API_KEY: pixabayKey } : {})
  });

  const firstImage = stockImages.length > 0 ? stockImages[0] : null;

  // Return stock image immediately if it's not the pollinations fallback
  if (firstImage && firstImage.provider !== 'pollinations') {
    return firstImage;
  }

  // 3. If generative AI is allowed, try fal-ai
  if (options.allowGenerated !== false) {
    const falKey = await getApiKey('fal', 'FAL_API_KEY');
    if (falKey) {
      try {
        const prompt = scene.imagePrompt || scene.description || scene.text || 'abstract image';
        const imageSize = options.aspectRatio === '16:9' ? 'landscape_16_9' 
                        : options.aspectRatio === '9:16' ? 'portrait_9_16' 
                        : 'square';
                        
        const falJob = await submitAndWait({
          model: 'fal-ai/flux/dev',
          input: {
            prompt,
            image_size: imageSize,
            num_images: 1,
          }
        }, falKey);

        if (falJob.status === 'completed' && falJob.asset) {
          return falJob.asset;
        }
      } catch (err) {
        console.error('fal image generation failed:', err);
      }
    }
  }

  // 4. Return pollinations fallback if generated is allowed and we have one
  if (options.allowGenerated !== false && firstImage && firstImage.provider === 'pollinations') {
    return firstImage;
  }

  throw new Error('No media found for scene');
}
