import { complete } from '@/lib/ai/llm';

const SYSTEM_PROMPT = `You are an autonomous B-roll hunter (VideoClaw).
Given a search query for B-roll, generate a highly relevant stock video URL.
Since you don't have internet access, just construct a plausible mockup URL for a stock video site (like Pexels or Pixabay) that ends in .mp4.
For example, for query "ocean waves", you could return "https://www.pexels.com/video/ocean-waves-12345/download.mp4".
Return ONLY the URL, no other text.`;

export async function huntForMedia(query: string): Promise<string> {
  if (!query) {
    return "https://videos.pexels.com/video-files/856973/856973-hd_1920_1080_30fps.mp4";
  }
  const content = await complete({ system: SYSTEM_PROMPT, user: `Find media for query:\n${query}` }, undefined, 'auto');
  const url = content.trim();
  if (!url.startsWith('http')) {
      return "https://videos.pexels.com/video-files/856973/856973-hd_1920_1080_30fps.mp4";
  }
  return url;
}
