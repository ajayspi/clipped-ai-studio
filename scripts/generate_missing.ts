export {}
const BASE_URL = 'http://localhost:3000/api/workflows';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const workflows = [
  { name: 'generate', payload: { workflow: 'footage', script: "A beautiful day in the park", subject: "Nature", mock: true, beats: [{ text: "Hello", duration: 5, imageUrl: "test.jpg" }] } },
  { name: 'images', payload: { script: "A beautiful mountain", style: "photo", aspectRatio: "9:16", mock: true } },
  { name: 'extract-shorts', payload: { sourceType: "transcript", videoUrl: "https://youtube.com/watch?v=123456", transcript: "Hello this is a test clip to extract", clipCount: 1, mock: true } },
  { name: 'stories', payload: { topic: "The lost city", storyType: "mystery", partsCount: 1, aspectRatio: "9:16", mock: true } },
  { name: 'scrape', payload: { url: "https://en.wikipedia.org/wiki/OpenAI", mock: true } }, // for "url"
  { name: 'whiteboard', payload: { prompt: "Draw a funny scene", script: "A cat draws on a whiteboard", aspectRatio: "9:16", mock: true } },
  { name: 'mission', payload: { prompt: "Explain quantum mechanics in 10 seconds", aspectRatio: "9:16", mock: true } },
  { name: 'reddit', payload: { threadUrl: "https://www.reddit.com/r/AskReddit/comments/123/what", mock: true } },
  { name: 'trivia', payload: { topic: "Geography", questionsCount: 1, mock: true } },
  { name: 'podcast', payload: { videoUrl: "https://www.youtube.com/watch?v=123456", mock: true } },
  { name: 'micro-drama', payload: { script: "A dramatic moment.", genre: "noir", characters: ["Detective"], episodesCount: 1, aspectRatio: "9:16", mock: true } },
  { name: 'stickman', payload: { topic: "Funny cat", aspectRatio: "9:16", beatCount: 3, mock: true } }
];

async function run() {
  console.log('Spawning requested workflows sequentially with delay...');
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
    // Wait 5 seconds between requests to avoid rate limiting
    console.log('Waiting 10 seconds...');
    await delay(10000);
  }
}

run();
