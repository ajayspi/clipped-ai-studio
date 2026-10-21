const fs = require('fs');
const path = require('path');

const routesToUpdate = [
  'ai-videos', 'auto', 'avatar', 'extract-shorts', 'micro-drama', 'stories', 'whiteboard', 'bulk-plan/push'
];

for (const r of routesToUpdate) {
  const filePath = path.join('app/api/workflows', r, 'route.ts');
  if (!fs.existsSync(filePath)) continue;
  let code = fs.readFileSync(filePath, 'utf8');

  // Add the import for enqueueRenderJob
  if (!code.includes('enqueueRenderJob')) {
    code = code.replace(/import \{ NextResponse \} from "next\/server"/, 
      `import { NextResponse } from "next/server"\nimport { enqueueRenderJob } from "@/lib/jobs/enqueue"`);
  }

  // Replace insert
  code = code.replace(/await supabase\.from\('render_jobs'\)\.insert\(\{\s*id: jobId,\s*status: 'generating_plan',\s*progress: 0,\s*orchestration_state: 'planning',\s*logs: JSON\.stringify\(([^)]+)\)\s*\}\)/g, 
    `await enqueueRenderJob({ id: jobId, intent: 'plan-only', status: 'generating_plan', progress: 0, logs: $1 })`);

  // Sometimes it's status: 'pending' and orchestration_state: 'queued'
  code = code.replace(/await supabase\.from\('render_jobs'\)\.insert\(\{\s*id: jobId,\s*status: 'pending',\s*progress: 10,\s*orchestration_state: 'queued',\s*logs: JSON\.stringify\(([^)]+)\)\s*\}\)/g, 
    `await enqueueRenderJob({ id: jobId, intent: 'render', status: 'pending', progress: 10, logs: $1 })`);

  // Replace update (success)
  code = code.replace(/await supabase\.from\('render_jobs'\)\.update\(\{\s*status: 'pending',\s*progress: 10,\s*orchestration_state: 'queued',\s*logs: JSON\.stringify\(([^)]+)\)\s*\}\)\.eq\('id', jobId\)/g, 
    `await enqueueRenderJob({ id: jobId, intent: 'render', status: 'pending', progress: 10, logs: $1 })`);

  // Replace update (failure)
  code = code.replace(/await supabase\s*\.from\('render_jobs'\)\s*\.update\(\{[\s\S]*?status: 'failed',[\s\S]*?orchestration_state: 'failed',[\s\S]*?error_message:([^,}]+)[\s\S]*?\}\)\s*\.eq\('id', jobId\)/g, 
    `await enqueueRenderJob({ id: jobId, intent: 'terminal', status: 'failed', progress: 0, logs: { error_message: $1 } })`);

  // Replace update (failure)
  code = code.replace(/await supabase\.from\('render_jobs'\)\.update\(\{\s*status: 'failed',\s*orchestration_state: 'failed',\s*error_message:\s*([^,]+)(?:,\s*logs: JSON\.stringify\([^)]+\))?\s*\}\)\.eq\('id', jobId\)/g, 
    `await enqueueRenderJob({ id: jobId, intent: 'terminal', status: 'failed', progress: 0, logs: { error_message: $1 } })`);

  fs.writeFileSync(filePath, code);
}
