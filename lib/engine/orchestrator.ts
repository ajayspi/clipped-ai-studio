import { ScriptAnalysis, VideoMatch, GenerationResponse } from './types';
import { sceneMatcher } from './scene-matcher';
import { videoSourcer } from './video-sourcer';

export class VideoOrchestrator {
  async generateVideoPlan(script: string, platforms: string[] = ['pixabay', 'pexels']): Promise<GenerationResponse> {
    const id = `gen-${Date.now()}`;

    try {
      console.log(`[${id}] Analyzing script...`);
      const analysis = await sceneMatcher.analyzeScript(script);
      console.log(`[${id}] Found ${analysis.scenes.length} scenes`);

      console.log(`[${id}] Sourcing videos for each scene...`);
      const videoMatches: VideoMatch[] = [];

      for (const scene of analysis.scenes) {
        console.log(`[${id}] Processing scene: ${scene.text.substring(0, 50)}...`);

        // Search videos for this scene's keywords, on the requested platforms only
        const videos = await videoSourcer.searchForKeywords(scene.keywords, platforms);
        console.log(`[${id}] Found ${videos.length} videos for scene`);

        // For now, simple scoring: take the first video if available
        // In full port, we'd use videoScorer.scoreVideos
        const bestVideo = videos.length > 0 ? videos[0] : undefined;

        if (bestVideo) {
          scene.selectedVideo = bestVideo;
          videoMatches.push({
            video: bestVideo,
            score: 1,
            reason: 'First match found',
          });
          console.log(`[${id}] Selected video: ${bestVideo.title}`);
        }
      }

      return {
        id,
        status: 'completed',
        analysis,
        videos: videoMatches,
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

export const videoOrchestrator = new VideoOrchestrator();
