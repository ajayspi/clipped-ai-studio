import { supabaseAdmin as db } from '@/lib/db'

export type HealthDomain = 'llm' | 'tts'

export interface ProviderHealth {
  id: string
  consecutive_failures: number
  cooldown_until: string | null
  last_error: string | null
}

let healthCache: Map<string, ProviderHealth> | null = null
let lastLoadTime = 0

export function healthId(domain: HealthDomain, providerId: string): string {
  return `${domain}:${providerId}`
}

export function resetProviderHealthCache(): void {
  healthCache = null
  lastLoadTime = 0
}

export async function loadHealth(): Promise<Map<string, ProviderHealth>> {
  // To avoid N reads, we can cache for a short duration or just rely on complete() calling it once
  // The spec says: complete() takes one snapshot via loadHealth() before entering Tier 2.
  // We'll update the global cache from DB.
  try {
    const { data, error } = await db.rpc('get_provider_health')
    if (!error && data) {
      const map = new Map<string, ProviderHealth>()
      for (const row of data) {
        map.set(row.id, {
          id: row.id,
          consecutive_failures: row.consecutive_failures,
          cooldown_until: row.cooldown_until,
          last_error: row.last_error
        })
      }
      healthCache = map
    }
  } catch (e) {
    // Fail-open
  }
  
  if (!healthCache) {
    healthCache = new Map<string, ProviderHealth>()
  }
  return healthCache
}

export async function isProviderAvailable(domain: HealthDomain, providerId: string): Promise<boolean> {
  const map = healthCache || await loadHealth()
  const id = healthId(domain, providerId)
  const health = map.get(id)
  
  if (!health) {
    return true
  }
  
  if (health.cooldown_until) {
    const now = new Date()
    const cooldown = new Date(health.cooldown_until)
    if (now < cooldown) {
      return false
    } else {
      health.consecutive_failures = 2
      health.cooldown_until = null
      return true
    }
  }
  
  return health.consecutive_failures < 3
}

export async function recordProviderFailure(domain: HealthDomain, providerId: string, reason: string): Promise<void> {
  const map = healthCache || await loadHealth()
  const id = healthId(domain, providerId)
  let health = map.get(id)
  
  if (!health) {
    health = { id, consecutive_failures: 0, cooldown_until: null, last_error: null }
    map.set(id, health)
  }
  
  if (health.cooldown_until && new Date() >= new Date(health.cooldown_until)) {
      health.consecutive_failures = 2
      health.cooldown_until = null
  }
  
  health.consecutive_failures += 1
  health.last_error = reason
  
  if (health.consecutive_failures >= 3) {
    const d = new Date()
    d.setSeconds(d.getSeconds() + 60)
    health.cooldown_until = d.toISOString()
  }
  
  db.rpc('record_provider_failure', { p_id: id, p_reason: reason }).then(() => {})
}

export async function recordProviderSuccess(domain: HealthDomain, providerId: string): Promise<void> {
  const map = healthCache || await loadHealth()
  const id = healthId(domain, providerId)
  let health = map.get(id)
  
  if (health) {
    health.consecutive_failures = 0
    health.cooldown_until = null
    health.last_error = null
  } else {
    health = { id, consecutive_failures: 0, cooldown_until: null, last_error: null }
    map.set(id, health)
  }
  
  db.rpc('record_provider_success', { p_id: id }).then(() => {})
}
