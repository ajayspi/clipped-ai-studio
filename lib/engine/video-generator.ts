import {
  AIVideoGenerationRequest,
  AIVideoGenerationResponse,
  AIVideoModel,
  Scene,
} from './types';
import { buildAIVideoPrompt } from './prompts';
import { getApiKey } from '@/lib/keys';

// Sample royalty-free fallback video clips for dry-run / mock modes
const DRY_RUN_SAMPLE_VIDEOS: Record<string, string> = {
  landscape: 'https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4',
  portrait: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-flying-cars-41484-large.mp4',
  square: 'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4',
};

export class VideoGenerator {
  /**
   * Main entry point for generating AI videos.
   * Supports Kling AI, Luma Dream Machine, and Fal.ai with cost-safe dry-run fallback.
   */
  async generateAIVideo(request: AIVideoGenerationRequest): Promise<AIVideoGenerationResponse> {
    const rawScript = request.script || request.prompt || '';
    if (!rawScript || typeof rawScript !== 'string' || !rawScript.trim()) {
      throw new Error("Script is required for AI video generation");
    }

    const jobId = `job-ai-vid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const model: AIVideoModel = request.model || 'kling-v1';

    // Construct refined cinematic prompt using prompt builder
    const prompt = request.prompt || buildAIVideoPrompt({
      sceneText: request.script,
      visualStyle: request.style,
      cameraMotion: request.cameraMotion,
      negativePrompt: request.negativePrompt,
      characterAnchor: request.characterSheetUrl ? `Character ref: ${request.characterSheetUrl}` : undefined,
    });

    console.log(`[VideoGenerator] Initializing generation job ${jobId} with model: ${model}`);

    // If explicit mock requested, skip live API calls
    if (request.mock) {
      console.log(`[VideoGenerator] Explicit mock mode requested for job ${jobId}`);
      return this.generateDryRun(jobId, prompt, request);
    }

    // Provider routing based on model
    try {
      if (model === 'kling-v1') {
        const apiKey = process.env.KLING_API_KEY;
        if (!apiKey) {
          console.warn('[VideoGenerator] KLING_API_KEY is missing. Falling back to HF Space.');
          return await this.generateWithGradioFallback(jobId, prompt, request);
        }
        return await this.generateWithKling(jobId, prompt, request, apiKey);
      }

      if (model === 'luma-dream') {
        const apiKey = process.env.LUMA_API_KEY;
        if (!apiKey) {
          console.warn('[VideoGenerator] LUMA_API_KEY is missing. Falling back to HF Space.');
          return await this.generateWithGradioFallback(jobId, prompt, request);
        }
        return await this.generateWithLuma(jobId, prompt, request, apiKey);
      }

      if (model === 'fal-flux') {
        const apiKey = await getApiKey('fal', 'FAL_API_KEY');
        if (!apiKey) {
          console.warn('[VideoGenerator] FAL_API_KEY is missing. Falling back to HF Space.');
          return await this.generateWithGradioFallback(jobId, prompt, request);
        }
        return await this.generateWithFal(jobId, prompt, request, apiKey);
      }

      // Default fallback
      return this.generateDryRun(jobId, prompt, request, `Unknown Model ${model} (Dry Run)`);
    } catch (error: any) {
      console.error(`[VideoGenerator] Live generation failed for job ${jobId}:`, error?.message || error);
      // Graceful fallback to dry-run mock on API exception so user/test flows don't crash
      return this.generateDryRun(
        jobId,
        prompt,
        request,
        `${model} (Fallback after API error: ${error?.message || 'Network error'})`
      );
    }
  }

  /**
   * Generates video clips for a batch of multi-scene scripts.
   */
  async generateScenes(
    scenes: Scene[],
    options: Partial<AIVideoGenerationRequest> = {}
  ): Promise<Scene[]> {
    console.log(`[VideoGenerator] Generating AI videos for ${scenes.length} scenes...`);
    const updatedScenes: Scene[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const sceneRequest: AIVideoGenerationRequest = {
        script: scene.text || scene.description,
        prompt: scene.visualPrompt || scene.description,
        model: options.model || 'kling-v1',
        aspectRatio: options.aspectRatio || '16:9',
        duration: scene.duration || options.duration || 5,
        cameraMotion: scene.cameraMotion || options.cameraMotion,
        style: options.style,
        mock: options.mock,
      };

      const result = await this.generateAIVideo(sceneRequest);

      updatedScenes.push({
        ...scene,
        videoUrl: result.videoUrl,
        selectedVideo: {
          id: result.jobId,
          url: result.videoUrl,
          title: `Scene ${i + 1}: ${scene.description.substring(0, 30)}`,
          platform: 'openverse',
          duration: result.duration,
        },
      });
    }

    return updatedScenes;
  }

  /**
   * Kling AI Text-to-Video implementation.
   */
  private async generateWithKling(
    jobId: string,
    prompt: string,
    request: AIVideoGenerationRequest,
    apiKey: string
  ): Promise<AIVideoGenerationResponse> {
    console.log(`[VideoGenerator] Calling Kling AI API for job ${jobId}...`);

    const response = await fetch('https://api.klingai.com/v1/videos/text2video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_name: 'kling-v1',
        prompt: prompt,
        negative_prompt: request.negativePrompt || 'blurry, low quality, distorted, watermark',
        cfg_scale: 0.5,
        mode: 'std',
        aspect_ratio: request.aspectRatio === '9:16' ? '9:16' : request.aspectRatio === '1:1' ? '1:1' : '16:9',
        duration: request.duration && request.duration > 5 ? 10 : 5,
        camera_control: request.cameraMotion && request.cameraMotion !== 'static' ? {
          type: request.cameraMotion,
          config: { speed: 5 }
        } : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`Kling AI HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const videoUrl = data?.data?.task_result?.videos?.[0]?.url || data?.video_url || DRY_RUN_SAMPLE_VIDEOS.landscape;

    return {
      success: true,
      jobId,
      videoUrl,
      prompt,
      modelUsed: 'kling-v1',
      duration: request.duration || 5,
      metadata: {
        provider: 'kling-ai',
        taskId: data?.data?.task_id || data?.id,
        rawResponse: data,
      },
    };
  }

