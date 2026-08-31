import {
  AutoPilotConfig,
  AutoPilotResponse,
  AspectRatio,
  Scene,
} from './types';
import { SYSTEM_PROMPTS } from './prompts';
import { videoGenerator } from './video-generator';

/**
 * AutoPilot Autonomous Pipeline Engine.
 * Enables hands-off video generation pipelines driven by trending RSS/niches,
 * recurring schedule calculation, multi-platform publishing configuration,
 * and cost-safe deterministic fallback synthesis.
 */
export class AutoPilot {
  /**
   * Main entry point to configure, schedule, and execute an automated video pipeline.
   */
  async executePipeline(config: AutoPilotConfig): Promise<AutoPilotResponse> {
    // 1. Strict Input Validation
    if (!config.pipelineName || typeof config.pipelineName !== 'string' || !config.pipelineName.trim()) {
      throw new Error('pipelineName is required for auto-pilot configuration');
    }

    if (!config.niche || typeof config.niche !== 'string' || !config.niche.trim()) {
      throw new Error('niche is required for auto-pilot configuration');
    }

    const pipelineName = config.pipelineName.trim();
    const niche = config.niche.trim();
    const schedule = config.schedule || 'daily';
    const sourceStrategy = config.sourceStrategy || 'trending-rss';
    const visualPipeline = config.visualPipeline || 'ai-videos';
    const autoPublish = Boolean(config.autoPublish);
    const targetPlatforms = Array.isArray(config.targetPlatforms) && config.targetPlatforms.length > 0
      ? config.targetPlatforms
      : ['youtube'];
    const voice = config.voice || 'alloy';
    const visualStyle = config.visualStyle || 'modern cinematic, 4k, hyper-detailed';
    const aspectRatio: AspectRatio = (config.aspectRatio as AspectRatio) || '9:16';

    console.log(`[AutoPilot] Initializing pipeline "${pipelineName}" for niche: "${niche}" [Schedule: ${schedule}, Visual: ${visualPipeline}]`);

    // 2. Generate unique IDs
    const pipelineId = `pipe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const generatedJobId = `job-auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // 3. Compute next scheduled run ISO timestamp
    const nextRun = this.computeNextRun(schedule);

    // 4. Synthesize trending topic and script for immediate execution / preview
    const { topic, script, hook } = await this.synthesizeTrendingContent(niche, sourceStrategy);

    // 5. Trigger first run / provision job metadata
    let initialJobResult: any = null;
    try {
      if (visualPipeline === 'ai-videos') {
        initialJobResult = await videoGenerator.generateAIVideo({
          script: `${hook} ${script}`,
          model: 'kling-v1',
          aspectRatio,
          voice,
          style: visualStyle,
          mock: !Boolean(process.env.KLING_API_KEY),
        });
      }
    } catch (err: any) {
      console.warn(`[AutoPilot] Initial video generation dry run notice: ${err?.message || err}`);
    }

    // 6. Return response contract
    return {
      success: true,
      pipelineId,
      nextRun,
      generatedJobId,
      status: 'active',
      metadata: {
        pipelineName,
        niche,
        schedule,
        sourceStrategy,
        visualPipeline,
        autoPublish,
        targetPlatforms,
        voice,
        visualStyle,
        aspectRatio,
        generatedTopic: topic,
        previewScript: script,
        previewHook: hook,
        initialJobResult: initialJobResult ? {
          jobId: initialJobResult.jobId,
          videoUrl: initialJobResult.videoUrl,
          duration: initialJobResult.duration,
        } : undefined,
        isDryRun: !Boolean(process.env.OPENAI_API_KEY),
        configuredAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Computes a valid future ISO timestamp based on cron expression or cadence keyword.
   */
  public computeNextRun(schedule?: string): string {
    const now = new Date();
    if (!schedule || typeof schedule !== 'string' || !schedule.trim()) {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
    const cleanSched = schedule.trim().toLowerCase();

    // Cron expression format: "* * * * *" (minute hour day-of-month month day-of-week)
    const cronParts = schedule.trim().split(/\s+/);
    if (cronParts.length === 5) {
      const [minuteStr, hourStr, domStr, monthStr, dowStr] = cronParts;
      const targetHour = parseInt(hourStr, 10);
      const targetMinute = parseInt(minuteStr, 10);
      const targetDow = dowStr !== '*' ? parseInt(dowStr, 10) : null;

      if (!isNaN(targetHour) && !isNaN(targetMinute)) {
        const nextDate = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          targetHour,
          targetMinute,
          0,
          0
        ));

        // If time has already passed today, advance by at least 1 day
        if (nextDate.getTime() <= now.getTime()) {
          nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        }

        // If specific day of week is requested (0 = Sun, 1 = Mon, ..., 6 = Sat)
        if (targetDow !== null && !isNaN(targetDow)) {
          while (nextDate.getUTCDay() !== targetDow) {
            nextDate.setUTCDate(nextDate.getUTCDate() + 1);
          }
        }

        return nextDate.toISOString();
      }
    }

    // Keyword cadence mapping
    if (cleanSched === 'hourly') {
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    }

    if (cleanSched === 'twice_daily') {
      return new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
    }

    if (cleanSched === 'weekly') {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    if (cleanSched === 'manual') {
      return new Date(now.getTime() + 60 * 1000).toISOString();
    }

    // Default daily schedule: 24 hours from now
    return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }

  /**
   * Synthesizes trending content from specified niche and source strategy.
   */
  private async synthesizeTrendingContent(
    niche: string,
    sourceStrategy: string
  ): Promise<{ topic: string; script: string; hook: string }> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        const liveResult = await this.synthesizeWithOpenAI(niche, sourceStrategy, apiKey);
        if (liveResult) return liveResult;
      } catch (err: any) {
        console.warn(`[AutoPilot] Live OpenAI synthesis failed (${err?.message || err}). Falling back to deterministic synthesis.`);
      }
    }

    // Deterministic algorithmic fallback synthesis
    return this.synthesizeAlgorithmicContent(niche, sourceStrategy);
  }

