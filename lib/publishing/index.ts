/**
 * Unified Social Publishing module entry point for Clipped.
 * Exports all publisher implementations, factory helper, rate limiters,
 * and SocialPublisherManager with multi-platform broadcasting and Supabase persistence.
 */

import {
  ISocialPublisher,
  SocialPlatform,
  PublishRequest,
  PublishResponse,
  SocialCredentials,
  VideoPrivacy,
  ValidationError,
} from './types';
import { YouTubePublisher, youtubePublisher } from './youtube';
import { InstagramPublisher, instagramPublisher } from './instagram';
import { TikTokPublisher, tiktokPublisher } from './tiktok';
import { supabase } from '../db';

// Re-export all sub-modules
export * from './types';
export * from './rate-limiter';
export * from './youtube';
export * from './instagram';
export * from './tiktok';

/**
 * Returns the publisher singleton instance for a given social platform.
 */
export function getPublisher(platform: SocialPlatform | string): ISocialPublisher {
  switch (platform?.toLowerCase()) {
    case 'youtube':
      return youtubePublisher;
    case 'instagram':
      return instagramPublisher;
    case 'tiktok':
      return tiktokPublisher;
    default:
      throw new ValidationError(
        `Unsupported publishing platform: "${platform}". Expected "youtube", "instagram", or "tiktok".`
      );
  }
}

export interface MultiPublishRequest {
  videoId?: string;
  title: string;
  description?: string;
  caption?: string;
  tags?: string[];
  videoUrl?: string;
  videoBuffer?: Buffer | Uint8Array;
  coverUrl?: string;
  privacy?: VideoPrivacy;
  scheduledAt?: string;
  platforms?: SocialPlatform[];
  isDryRun?: boolean; // Defaults to true
  credentialsMap?: Partial<Record<SocialPlatform, SocialCredentials>>;
  metadata?: Record<string, any>;
}

export interface MultiPublishResult {
  success: boolean;
  totalPlatforms: number;
  successfulPlatforms: number;
  results: Record<string, PublishResponse>;
  responses?: PublishResponse[];
  errors?: Record<string, string>;
}

export class SocialPublisherManager {
  /**
   * Publishes a video to a single social platform and records publication history
   * in the Supabase published_videos table when a videoId is provided.
   */
  async publish(request: PublishRequest): Promise<PublishResponse> {
    const isDryRun = request.isDryRun !== false;
    const publisher = getPublisher(request.platform);

    const response = await publisher.publishVideo({
      ...request,
      isDryRun,
    });

    // Record in Supabase published_videos table if videoId is provided and publish succeeded
    if (request.videoId && response.success) {
      try {
        await supabase.from('published_videos').insert({
          video_id: request.videoId,
          platform: request.platform,
          platform_id: response.platformVideoId,
          url: response.publishedUrl,
          published_at: response.publishedAt || new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn(
          `[SocialPublisherManager] Failed to record publish in Supabase for ${request.platform}:`,
          dbErr
        );
      }
    }

    return response;
  }

  /**
   * Publishes a video across multiple social networks in parallel,
   * aggregating results and writing records to Supabase.
   * Supports both a MultiPublishRequest object or an array of PublishRequest items.
   */
  async publishToMultiple(
    requestOrArray: MultiPublishRequest | PublishRequest[]
  ): Promise<MultiPublishResult> {
    let requests: PublishRequest[] = [];

    if (Array.isArray(requestOrArray)) {
      requests = requestOrArray;
    } else {
      const multiReq = requestOrArray;
      const isDryRun = multiReq.isDryRun !== false;
      const targetPlatforms =
        multiReq.platforms && multiReq.platforms.length > 0
          ? multiReq.platforms
          : (['youtube', 'instagram', 'tiktok'] as SocialPlatform[]);

      requests = targetPlatforms.map((platform) => ({
        platform,
        videoId: multiReq.videoId,
        title: multiReq.title,
        description: multiReq.description,
        caption: multiReq.caption,
        tags: multiReq.tags,
        videoUrl: multiReq.videoUrl,
        videoBuffer: multiReq.videoBuffer,
        coverUrl: multiReq.coverUrl,
        privacy: multiReq.privacy,
        scheduledAt: multiReq.scheduledAt,
        isDryRun,
        credentials: multiReq.credentialsMap?.[platform],
        metadata: multiReq.metadata,
      }));
    }

    const results: Record<string, PublishResponse> = {};
    const errors: Record<string, string> = {};
    const responses: PublishResponse[] = [];

    const publishPromises = requests.map(async (req) => {
      try {
        const res = await this.publish(req);
        results[req.platform] = res;
        responses.push(res);
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        errors[req.platform] = errorMsg;
        const failedRes: PublishResponse = {
          success: false,
          platform: req.platform,
          platformVideoId: '',
          publishedUrl: '',
          isDryRun: req.isDryRun !== false,
          status: 'failed',
          publishedAt: new Date().toISOString(),
          logs: [`[SocialPublisherManager] Publication to ${req.platform} failed: ${errorMsg}`],
          error: errorMsg,
        };
        results[req.platform] = failedRes;
        responses.push(failedRes);
      }
    });

    await Promise.all(publishPromises);

    const successfulCount = Object.values(results).filter((r) => r?.success).length;

    return {
      success: successfulCount === requests.length && requests.length > 0,
      totalPlatforms: requests.length,
      successfulPlatforms: successfulCount,
      results,
      responses,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  }
}

export const socialPublisherManager = new SocialPublisherManager();
