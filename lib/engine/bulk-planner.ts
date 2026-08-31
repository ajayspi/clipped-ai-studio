import {
  BulkPlanRequest,
  BulkPlanResponse,
  BulkPlanItem,
} from './types';
import { SYSTEM_PROMPTS, buildBulkPlanPrompt } from './prompts';

/**
 * Bulk Content Planner Engine.
 * Generates structured 1-30 day multi-video content calendars across omnichannel platforms
 * with hooks, scripts, visual prompts, and batch job ID mapping.
 */
export class BulkPlanner {
  /**
   * Generates a comprehensive bulk content calendar plan.
   */
  async generatePlan(request: BulkPlanRequest): Promise<BulkPlanResponse> {
    if (!request.niche || typeof request.niche !== 'string' || !request.niche.trim()) {
      throw new Error("niche is required for bulk planning");
    }

    const niche = request.niche.trim();
    // Clamp count between 1 and 30
    const rawCount = Number(request.contentCount);
    const contentCount = isNaN(rawCount)
      ? 7
      : Math.max(1, Math.min(rawCount, 30));

    const cadence = request.cadence || 'daily';
    const visualStyle = request.visualStyle || 'modern, clean, high aesthetic, 4k';
    const voice = request.voice || 'alloy';
    const aspectRatio = request.aspectRatio || '9:16';
    const platforms = Array.isArray(request.platforms) && request.platforms.length > 0
      ? request.platforms
      : ['tiktok', 'youtube', 'instagram'];

    console.log(`[BulkPlanner] Generating ${contentCount}-day content plan for niche: "${niche}" across platforms: ${platforms.join(', ')}`);

    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        const response = await this.generateWithOpenAI(
          niche,
          contentCount,
          cadence,
          platforms,
          visualStyle,
          voice,
          aspectRatio,
          apiKey
        );
        if (response && response.success && response.items && response.items.length > 0) {
          return response;
        }
      } catch (err: any) {
        console.warn(`[BulkPlanner] OpenAI generation failed (${err?.message || err}). Using cost-safe dry-run generator.`);
      }
    } else {
      console.log(`[BulkPlanner] OPENAI_API_KEY not configured. Using cost-safe dry-run generator.`);
    }

    // Cost-safe deterministic dry-run generation fallback
    return this.generateDryRun(niche, contentCount, cadence, platforms, visualStyle, voice, aspectRatio);
  }

  /**
   * OpenAI GPT-4o-mini structured JSON generation.
   */
  private async generateWithOpenAI(
    niche: string,
    contentCount: number,
    cadence: string,
    platforms: string[],
    visualStyle: string,
    voice: string,
    aspectRatio: string,
    apiKey: string
  ): Promise<BulkPlanResponse> {
    const prompt = buildBulkPlanPrompt(niche, contentCount, cadence, platforms, visualStyle);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.BULK_CONTENT_PLANNER },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    const parsed = JSON.parse(content);
    const planTitle = parsed.planTitle || `${contentCount}-Day ${niche} Content Plan`;

    const rawItems: any[] = Array.isArray(parsed.items) ? parsed.items : [];
    const items: BulkPlanItem[] = [];
    const batchJobIds: string[] = [];

    for (let day = 1; day <= contentCount; day++) {
      const raw = rawItems[day - 1] || {};
      const targetPlatform = raw.targetPlatform || platforms[(day - 1) % platforms.length] || 'TikTok';
      const jobId = `bulk-job-${day}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      batchJobIds.push(jobId);

      const title = raw.title || `Day ${day}: The Ultimate ${niche} Growth Strategy`;
      const hook = (raw.hook && String(raw.hook).trim()) ||
        `Stop making this huge mistake with ${niche}! Here is what top performers do instead on Day ${day}.`;
      const script = (raw.script && String(raw.script).trim()) ||
        `Welcome to day ${day} of mastering ${niche}. Today we break down the single most effective framework that guarantees measurable results. Try implementing this step immediately to transform your progress.`;
      const itemVisualStyle = raw.visualPrompt || `${visualStyle}, eye-catching thumbnail and dynamic b-roll for ${niche}`;
      const tags = Array.isArray(raw.tags) && raw.tags.length > 0
        ? raw.tags
        : [`#${niche.toLowerCase().replace(/[^a-z0-9]/g, '')}`, '#viral', '#growth', `#day${day}`];

      items.push({
        day,
        title,
        hook,
        script,
        visualPrompt: itemVisualStyle,
        targetPlatform,
        tags,
        status: raw.status || 'ready',
        scheduledDate: new Date(Date.now() + (day - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    }

    return {
      success: true,
      planTitle,
      items,
      batchJobIds,
      metadata: {
        niche,
        contentCount,
        cadence,
        platforms,
        visualStyle,
        voice,
        aspectRatio,
        provider: 'openai-gpt4o-mini',
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Deterministic cost-safe dry-run bulk plan generator.
   */
  private generateDryRun(
    niche: string,
    contentCount: number,
    cadence: string,
    platforms: string[],
    visualStyle: string,
    voice: string,
    aspectRatio: string
  ): BulkPlanResponse {
    const items: BulkPlanItem[] = [];
    const batchJobIds: string[] = [];
    const planTitle = `${contentCount}-Day ${niche} Content Plan`;

    const topicPillars = [
      { prefix: 'The Foundational Rule of', hookStyle: '99% of people fail at', action: 'Build the baseline framework' },
      { prefix: 'The Hidden Trap in', hookStyle: 'Stop wasting hours doing this wrong in', action: 'Eliminate friction points' },
      { prefix: 'The 10x Shortcut for', hookStyle: 'The secret tool that revolutionized our', action: 'Deploy smart automation' },
      { prefix: 'Case Study & Proof in', hookStyle: 'How this simple shift transformed', action: 'Analyze real-world data' },
      { prefix: 'Advanced Tactics for', hookStyle: 'What industry leaders never tell you about', action: 'Execute high-leverage moves' },
      { prefix: 'The 5-Minute Daily Habit in', hookStyle: 'If you only do ONE thing today for', action: 'Establish recurring consistency' },
      { prefix: 'Future Trends & Predictions in', hookStyle: 'Why everything you know about', action: 'Prepare for the next shift' },
    ];

    for (let day = 1; day <= contentCount; day++) {
      const pillar = topicPillars[(day - 1) % topicPillars.length];
      const platform = platforms[(day - 1) % platforms.length] || 'YouTube';
      const jobId = `bulk-job-${day}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      batchJobIds.push(jobId);

      const title = `Day ${day}: ${pillar.prefix} ${niche}`;
      const hook = `${pillar.hookStyle} ${niche}! Here is what you must fix right now on Day ${day}.`;
      const script = `In today's day ${day} breakdown for ${niche}, we focus on how to ${pillar.action.toLowerCase()}. When you follow this exact sequential step, your retention and output will instantly multiply. Save this video and take action today!`;
      const visualPrompt = `${visualStyle}, high impact cinematic visuals highlighting ${niche}, optimized for ${platform}`;
      const tags = [
        `#${niche.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        `#${platform.toLowerCase()}`,
        `#day${day}`,
        '#tips',
        '#growth',
      ];

      items.push({
        day,
        title,
        hook,
        script,
        visualPrompt,
        targetPlatform: platform,
        tags,
        status: 'ready',
        scheduledDate: new Date(Date.now() + (day - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    }

    return {
      success: true,
      planTitle,
      items,
      batchJobIds,
      metadata: {
        niche,
        contentCount,
        cadence,
        platforms,
        visualStyle,
        voice,
        aspectRatio,
        isDryRun: true,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

export const bulkPlanner = new BulkPlanner();
