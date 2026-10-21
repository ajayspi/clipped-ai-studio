const fs = require('fs');
let c = fs.readFileSync('tests/e2e/standalone-runner.js', 'utf8');

const injection = `  tests.push({
    tier: 'Tier 24: Worker Media Sourcing',
    id: 'T24-SRC',
    title: 'Verify Source-level wiring guards for Tier 24',
    fn: async () => {
      const fs = require('fs');
      const path = require('path');
      const rw = fs.readFileSync(path.join(__dirname, '../../scripts/render-worker.ts'), 'utf8');
      if (rw.includes('v1/images/generations')) throw new Error('T24-SRC-01 failed: render-worker still has v1/images/generations');
      if (rw.includes('width=1024&height=1024')) throw new Error('T24-SRC-02 failed: render-worker has hardcoded square bug');
      if (!rw.includes('resolveBeatMedia(')) throw new Error('T24-SRC-03 failed: missing resolveBeatMedia call');
      if (!rw.includes("params.workflow === 'footage' ? 'video' : 'image'")) throw new Error('T24-SRC-04 failed: wrong intent mapping');
      
      const route = fs.readFileSync(path.join(__dirname, '../../app/api/workflows/generate/route.ts'), 'utf8');
      if (!route.includes('searchQuery') || !route.includes('keywords')) throw new Error('T24-SRC-05 failed: route missing searchQuery/keywords');
      
      const wizard = fs.readFileSync(path.join(__dirname, '../../components/wizard/CreationWizard.tsx'), 'utf8');
      if (!wizard.includes('searchQuery: beat.searchQuery') || !wizard.includes('keywords: beat.keywords')) throw new Error('T24-SRC-06 failed: wizard missing searchQuery/keywords in submit map');
      
      const sbTest = fs.readFileSync(path.join(__dirname, '../../test/shot-boundary.test.ts'), 'utf8');
      if (!sbTest.includes('beat-media-resolver')) throw new Error('T24-SRC-07 failed: shot-boundary test not repointed to resolver');
    },
  });

  tests.push({
    tier: 'Tier 24: Worker Media Sourcing',
    id: 'T24-VID-AR',
    title: 'Verify Aspect ratio and Video source mock tests',
    fn: async () => {
      const fs = require('fs');
      const path = require('path');
      const rw = fs.readFileSync(path.join(__dirname, '../../scripts/render-worker.ts'), 'utf8');
      if (!rw.includes("aspectRatio === '16:9' ? 1920 : aspectRatio === '1:1' ? 1080 : 1080")) throw new Error('T24-AR-01/02/03 failed: Pollinations width logic missing or incorrect');
    }
  });

  let passed = 0;
  let failed = 0;
  const start = Date.now();

  const tiers = [
    'Tier 1',
    'Tier 2',
    'Tier 3',
    'Tier 4',
    'Tier 5',
    'API Routes',
    'Tier 6',
    'Tier 7',
    'Tier 8: Background Workers & Pipeline',
    'Tier 9: Milestone 1 API Status & Workflows',
    'Tier 10: Supabase Custom Connection & Routing',
    'Tier 11: Milestone 3 Subtitles UI & Styling',
    'Tier 12: Milestone 4 Package Features',
    'Tier 13: DB & Voice Adversarial Hardening',
    'Tier 14: Media Pipeline Contracts',
    'Tier 15: fal.ai Queue Client',
    'Tier 16: Free Image Sources',
    'Tier 17: Scene Media Selector',
    'Tier 18: Images in Mission & Remotion',
    'Tier 19: Workflow Capabilities',
    'Tier 20: Render-Job Claim Safety',
    'Tier 21: Wizard Step-Flow Visibility',
    'Tier 22: Queue Boundary + Media-Type Contracts',
    'Tier 23: Documentation Diagram Parity',
    'Tier 25: Scrape & Mixkit',
    'Tier 26: Provider Health Circuit',
    'Tier 24: Workflow Route Contracts',
    'Tier 24: Worker Media Sourcing'
  ];`;

// Replace `let passed = 0; ... const tiers = [...];` with our injection
c = c.replace(/  let passed = 0;[\s\S]*?\];/, injection);

fs.writeFileSync('tests/e2e/standalone-runner.js', c);
console.log('patched');