  /**
   * Live OpenAI content synthesis for trending topics.
   */
  private async synthesizeWithOpenAI(
    niche: string,
    sourceStrategy: string,
    apiKey: string
  ): Promise<{ topic: string; script: string; hook: string } | null> {
    const prompt = `Synthesize a viral, timely short video script for niche: "${niche}" using source strategy: "${sourceStrategy}".
Requirements:
1. topic: A high-curiosity trending headline (under 60 chars).
2. hook: A 3-second opening hook line that creates curiosity.
3. script: A 45-second high-value spoken narration script (60-90 words).

Return valid JSON:
{
  "topic": "...",
  "hook": "...",
  "script": "..."
}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.AUTOPILOT_SYNTHESIS },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      topic: parsed.topic || `Latest Breakthroughs in ${niche}`,
      hook: parsed.hook || `Did you hear about the massive shift happening in ${niche}?`,
      script: parsed.script || `Here is everything you need to know about today's biggest development in ${niche}. Stay tuned for daily updates.`,
    };
  }

  /**
   * Algorithmic deterministic content synthesis.
   */
  private synthesizeAlgorithmicContent(
    niche: string,
    sourceStrategy: string
  ): { topic: string; script: string; hook: string } {
    const strategyThemes: Record<string, { hookPrefix: string; topicPrefix: string; focus: string }> = {
      'trending-rss': {
        hookPrefix: 'Breaking news just hit the wire for',
        topicPrefix: 'Trending Update:',
        focus: 'analyzing the newest industry bulletin',
      },
      'news-aggregator': {
        hookPrefix: 'Here is what every top analyst is tracking today in',
        topicPrefix: 'Daily Digest:',
        focus: 'synthesizing the latest market insights',
      },
      'market-quotes': {
        hookPrefix: 'Unprecedented market movement detected right now in',
        topicPrefix: 'Market Alert:',
        focus: 'breaking down volatility and volume shifts',
      },
      'wikipedia-featured': {
        hookPrefix: 'Almost nobody knows this mind-blowing historical fact about',
        topicPrefix: 'Deep Dive:',
        focus: 'uncovering hidden archival knowledge',
      },
      'arxiv-preprints': {
        hookPrefix: 'A groundbreaking new scientific paper just changed everything in',
        topicPrefix: 'Research Breakthrough:',
        focus: 'reviewing peer-reviewed experimental proofs',
      },
      'social-scraper': {
        hookPrefix: 'This viral debate is taking over the community for',
        topicPrefix: 'Viral Trend:',
        focus: 'highlighting the most shared perspective',
      },
    };

    const theme = strategyThemes[sourceStrategy] || {
      hookPrefix: 'Stop scrolling if you care about',
      topicPrefix: 'Automated Insight:',
      focus: 'delivering the latest high-leverage developments',
    };

    const topic = `${theme.topicPrefix} Key Innovations in ${niche}`;
    const hook = `${theme.hookPrefix} ${niche}! Here is what you need to know right now.`;
    const script = `In today's automated briefing on ${niche}, we are ${theme.focus}. Experts have observed rapid acceleration in modern adoption, signaling a major transition ahead. Make sure to subscribe and follow our automated feed for daily intelligence.`;

    return { topic, hook, script };
  }
}

export const autoPilot = new AutoPilot();