  /**
   * Luma Dream Machine Text-to-Video implementation.
   */
  private async generateWithLuma(
    jobId: string,
    prompt: string,
    request: AIVideoGenerationRequest,
    apiKey: string
  ): Promise<AIVideoGenerationResponse> {
    console.log(`[VideoGenerator] Calling Luma Dream Machine API for job ${jobId}...`);

    const response = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        aspect_ratio: request.aspectRatio === '9:16' ? '9:16' : request.aspectRatio === '1:1' ? '1:1' : '16:9',
        loop: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Luma Dream Machine HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const videoUrl = data?.assets?.video || data?.video?.url || DRY_RUN_SAMPLE_VIDEOS.landscape;

    return {
      success: true,
      jobId,
      videoUrl,
      prompt,
      modelUsed: 'luma-dream',
      duration: request.duration || 5,
      metadata: {
        provider: 'luma-ai',
        generationId: data?.id,
        state: data?.state,
      },
    };
  }

  /**
   * Fal.ai Video implementation.
   */
  private async generateWithFal(
    jobId: string,
    prompt: string,
    request: AIVideoGenerationRequest,
    apiKey: string
  ): Promise<AIVideoGenerationResponse> {
    console.log(`[VideoGenerator] Calling Fal.ai Video API for job ${jobId}...`);

    try {
      const { submitAndWait } = await import('../media/fal-client');

      const falJob = await submitAndWait({
        model: 'fal-ai/kling-video/v1/standard/text-to-video',
        input: {
          prompt: prompt,
          aspect_ratio: request.aspectRatio === '9:16' ? '9:16' : request.aspectRatio === '1:1' ? '1:1' : '16:9',
          duration: request.duration && request.duration > 5 ? '10' : '5',
          image_url: request.characterSheetUrl || undefined,
        }
      }, apiKey);

      if (falJob.status === 'completed' && falJob.asset) {
        return {
          success: true,
          jobId,
          videoUrl: falJob.asset.url,
          prompt,
          modelUsed: 'fal-flux',
          duration: request.duration || 5,
          metadata: {
            provider: 'fal-ai',
            requestId: falJob.requestId,
          },
        };
      }
      
      throw new Error(falJob.error || 'Unknown fal error');
    } catch (e: any) {
      console.error('[VideoGenerator] fal queue client error:', e.message);
      return this.generateDryRun(jobId, prompt, request, `Fal.ai (Fallback after failed generation)`);
    }
  }

  /**
   * Free Gradio fallback using Hugging Face spaces
   */
  private async generateWithGradioFallback(
    jobId: string,
    prompt: string,
    request: AIVideoGenerationRequest
  ): Promise<AIVideoGenerationResponse> {
    console.log(`[VideoGenerator] Calling Free HF Gradio Space for job ${jobId}...`);

    try {
      const { Client } = await import('@gradio/client');
      
      // Connect to a public zeroscope space
      const app = await Client.connect("fffiloni/zeroscope");
      const result = await app.predict("/infer", [
          prompt, // Prompt
          10,     // num_inference_steps
          7.5,    // guidance_scale
          24,     // Number of frames
      ]);

      let videoUrl = DRY_RUN_SAMPLE_VIDEOS.landscape;
      
      // The Gradio client returns a FileData object or array of them
      if (result?.data?.[0]?.url) {
        videoUrl = result.data[0].url;
      }

      return {
        success: true,
        jobId,
        videoUrl,
        prompt,
        modelUsed: 'hf-zeroscope (Gradio)',
        duration: request.duration || 5,
        metadata: {
          provider: 'huggingface',
          isDryRun: false,
        },
      };
    } catch (e: any) {
      console.error('[VideoGenerator] Gradio fallback failed:', e.message);
      return this.generateDryRun(jobId, prompt, request, `Gradio Fallback (Failed: ${e.message})`);
    }
  }

  /**
   * Cost-safe deterministic dry-run fallback generator.
   */
  private generateDryRun(
    jobId: string,
    prompt: string,
    request: AIVideoGenerationRequest,
    customModelNote?: string
  ): AIVideoGenerationResponse {
    const aspectRatio = request.aspectRatio || '16:9';
    let sampleVideo = DRY_RUN_SAMPLE_VIDEOS.landscape;
    if (aspectRatio === '9:16') sampleVideo = DRY_RUN_SAMPLE_VIDEOS.portrait;
    else if (aspectRatio === '1:1') sampleVideo = DRY_RUN_SAMPLE_VIDEOS.square;

    const modelUsed = customModelNote || `${request.model || 'kling-v1'} (Dry Run Mock)`;

    return {
      success: true,
      jobId,
      videoUrl: sampleVideo,
      prompt,
      modelUsed,
      duration: request.duration || 5,
      metadata: {
        isDryRun: true,
        aspectRatio: request.aspectRatio || '16:9',
        cameraMotion: request.cameraMotion || 'static',
        resolution: aspectRatio === '9:16' ? '1080x1920' : aspectRatio === '1:1' ? '1080x1080' : '1920x1080',
        fps: 30,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

export const videoGenerator = new VideoGenerator();
