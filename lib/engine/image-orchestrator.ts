import { ScriptAnalysis, VideoMatch, GenerationResponse } from './types';
import { sceneMatcher } from './scene-matcher';
import { imageSourcer } from './image-sourcer';

export class ImageOrchestrator {
  async generateVideoPlan(script: string, platforms: string[] = ['pixabay', 'pexels']): Promise<GenerationResponse> {
    const id = `gen-img-${Date.now()}`;

    try {
      console.log(`[${id}] Analyzing script with strict 3-second intervals for images...`);
      // Pass 3 as targetDuration to force scenes to be roughly 3s long
      const analysis = await sceneMatcher.analyzeScript(script, 3);
      console.log(`[${id}] Found ${analysis.scenes.length} image scenes`);

      console.log(`[${id}] Sourcing images for each scene...`);
      const imageMatches: VideoMatch[] = [];

      for (const scene of analysis.scenes) {
        console.log(`[${id}] Processing scene: ${scene.text.substring(0, 50)}...`);

        // Search images for this scene's keywords
        const images = await imageSourcer.search(scene.keywords.join(' '), platforms);
        console.log(`[${id}] Found ${images.length} images for scene`);

        const bestImage = images.length > 0 ? images[0] : undefined;

        if (bestImage) {
          // Since it's an image, set duration to 3 if not already
          bestImage.duration = scene.duration || 3;
          scene.selectedVideo = bestImage; // We use the same field for simplicity
          imageMatches.push({
            video: bestImage,
            score: 1,
            reason: 'Intelligent image match across multiple sources',
          });
          console.log(`[${id}] Selected image: ${bestImage.title}`);
        }
      }

      return {
        id,
        status: 'completed',
        analysis,
        videos: imageMatches,
      };
    } catch (error) {
      console.error(`[${id}] Error:`, error);
      return {
        id,
        status: 'failed',
        analysis: { script, scenes: [], totalDuration: 0 },
        videos: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const imageOrchestrator = new ImageOrchestrator();
