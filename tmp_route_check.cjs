const fs = require('fs');
const p = 'app/api/workflows/mission/route.ts';
const c = fs.readFileSync(p, 'utf8');
const checks = [
  ['status pending', c.includes("status: 'pending'")],
  ['workflow_type', c.includes("workflow_type: 'mission'")],
  ['type mission', c.includes("type: 'mission'")],
  ['progressUrl', c.includes('progressUrl')],
  ['no setTimeout', !c.includes('setTimeout')],
];
for (const [n, ok] of checks) console.log((ok ? 'OK  ' : 'FAIL') + ' ' + n);