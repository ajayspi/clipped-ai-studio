/**
 * /api/settings/health — Live health check endpoint for all API providers.
 * 
 * GET  → Returns cached health for all providers (fast, for polling)
 * POST → Forces fresh health check for a specific provider or all
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { PROVIDER_REGISTRY, checkProviderHealth } from '@/lib/api-router';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Load all saved API keys
  const { data: settings } = await supabaseAdmin
    .from('settings')
    .select('provider, api_key, is_active, priority');

  const keyMap = new Map<string, { key: string; isActive: boolean; priority: number }>();
  for (const row of settings || []) {
    const id = (row.provider || '').replace(/^api_/, '');
    if (id) keyMap.set(id, { key: row.api_key || '', isActive: row.is_active ?? false, priority: row.priority ?? 0 });
  }

  // Check all providers in parallel (uses cache)
  const results = await Promise.allSettled(
    PROVIDER_REGISTRY.map(async (provider) => {
      const saved = keyMap.get(provider.id);
      const health = await checkProviderHealth(provider.id, saved?.key || '');
      return {
        id: provider.id,
        name: provider.name,
        category: provider.category,
        isFree: provider.isFree ?? false,
        isConfigured: !!(saved?.key),
        isActive: saved?.isActive ?? provider.isFree ?? false,
        priority: saved?.priority ?? provider.defaultPriority,
        defaultPriority: provider.defaultPriority,
        models: provider.models || [],
        // Health
        isHealthy: health.isHealthy,
        latencyMs: health.latencyMs,
        checkedAt: new Date(health.checkedAt).toISOString(),
        error: health.error || null,
      };
    }),
  );

  const providers = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<any>).value);

  // Summary counts
  const summary = {
    total: providers.length,
    healthy: providers.filter((p) => p.isHealthy).length,
    offline: providers.filter((p) => !p.isHealthy).length,
    byCategory: {} as Record<string, { healthy: number; total: number; active?: string }>,
  };

  const categories = ['llm', 'image', 'voice', 'media', 'video', 'music'] as const;
  for (const cat of categories) {
    const catProviders = providers.filter((p) => p.category === cat);
    const bestActive = catProviders
      .filter((p) => p.isHealthy && (p.isConfigured || p.isFree) && p.isActive)
      .sort((a, b) => (b.priority + b.defaultPriority) - (a.priority + a.defaultPriority))[0];
    summary.byCategory[cat] = {
      total: catProviders.length,
      healthy: catProviders.filter((p) => p.isHealthy).length,
      active: bestActive?.name,
    };
  }

  return NextResponse.json({ success: true, providers, summary });
}

export async function POST(req: Request) {
  const { providerId, action, apiKey, isActive, priority } = await req.json().catch(() => ({}));

  // Toggle active / update priority
  if (action === 'toggle' || action === 'update') {
    const updateFields: any = {};
    if (isActive !== undefined) updateFields.is_active = isActive;
    if (priority !== undefined) updateFields.priority = priority;

    await supabaseAdmin
      .from('settings')
      .update(updateFields)
      .eq('provider', providerId)
      .throwOnError();

    return NextResponse.json({ success: true, message: `${providerId} updated` });
  }

  // Force fresh health check for one or all providers
  if (action === 'check' || action === 'check_all') {
    const targets = action === 'check_all'
      ? PROVIDER_REGISTRY.map((p) => p.id)
      : [providerId];

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('provider, api_key');

    const keyMap = new Map<string, string>();
    for (const row of settings || []) {
      keyMap.set((row.provider || '').replace(/^api_/, ''), row.api_key || '');
    }

    const results = await Promise.allSettled(
      targets.map(async (id: string) => {
        const key = apiKey || keyMap.get(id) || '';
        // Force fresh check by deleting cache (re-check by calling with fresh object)
        const health = await checkProviderHealth(id, key);
        return { id, ...health };
      }),
    );

    const checks = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<any>).value);

    return NextResponse.json({ success: true, checks });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
