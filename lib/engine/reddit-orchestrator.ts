import { complete, parseJson } from '@/lib/engine/llm';

export interface RedditVideoRequest {
  threadUrl: string;
}

export const redditOrchestrator = {
  async generateVideo(req: RedditVideoRequest) {
    if (!req.threadUrl || typeof req.threadUrl !== 'string') throw new Error("Thread URL is required");

    const jsonUrl = req.threadUrl.replace(/\/$/, '') + '.json';
    let threadData = null;
    try {
      const res = await fetch(jsonUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (res.ok) {
        threadData = await res.json();
      }
    } catch (e) {
      console.warn("Failed to fetch reddit json", e);
    }

    const title = threadData?.[0]?.data?.children?.[0]?.data?.title || "Crazy Reddit Story";
    const body = threadData?.[0]?.data?.children?.[0]?.data?.selftext || "So this one time, something unbelievable happened. I can't even believe I'm writing this right now.";

    const prompt = `Format this Reddit thread into an engaging script for a short video. Cut it into 5-10 second beats. 
Return JSON with { "success": true, "beats": [ { "id": "beat-1", "text": "...", "duration": 5 } ] }.
Title: ${title}
Body: ${body}`;

    let beats: Record<string, unknown>[] = [];
    try {
      const content = await complete({ system: 'You are an expert video script writer.', user: prompt, json: true }, undefined, 'auto');
      if (content) {
        const parsed = parseJson<{ beats?: Array<Record<string, unknown>> }>(content);
        beats = parsed.beats || [];
      }
    } catch (e) {
      console.warn("LLM failed, falling back to mock beats", e);
    }

    if (!beats.length) {
      beats = [
        { id: 'beat-1', text: title, duration: 5 },
        { id: 'beat-2', text: body.substring(0, 100), duration: 6 },
        { id: 'beat-3', text: 'Follow for part 2!', duration: 3 }
      ];
    }

    const backgrounds = [
      'https://storage.clipped.ai/gaming/gta-parkour-1.mp4',
      'https://storage.clipped.ai/gaming/minecraft-parkour-1.mp4',
      'https://storage.clipped.ai/gaming/subway-surfers-1.mp4'
    ];

    const finalBeats = beats.map((b: Record<string, unknown>, idx: number) => ({
      ...b,
      id: b.id || `beat-${idx}`,
      clipUrl: backgrounds[idx % backgrounds.length]
    }));

    return {
      success: true,
      workflow: 'reddit',
      beats: finalBeats
    };
  }
};
