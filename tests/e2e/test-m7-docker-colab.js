/**
 * Milestone 7 Empirical Verification & Stress Test Suite
 * Tests Dockerfile, docker-compose.yml, and Colab Notebook (deployment/colab/clipped-studio.ipynb)
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const errors = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${message}`);
    errors.push(message);
  }
}

console.log('======================================================================');
console.log('🧪 MILESTONE 7 EMPIRICAL TEST SUITE: DOCKER & COLAB VALIDATION');
console.log('======================================================================\n');

// ----------------------------------------------------------------------------
// Suite 1: Dockerfile Multi-Stage Structure & Production Security
// ----------------------------------------------------------------------------
console.log('📦 Suite 1: Dockerfile Multi-Stage Structure & Security Validation');
const dockerfilePath = path.join(ROOT_DIR, 'Dockerfile');
assert(fs.existsSync(dockerfilePath), 'Dockerfile exists at repository root');

if (fs.existsSync(dockerfilePath)) {
  const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
  const lines = dockerfileContent.split('\n').map(l => l.trim());

  // 1. Multi-stage declaration check
  const stages = lines.filter(l => /^FROM\s+/i.test(l));
  assert(stages.length === 4, `Dockerfile defines exactly 4 stages (found ${stages.length})`);
  assert(stages[0]?.includes('node:20-alpine AS base'), 'Stage 1: Base stage is node:20-alpine AS base');
  assert(stages[1]?.includes('base AS deps'), 'Stage 2: Deps stage extends base (base AS deps)');
  assert(stages[2]?.includes('base AS builder'), 'Stage 3: Builder stage extends base (base AS builder)');
  assert(stages[3]?.includes('base AS runner'), 'Stage 4: Runner stage extends base (base AS runner)');

  // 2. Base stage dependencies check
  assert(dockerfileContent.includes('apk add --no-cache'), 'Base stage installs system dependencies with --no-cache');
  assert(dockerfileContent.includes('libc6-compat'), 'Base stage includes libc6-compat for SWC/Turbopack native compatibility');
  assert(dockerfileContent.includes('ffmpeg'), 'Base stage includes ffmpeg for video/audio pipeline rendering');
  assert(dockerfileContent.includes('procps'), 'Base stage includes procps for process monitoring');
  assert(dockerfileContent.includes('tzdata'), 'Base stage includes tzdata for timezone management');

  // 3. Corepack and pnpm configuration
  assert(dockerfileContent.includes('corepack enable') && dockerfileContent.includes('pnpm@11.24.0'), 'Corepack enables and prepares exact pnpm version (pnpm@11.24.0)');
  assert(dockerfileContent.includes('ENV PNPM_HOME="/pnpm"'), 'PNPM_HOME environment variable configured');

  // 4. Deps stage frozen lockfile
  assert(dockerfileContent.includes('COPY package.json pnpm-lock.yaml ./'), 'Deps stage copies package.json and pnpm-lock.yaml');
  assert(dockerfileContent.includes('pnpm install --frozen-lockfile'), 'Deps stage uses pnpm install --frozen-lockfile for deterministic builds');

  // 5. Builder stage standalone compilation
  assert(dockerfileContent.includes('COPY --from=deps /app/node_modules ./node_modules'), 'Builder stage copies node_modules from deps stage');
  assert(dockerfileContent.includes('ENV NEXT_TELEMETRY_DISABLED=1'), 'Next.js telemetry disabled during build');
  assert(dockerfileContent.includes('pnpm run build'), 'Builder executes pnpm run build');

  // 6. Runner stage non-root security & standalone assets
  assert(dockerfileContent.includes('addgroup --system --gid 1001 nodejs'), 'Runner creates system group nodejs (GID 1001)');
  assert(dockerfileContent.includes('adduser --system --uid 1001 nextjs'), 'Runner creates system user nextjs (UID 1001)');
  assert(dockerfileContent.includes('COPY --from=builder /app/public ./public'), 'Runner copies public directory');
  assert(dockerfileContent.includes('COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./'), 'Runner copies standalone build output with nextjs:nodejs ownership');
  assert(dockerfileContent.includes('COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static'), 'Runner copies static assets with nextjs:nodejs ownership');
  assert(dockerfileContent.includes('USER nextjs'), 'Runner enforces non-root USER nextjs execution');
  assert(dockerfileContent.includes('EXPOSE 3000'), 'Runner exposes application port 3000');
  assert(dockerfileContent.includes('CMD ["node", "server.js"]'), 'Runner starts Next.js standalone entrypoint ["node", "server.js"]');
  assert(dockerfileContent.includes('HEALTHCHECK'), 'Dockerfile includes container HEALTHCHECK directive');
  assert(dockerfileContent.includes('http://localhost:3000/'), 'Container healthcheck probes port 3000');
}

// Check next.config.ts for standalone output mode
const nextConfigPath = path.join(ROOT_DIR, 'next.config.ts');
assert(fs.existsSync(nextConfigPath), 'next.config.ts exists');
if (fs.existsSync(nextConfigPath)) {
  const nextConfig = fs.readFileSync(nextConfigPath, 'utf-8');
  assert(nextConfig.includes('output: "standalone"') || nextConfig.includes("output: 'standalone'"), 'next.config.ts has output: "standalone" configured');
}

// Check .dockerignore
const dockerignorePath = path.join(ROOT_DIR, '.dockerignore');
assert(fs.existsSync(dockerignorePath), '.dockerignore exists');
if (fs.existsSync(dockerignorePath)) {
  const dockerignore = fs.readFileSync(dockerignorePath, 'utf-8');
  assert(dockerignore.includes('node_modules'), '.dockerignore excludes node_modules');
  assert(dockerignore.includes('.next'), '.dockerignore excludes .next');
  assert(dockerignore.includes('.env*.local') || dockerignore.includes('.env.local'), '.dockerignore excludes local environment secrets');
  assert(dockerignore.includes('.git'), '.dockerignore excludes .git');
  assert(dockerignore.includes('.agents'), '.dockerignore excludes .agents');
}

// ----------------------------------------------------------------------------
// Suite 2: docker-compose.yml Services, Volumes, Networks, and Healthchecks
// ----------------------------------------------------------------------------
console.log('\n🐳 Suite 2: docker-compose.yml Orchestration Validation');
const composePath = path.join(ROOT_DIR, 'docker-compose.yml');
assert(fs.existsSync(composePath), 'docker-compose.yml exists at repository root');

if (fs.existsSync(composePath)) {
  const composeContent = fs.readFileSync(composePath, 'utf-8');

  // Simple YAML structural validator
  assert(composeContent.includes("version: '3.8'") || composeContent.includes('version: "3.8"'), 'docker-compose specifies version 3.8');
  assert(composeContent.includes('services:'), 'docker-compose declares services block');
  assert(composeContent.includes('postgres:'), 'docker-compose declares postgres service');
  assert(composeContent.includes('web:'), 'docker-compose declares web service');
  assert(composeContent.includes('volumes:'), 'docker-compose declares top-level volumes block');
  assert(composeContent.includes('postgres_data:'), 'docker-compose declares postgres_data named volume');
  assert(composeContent.includes('networks:'), 'docker-compose declares top-level networks block');
  assert(composeContent.includes('clipped-network:'), 'docker-compose declares clipped-network bridge network');

  // Postgres service assertions
  assert(composeContent.includes('image: postgres:16-alpine'), 'Postgres service uses postgres:16-alpine');
  assert(composeContent.includes('container_name: clipped-postgres'), 'Postgres container name is clipped-postgres');
  assert(composeContent.includes('"5432:5432"'), 'Postgres service exposes port 5432');
  assert(composeContent.includes('POSTGRES_USER: postgres'), 'Postgres environment specifies user');
  assert(composeContent.includes('POSTGRES_DB: clipped'), 'Postgres environment specifies db name clipped');
  assert(composeContent.includes('postgres_data:/var/lib/postgresql/data'), 'Postgres mounts persistent data volume');
  assert(composeContent.includes('./schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro'), 'Postgres mounts schema.sql for automatic database bootstrapping (read-only)');
  assert(composeContent.includes('pg_isready -U postgres -d clipped'), 'Postgres healthcheck runs pg_isready');

  // Web service assertions
  assert(composeContent.includes('container_name: clipped-web'), 'Web container name is clipped-web');
  assert(composeContent.includes('"3000:3000"'), 'Web service exposes port 3000');
  assert(composeContent.includes('context: .'), 'Web build context is current directory');
  assert(composeContent.includes('target: runner'), 'Web build target is multi-stage runner');
  assert(composeContent.includes('DATABASE_URL=postgresql://postgres:postgrespassword@postgres:5432/clipped'), 'Web service configures DATABASE_URL pointing to postgres service');
  assert(composeContent.includes('NEXTAUTH_SECRET='), 'Web service configures NEXTAUTH_SECRET');
  assert(composeContent.includes('depends_on:'), 'Web service defines depends_on block');
  assert(composeContent.includes('condition: service_healthy'), 'Web service waits for postgres condition: service_healthy');

  // Schema file verification
  const schemaPath = path.join(ROOT_DIR, 'schema.sql');
  assert(fs.existsSync(schemaPath), 'schema.sql exists for postgres initialization');
  if (fs.existsSync(schemaPath)) {
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    assert(schemaContent.includes('CREATE TABLE users'), 'schema.sql defines users table');
    assert(schemaContent.includes('CREATE TABLE videos'), 'schema.sql defines videos table');
    assert(schemaContent.includes('CREATE TABLE render_jobs'), 'schema.sql defines render_jobs table');
    assert(schemaContent.includes('CREATE TABLE api_credits'), 'schema.sql defines api_credits table');
    assert(schemaContent.includes('CREATE TABLE published_videos'), 'schema.sql defines published_videos table');
    assert(schemaContent.includes('CREATE TABLE settings'), 'schema.sql defines settings table');
  }
}

// ----------------------------------------------------------------------------
// Suite 3: Google Colab Notebook Schema, Cells, and Execution Logic
// ----------------------------------------------------------------------------
console.log('\n📓 Suite 3: Google Colab Notebook Schema & Logic Validation');
const colabPath = path.join(ROOT_DIR, 'deployment', 'colab', 'clipped-studio.ipynb');
assert(fs.existsSync(colabPath), 'Colab notebook exists at deployment/colab/clipped-studio.ipynb');

if (fs.existsSync(colabPath)) {
  let notebookJson = null;
  try {
    const rawContent = fs.readFileSync(colabPath, 'utf-8');
    notebookJson = JSON.parse(rawContent);
    assert(true, 'Colab notebook is valid parseable JSON');
  } catch (err) {
    assert(false, `Colab notebook JSON parse error: ${err.message}`);
  }

  if (notebookJson) {
    // 1. JSON Schema v4 validation
    assert(notebookJson.nbformat === 4, `nbformat version is 4 (actual: ${notebookJson.nbformat})`);
    assert(notebookJson.nbformat_minor === 4, `nbformat_minor version is 4 (actual: ${notebookJson.nbformat_minor})`);
    assert(notebookJson.metadata !== undefined, 'Notebook root metadata object exists');
    assert(notebookJson.metadata.accelerator === 'GPU', 'Notebook metadata configures accelerator: GPU');
    assert(notebookJson.metadata.colab?.gpuType === 'T4', 'Notebook metadata specifies gpuType: T4');
    assert(notebookJson.metadata.kernelspec?.name === 'python3', 'Notebook metadata specifies python3 kernelspec');
    assert(Array.isArray(notebookJson.cells), 'Notebook contains cells array');
    assert(notebookJson.cells.length === 8, `Notebook contains exactly 8 cells (actual: ${notebookJson.cells.length})`);

    const cells = notebookJson.cells;

    // Helper to get cell source as single string
    const getSource = (c) => Array.isArray(c.source) ? c.source.join('') : (c.source || '');

    // Cell 0: Intro Markdown
    assert(cells[0]?.cell_type === 'markdown', 'Cell 0 type is markdown');
    const c0Source = getSource(cells[0]);
    assert(c0Source.includes('Clipped AI Studio'), 'Cell 0 contains Clipped AI Studio header');
    assert(c0Source.includes('Multi-Provider TTS Engine'), 'Cell 0 lists TTS Engine capabilities');
    assert(c0Source.includes('AI Video Generation'), 'Cell 0 lists Video Generation capabilities');
    assert(c0Source.includes('FFmpeg Audio Mixing'), 'Cell 0 lists FFmpeg capabilities');
    assert(c0Source.includes('Multi-Platform Publishing'), 'Cell 0 lists Multi-Platform Publishing capabilities');
    assert(c0Source.includes('Zero-Cost Dry-Run Mode'), 'Cell 0 explains Zero-Cost Dry-Run Mode');

    // Cell 1: Hardware Diagnostics (Python)
    assert(cells[1]?.cell_type === 'code', 'Cell 1 type is code');
    const c1Source = getSource(cells[1]);
    assert(c1Source.includes('platform.system()'), 'Cell 1 inspects OS & platform');
    assert(c1Source.includes('psutil.virtual_memory()') || c1Source.includes('import psutil'), 'Cell 1 inspects system RAM');
    assert(c1Source.includes('torch.cuda.is_available()'), 'Cell 1 inspects CUDA GPU availability');
    assert(c1Source.includes('nvidia-smi'), 'Cell 1 provides nvidia-smi fallback for non-PyTorch runtimes');

    // Cell 2: System Dependencies (Bash)
    assert(cells[2]?.cell_type === 'code', 'Cell 2 type is code');
    const c2Source = getSource(cells[2]);
    assert(c2Source.startsWith('%%bash'), 'Cell 2 uses %%bash magic command');
    assert(c2Source.includes('set -e'), 'Cell 2 enables set -e for strict error halting');
    assert(c2Source.includes('apt-get install -y -qq ffmpeg curl git lsof'), 'Cell 2 installs FFmpeg, Curl, Git, and Lsof');
    assert(c2Source.includes('deb.nodesource.com/setup_20.x'), 'Cell 2 installs Node.js 20.x LTS');
    assert(c2Source.includes('npm install -g pnpm@11.24.0 localtunnel'), 'Cell 2 installs pnpm@11.24.0 and localtunnel globally');

    // Cell 3: Workspace & Project Directory (Python)
    assert(cells[3]?.cell_type === 'code', 'Cell 3 type is code');
    const c3Source = getSource(cells[3]);
    assert(c3Source.includes('PROJECT_DIR = "/content/clipped"'), 'Cell 3 defines PROJECT_DIR at /content/clipped');
    assert(c3Source.includes('os.chdir(PROJECT_DIR)'), 'Cell 3 switches working directory to PROJECT_DIR');
    assert(c3Source.includes('package.json'), 'Cell 3 validates package.json presence');

    // Cell 4: Environment Settings Form (Python + Colab Form)
    assert(cells[4]?.cell_type === 'code', 'Cell 4 type is code');
    assert(cells[4]?.metadata?.cellView === 'form', 'Cell 4 has cellView: form metadata for interactive Colab UI');
    const c4Source = getSource(cells[4]);
    assert(c4Source.includes('ENABLE_DRY_RUN_MODE = True  # @param {type:"boolean"}'), 'Cell 4 defines ENABLE_DRY_RUN_MODE boolean parameter');
    assert(c4Source.includes('ELEVENLABS_API_KEY'), 'Cell 4 defines ELEVENLABS_API_KEY parameter');
    assert(c4Source.includes('GOOGLE_TTS_API_KEY'), 'Cell 4 defines GOOGLE_TTS_API_KEY parameter');
    assert(c4Source.includes('KLING_API_KEY'), 'Cell 4 defines KLING_API_KEY parameter');
    assert(c4Source.includes('LUMA_API_KEY'), 'Cell 4 defines LUMA_API_KEY parameter');
    assert(c4Source.includes('FAL_API_KEY'), 'Cell 4 defines FAL_API_KEY parameter');
    assert(c4Source.includes('NEXT_PUBLIC_SUPABASE_URL'), 'Cell 4 defines NEXT_PUBLIC_SUPABASE_URL parameter');
    assert(c4Source.includes('secrets.token_hex(32)'), 'Cell 4 generates 32-byte cryptographic NEXTAUTH_SECRET');
    assert(c4Source.includes('with open(".env.local", "w")'), 'Cell 4 writes .env.local configuration');

    // Cell 5: Project Dependencies (Bash)
    assert(cells[5]?.cell_type === 'code', 'Cell 5 type is code');
    const c5Source = getSource(cells[5]);
    assert(c5Source.startsWith('%%bash'), 'Cell 5 uses %%bash magic command');
    assert(c5Source.includes('pnpm install --prefer-offline'), 'Cell 5 runs pnpm install with --prefer-offline');

    // Cell 6: Background Server & Public Tunnel (Python)
    assert(cells[6]?.cell_type === 'code', 'Cell 6 type is code');
    const c6Source = getSource(cells[6]);
    assert(c6Source.includes('fuser -k 3000/tcp'), 'Cell 6 cleans up stale processes on port 3000');
    assert(c6Source.includes('subprocess.Popen'), 'Cell 6 launches Next.js server in background via subprocess.Popen');
    assert(c6Source.includes('["pnpm", "run", "dev"]'), 'Cell 6 starts pnpm run dev');
    assert(c6Source.includes('http://localhost:3000/api/health'), 'Cell 6 polls http://localhost:3000/api/health for readiness');
    assert(c6Source.includes('https://loca.lt/mytunnelpassword') && c6Source.includes('https://ipv4.icanhazip.com'), 'Cell 6 fetches tunnel password with fallback endpoints');
    assert(c6Source.includes('!npx localtunnel --port 3000'), 'Cell 6 launches interactive localtunnel on port 3000');

    // Cell 7: Usage Guide & FAQ (Markdown)
    assert(cells[7]?.cell_type === 'markdown', 'Cell 7 type is markdown');
    const c7Source = getSource(cells[7]);
    assert(c7Source.includes('📖 Clipped Studio Usage Guide & Authentication'), 'Cell 7 contains usage guide header');
    assert(c7Source.includes('admin@clipped.ai') && c7Source.includes('admin'), 'Cell 7 documents default login credentials');
    assert(c7Source.includes('/create/ai-videos'), 'Cell 7 documents AI Video Generator route');
    assert(c7Source.includes('/create/stories'), 'Cell 7 documents Story Series Creator route');
    assert(c7Source.includes('/create/drama'), 'Cell 7 documents Micro-Drama Studio route');
    assert(c7Source.includes('/create/shorts'), 'Cell 7 documents Shorts Extractor route');
    assert(c7Source.includes('/create/bulk'), 'Cell 7 documents Bulk Content Planner route');
    assert(c7Source.includes('/create/auto'), 'Cell 7 documents Auto-Pilot Pipeline route');
    assert(c7Source.includes('Troubleshooting & FAQ'), 'Cell 7 documents Troubleshooting & FAQ');
  }
}

console.log('\n======================================================================');
console.log(`📊 TEST RESULTS SUMMARY: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('======================================================================');

if (failedTests > 0) {
  console.error('\n❌ FAILED ASSERTIONS:');
  errors.forEach((err, idx) => console.error(`  ${idx + 1}. ${err}`));
  process.exit(1);
} else {
  console.log('\n🎉 ALL EMPIRICAL VALIDATION CHECKS PASSED PERFECTLY!');
  process.exit(0);
}
