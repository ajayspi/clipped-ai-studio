const https = require('https');
const fs = require('fs');

const repos = [
  "jamesltr0701-cell/Framewright",
  "wonderunit/storyboarder",
  "taruma/SceneFlow",
  "tt-a1i/archify",
  "mainza-ai/milimovideo",
  "HBAI-Ltd/Toonflow-app",
  "HITsz-TMG/VideoClaw",
  "SimileSystems/awesome-volumetric-filmmaking",
  "oli-z/awesome-filmmaking",
  "kangarooking/director-skills",
  "wassermanproductions/wassermans-filmmaker-suite",
  "wassermanproductions/master-canvas",
  "wassermanproductions/blockout",
  "wassermanproductions/motion-previs-studio",
  "wassermanproductions/slate",
  "JohnTheTripper/moviegoer-prototype",
  "bkingfilm/lapian-notes",
  "lemomo-ai/lemo-opuscar",
  "c47-inc/mcp-film",
  "heygen-com/hyperframes"
];

async function fetchRepoInfo(repo) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}`,
      method: 'GET',
      headers: { 'User-Agent': 'Node.js' }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ repo, description: json.description, topics: json.topics });
        } catch(e) {
          resolve({ repo, error: 'parse error' });
        }
      });
    });
    req.on('error', () => resolve({ repo, error: 'request error' }));
    req.end();
  });
}

async function main() {
  const results = await Promise.all(repos.map(fetchRepoInfo));
  const text = results.map(r => `${r.repo}:\n- Description: ${r.description || r.error}\n- Topics: ${r.topics?.join(', ') || 'none'}`).join('\n\n');
  fs.writeFileSync('repo_analysis.txt', text);
  console.log('Done writing repo_analysis.txt');
}

main();
