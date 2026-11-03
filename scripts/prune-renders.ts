import * as fs from 'fs'
import * as path from 'path'
import { createLogger } from '../lib/logger'

const logger = createLogger('prune-renders')

// Protected showcase and demo assets that should never be pruned
const PROTECTED_FILES = new Set([
  'universe-inside-us-fast-paced.mp4',
  'awesome-recipes-showcase.mp4',
  'celestial-stickman.mp4',
  'studio-pipeline.html',
  '.gitkeep',
])

export interface PruneOptions {
  rendersDir?: string
  maxAgeHours?: number
  dryRun?: boolean
}

export interface PruneResult {
  scanned: number
  pruned: number
  bytesReclaimed: number
  errors: number
}

export function pruneRenders(options: PruneOptions = {}): PruneResult {
  const rendersDir = options.rendersDir || path.join(process.cwd(), 'public', 'renders')
  const maxAgeHours = options.maxAgeHours ?? Number(process.env.RENDER_PRUNE_MAX_AGE_HOURS || 24)
  const dryRun = options.dryRun ?? false

  const result: PruneResult = {
    scanned: 0,
    pruned: 0,
    bytesReclaimed: 0,
    errors: 0,
  }

  if (!fs.existsSync(rendersDir)) {
    logger.info(`Renders directory does not exist: ${rendersDir}`)
    return result
  }

  const now = Date.now()
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000

  const entries = fs.readdirSync(rendersDir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (PROTECTED_FILES.has(entry.name)) continue

    result.scanned++
    const filePath = path.join(rendersDir, entry.name)

    try {
      const stats = fs.statSync(filePath)
      const ageMs = now - stats.mtimeMs

      if (ageMs > maxAgeMs) {
        if (!dryRun) {
          fs.unlinkSync(filePath)
          logger.info(`Pruned render asset (${(stats.size / 1024 / 1024).toFixed(2)} MB): ${entry.name}`)
        } else {
          logger.info(`[Dry Run] Would prune render asset (${(stats.size / 1024 / 1024).toFixed(2)} MB): ${entry.name}`)
        }
        result.pruned++
        result.bytesReclaimed += stats.size
      }
    } catch (err) {
      result.errors++
      logger.error(`Failed to inspect or prune file: ${filePath}`, { error: String(err) })
    }
  }

  const mbReclaimed = (result.bytesReclaimed / 1024 / 1024).toFixed(2)
  logger.info(`Render pruning completed: scanned ${result.scanned}, pruned ${result.pruned} files (${mbReclaimed} MB reclaimed).`)
  return result
}

// Direct execution CLI entrypoint
if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run')
  const res = pruneRenders({ dryRun: isDryRun })
  console.log(`Pruning finished: ${res.pruned} files removed, ${(res.bytesReclaimed / 1024 / 1024).toFixed(2)} MB reclaimed.`)
}
