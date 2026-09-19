import { Scene } from './types';

export interface ImageGenerationOptions {
  model?: 'flux-dev' | 'flux-schnell' | 'sdxl';
  aspectRatio?: '16:9' | '9:16' | '1:1';
  style?: string;
  seed?: number;
}

export class ImageGenerator {
  /**
   * Generates images for a list of scenes using Fal.ai Flux API (or similar)
   */
  async generateForScenes(scenes: Scene[], options: ImageGenerationOptions = {}): Promise<Scene[]> {
    const apiKey = process.env.FAL_API_KEY; // Using Fal.ai as the default for Flux
    const model = options.model || 'flux-schnell';
    const aspectRatio = options.aspectRatio || '16:9';

    if (!apiKey) {
      console.warn("FAL_API_KEY is missing. Mocking image generation for scenes.");
      return scenes.map((scene, i) => ({
        ...scene,
        selectedVideo: { // We reuse the Video type to store the image URL for the renderer
          id: `img-mock-${i}`,
          url: `https://image.pollinations.ai/prompt/${encodeURIComponent(scene.description)}?width=1024&height=1024&nologo=true`,
          title: `Generated for: ${scene.description.substring(0, 30)}`,
          platform: 'openverse', // Mock platform
        }
      }));
    }

    const updatedScenes = [...scenes];

    // In a production app, we would fire these off in parallel with Promise.all
    // But to respect rate limits, we'll do them sequentially or in small batches
    for (const scene of updatedScenes) {
      try {
        console.log(`Generating image for scene: ${scene.description.substring(0, 40)}...`);
        
        const baseStyle = "educational tech style, paradox style, consistent character anchor, minimalist stick man character";
        const prompt = options.style 
          ? `${scene.description}, in the style of ${options.style}, ${baseStyle}`
          : `${scene.description}, ${baseStyle}`;

        const res = await fetch(`https://fal.run/fal-ai/${model}`, {
          method: 'POST',
          headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: prompt,
            image_size: aspectRatio === '16:9' ? 'landscape_16_9' : aspectRatio === '9:16' ? 'portrait_9_16' : 'square',
            num_inference_steps: model === 'flux-schnell' ? 4 : 28,
            guidance_scale: 3.5,
            num_images: 1,
            enable_safety_checker: true
          }),
        });

        if (!res.ok) {
          throw new Error(`Image Gen API failed: ${res.statusText}`);
        }

        const data = await res.json();
        
        if (data.images && data.images.length > 0) {
          const imageUrl = data.images[0].url;
          scene.selectedVideo = {
            id: `fal-img-${Date.now()}`,
            url: imageUrl,
            title: scene.description.substring(0, 50),
            platform: 'openverse', // Reusing the type, represents static image
          };
          console.log(`Successfully generated image: ${imageUrl}`);
        }
      } catch (error) {
        console.error(`Failed to generate image for scene:`, error);
        // Fallback to a placeholder if generation fails
        scene.selectedVideo = {
          id: `img-err-${Date.now()}`,
          url: `https://placehold.co/1920x1080/2a2a2a/ffffff.png?text=Generation+Failed`,
          title: 'Generation Failed',
          platform: 'openverse',
        };
      }
    }

    return updatedScenes;
  }
}

export const imageGenerator = new ImageGenerator();
