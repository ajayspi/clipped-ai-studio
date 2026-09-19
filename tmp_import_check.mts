// Temporary: verify `@/` path alias resolves under the worker runtime (tsx).
// Mirrors the render-worker's dynamic import of mission-orchestrator.
import('./lib/engine/mission-orchestrator.ts')
  .then((m) => {
    console.log('IMPORT OK:', typeof m.missionOrchestrator, typeof m.MissionOrchestrator)
    process.exit(0)
  })
  .catch((e) => {
    console.error('IMPORT FAIL:', e && e.message ? e.message : String(e))
    process.exit(1)
  })