export {}

const BASE_URL = 'http://localhost:3000/api/workflows';

const workflows = [
  { name: 'ai-videos', payload: { script: "The vast ocean", prompt: "A cinematic shot of a turtle", aspectRatio: "9:16", style: "cinematic", mock: true } },
  { name: 'auto', payload: { pipelineName: "Autopilot", niche: "technology", aspectRatio: "9:16", mock: true } },
  { name: 'avatar', payload: { script: "Hello world!", avatarType: "realistic", layout: "full", aspectRatio: "9:16", mock: true } },
  { name: 'bulk-plan', payload: { niche: "fitness", contentCount: 1, cadence: "daily", aspectRatio: "9:16", mock: true } },
  { name: 'extract-shorts', payload: { sourceType: "transcript", videoUrl: "https://youtube.com/watch?v=123456", transcript: "Hello this is a test clip to extract", clipCount: 1, mock: true } },
  { name: 'images', payload: { script: "A beautiful mountain", style: "photo", aspectRatio: "9:16", mock: true } },
  { name: 'micro-drama', payload: { script: "A dramatic moment.", genre: "noir", characters: ["Detective"], episodesCount: 1, aspectRatio: "9:16", mock: true } },
  { name: 'mission', payload: { prompt: "Explain quantum mechanics in 10 seconds", aspectRatio: "9:16", mock: true } },
  { name: 'podcast', payload: { videoUrl: "https://www.youtube.com/watch?v=123456", mock: true } },
  { name: 'reddit', payload: { threadUrl: "https://www.reddit.com/r/AskReddit/comments/123/what", mock: true } },
  { name: 'stickman', payload: { topic: "Funny cat", aspectRatio: "9:16", beatCount: 3, mock: true } },
  { name: 'stories', payload: { topic: "The lost city", storyType: "mystery", partsCount: 1, aspectRatio: "9:16", mock: true } },
  { name: 'trivia', payload: { topic: "Geography", questionsCount: 1, mock: true } },
  { name: 'whiteboard', payload: { prompt: "Draw a funny scene", script: "A cat draws on a whiteboard", aspectRatio: "9:16", mock: true } }
];

async function run() {
  console.log('Spawning all workflows...');
  for (const wf of workflows) {
    try {
      console.log(`Sending to /${wf.name}...`);
      const res = await fetch(`${BASE_URL}/${wf.name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wf.payload)
      });
      if (!res.ok) {
        console.error(`Error on ${wf.name}: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.error(text);
      } else {
        const data = await res.json();
        console.log(`Success on ${wf.name}: Job ID ${data.jobId || data.id}`);
      }
    } catch (e: any) {
      console.error(`Failed to reach ${wf.name}:`, e.message);
    }
  }
}

run();
