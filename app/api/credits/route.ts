import { NextResponse } from 'next/server';
import { quotaManager } from '@/lib/quotas';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let userId = 'anonymous';
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        userId = user.id;
      }
    } catch {
      // Safe fallback if auth context is unavailable
    }

    const usage = await quotaManager.getUserUsage(userId);
    const videoQuota = usage?.providers?.['video_generation'] || {
      used: usage?.usedThisMonth ?? 0,
      quota: usage?.totalQuota ?? 3,
      remaining: usage?.remaining ?? 3,
    };

    return NextResponse.json({
      success: true,
      tier: usage?.tier || 'free',
      used: videoQuota.used ?? 0,
      total: videoQuota.quota ?? 3,
      remaining: videoQuota.remaining ?? 3,
      resetDate: usage?.resetDate || new Date().toISOString(),
      isUnlimited: videoQuota.quota === -1,
      engineReady: true,
    });
  } catch (err) {
    return NextResponse.json({
      success: true,
      tier: 'free',
      used: 0,
      total: 3,
      remaining: 3,
      resetDate: new Date().toISOString(),
      isUnlimited: false,
      engineReady: true,
      fallback: true,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
