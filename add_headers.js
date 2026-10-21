const fs = require('fs');
const path = require('path');

const routes = [
  {
    name: 'generate',
    kind: 'queue',
    uiCaller: 'components/wizard/CreationWizard.tsx',
    writesQueue: 'yes',
    claimable: 'yes',
    distinctFrom: 'images (images terminal-only, generate renders)'
  },
  {
    name: 'stories',
    kind: 'queue',
    uiCaller: 'NONE (API only)',
    writesQueue: 'yes',
    claimable: 'yes',
    distinctFrom: 'generate (stories uses explicit scenes vs generated script)'
  },
  {
    name: 'ai-videos',
    kind: 'queue',
    uiCaller: 'NONE (API only)',
    writesQueue: 'yes',
    claimable: 'yes',
    distinctFrom: 'generate (ai-videos is a simplified single-prompt wrapper)'
  },
  {
    name: 'auto',
    kind: 'queue',
    uiCaller: 'create/auto',
    writesQueue: 'yes',
    claimable: 'yes',
    distinctFrom: 'generate (auto picks all settings for you)'
  },
  {
    name: 'micro-drama',
    kind: 'queue',
    uiCaller: 'create/drama',
    writesQueue: 'yes',
    claimable: 'yes',
    distinctFrom: 'generate (drama focuses on dialogue and multiple characters)'
  },
  {
    name: 'extract-shorts',
    kind: 'queue',
    uiCaller: 'create/shorts',
    writesQueue: 'yes',
    claimable: 'yes',
    distinctFrom: 'generate (extract-shorts processes existing video vs creating from scratch)'
  },
  {
    name: 'avatar',
    kind: 'queue',
    uiCaller: 'create/avatar',
    writesQueue: 'yes',
    claimable: 'yes',
    distinctFrom: 'generate (avatar uses a specific character model vs generic b-roll)'
  },
  {
    name: 'whiteboard',
    kind: 'queue',
    uiCaller: 'create/whiteboard',
    writesQueue: 'yes',
    claimable: 'yes',
    distinctFrom: 'generate (whiteboard creates drawing animations vs stock footage)'
  },
  {
    name: 'bulk-plan/push',
    kind: 'queue',
    uiCaller: 'create/bulk',
    writesQueue: 'yes',
    claimable: 'yes',
    distinctFrom: 'bulk-plan (push queues actual jobs, bulk-plan only generates text)'
  },
  {
    name: 'bulk-plan',
    kind: 'utility',
    uiCaller: 'create/bulk',
    writesQueue: 'no',
    claimable: 'no',
    distinctFrom: 'bulk-plan/push (bulk-plan generates text, push queues videos)'
  },
  {
    name: 'scrape',
    kind: 'utility',
    uiCaller: 'create/url',
    writesQueue: 'no',
    claimable: 'no',
    distinctFrom: 'generate (scrape only extracts text from a URL, does not render)'
  },
  {
    name: 'mission',
    kind: 'plan-only',
    uiCaller: 'create/mission/[id]',
    writesQueue: 'yes (via orchestrator)',
    claimable: 'no',
    distinctFrom: 'generate (mission has a 5-step pipeline and does its own orchestration)'
  },
  {
    name: 'whiteboard/character-sheet',
    kind: 'plan-only',
    uiCaller: 'create/whiteboard',
    writesQueue: 'no (via orchestrator)',
    claimable: 'no',
    distinctFrom: 'whiteboard (character-sheet only generates images, whiteboard renders video)'
  }
];

const basePath = 'app/api/workflows';

for (const route of routes) {
  const filePath = path.join(basePath, route.name, 'route.ts');
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf-8');

  const header = `/**
 * WORKFLOW ROUTE — ${route.name}
 *   KIND:          ${route.kind}
 *   UI CALLER:     ${route.uiCaller}
 *   WRITES QUEUE:  ${route.writesQueue}
 *   CLAIMABLE:     ${route.claimable}
 *   DISTINCT FROM: ${route.distinctFrom}
 */
`;

  if (!content.includes('WORKFLOW ROUTE —')) {
    content = header + content;
    fs.writeFileSync(filePath, content);
  }
}
