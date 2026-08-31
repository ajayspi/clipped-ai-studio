/**
 * Quota and Usage Tracking Engine for Clipped
 * Enforces free tier limits (3 videos/month), handles monthly rollover,
 * atomic credit consumption, failed render refunds, and Supabase / in-memory sync.
 */

import { supabase } from './db';

export type UserTier = 'free' | 'pro' | 'enterprise';

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  totalQuota: number;
  used: number;
  resetDate: string;
  tier: UserTier | string;
  provider: string;
  quotaLimit?: number; // Alias for totalQuota
  usedThisMonth?: number; // Alias for used
  error?: string;
}

export type QuotaStatus = QuotaCheckResult;

export interface QuotaConsumptionResult {
  success: boolean;
  remaining: number;
  used: number;
  totalQuota: number;
  status: QuotaCheckResult;
}

export interface UserUsageRecord {
  userId: string;
  tier: UserTier | string;
  totalQuota: number;
  usedThisMonth: number;
  remaining: number;
  resetDate: string;
  providers: Record<
    string,
    {
      used: number;
      quota: number;
      remaining: number;
      updatedAt: string;
    }
  >;
  activeJobsCount: number;
  updatedAt: string;
}

export class QuotaExceededError extends Error {
  public code: string = 'QUOTA_EXCEEDED';
  public status: QuotaCheckResult;
  public userId?: string;

  constructor(message: string, status: QuotaCheckResult, userId?: string) {
    super(message);
    this.name = 'QuotaExceededError';
    this.status = status;
    this.userId = userId;
    Object.setPrototypeOf(this, QuotaExceededError.prototype);
  }
}

export const TIER_LIMITS: Record<UserTier, { videoQuota: number; ttsChars: number; maxDuration: number }> = {
  free: {
    videoQuota: 3,
    ttsChars: 10000,
    maxDuration: 60,
  },
  pro: {
    videoQuota: 50,
    ttsChars: 250000,
    maxDuration: 180,
  },
  enterprise: {
    videoQuota: -1, // Unlimited
    ttsChars: -1,
    maxDuration: 600,
  },
};

interface InMemoryUserRecord {
  tier: UserTier;
  credits: Map<string, { free_quota: number; used_this_month: number; updated_at: string }>;
  activeJobs: number;
  updatedAt: string;
}

export class QuotaManager {
  private inMemoryStore: Map<string, InMemoryUserRecord> = new Map();
  private mockTimeOffsetMs: number = 0;

  /**
   * Returns the current ISO timestamp, accounting for any test time offsets
   */
  private getCurrentDate(): Date {
    return new Date(Date.now() + this.mockTimeOffsetMs);
  }

  /**
   * Computes the ISO 8601 string for the 1st day of the next UTC calendar month at 00:00:00 UTC
   */
  public getNextMonthResetDate(fromDate?: Date): string {
    const now = fromDate || this.getCurrentDate();
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    return nextMonth.toISOString();
  }

  /**
   * Determines if a stored timestamp belongs to a previous UTC calendar month
   */
  public isMonthlyResetDue(lastDateStr: string, currentDate?: Date): boolean {
    if (!lastDateStr) return false;
    const last = new Date(lastDateStr);
    const now = currentDate || this.getCurrentDate();
    return (
      last.getUTCFullYear() < now.getUTCFullYear() ||
      (last.getUTCFullYear() === now.getUTCFullYear() && last.getUTCMonth() < now.getUTCMonth())
    );
  }

  /**
   * Resolves the default quota for a given tier and provider
   */
  private getDefaultQuota(tier: UserTier, provider: string): number {
    if (tier === 'enterprise') return -1;
    if (provider === 'video_generation') {
      return TIER_LIMITS[tier]?.videoQuota ?? 3;
    }
    if (provider.startsWith('tts')) {
      return TIER_LIMITS[tier]?.ttsChars ?? 10000;
    }
    return TIER_LIMITS[tier]?.videoQuota ?? 3;
  }

  /**
   * Checks if Supabase client is properly configured with valid credentials
   */
  private isSupabaseConfigured(): boolean {
    return Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );
  }

  /**
   * Retrieves or initializes the in-memory record for a user
   */
  private getOrCreateInMemoryRecord(userId: string, defaultTier: UserTier = 'free'): InMemoryUserRecord {
    let record = this.inMemoryStore.get(userId);
    if (!record) {
      record = {
        tier: defaultTier,
        credits: new Map(),
        activeJobs: 0,
        updatedAt: this.getCurrentDate().toISOString(),
      };
      this.inMemoryStore.set(userId, record);
    }
    return record;
  }

  /**
   * Fetches user tier from Supabase or in-memory store
   */
  public async getUserTier(userId: string): Promise<UserTier> {
    if (!userId) return 'free';

    const memoryRecord = this.inMemoryStore.get(userId);
    if (memoryRecord && memoryRecord.tier) {
      return memoryRecord.tier;
    }

    if (this.isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('tier')
          .eq('id', userId)
          .single();

        if (!error && data?.tier) {
          const tier = (data.tier.toLowerCase() as UserTier) || 'free';
          const rec = this.getOrCreateInMemoryRecord(userId, tier);
          rec.tier = tier;
          return tier;
        }
      } catch {
        // Fallback to in-memory store
      }
    }

    return memoryRecord?.tier || 'free';
  }

  /**
   * Checks whether a user is allowed to perform an operation based on quota limits
   */
  public async checkUserQuota(
    userId: string,
    provider: string = 'video_generation'
  ): Promise<QuotaCheckResult> {
    const now = this.getCurrentDate();
    const resetDate = this.getNextMonthResetDate(now);
    const tier = await this.getUserTier(userId);
    const totalQuota = this.getDefaultQuota(tier, provider);

    // Enterprise tier is always unrestricted
    if (tier === 'enterprise' || totalQuota === -1) {
      return {
        allowed: true,
        remaining: 999999,
        totalQuota: -1,
        used: 0,
        resetDate,
        tier: 'enterprise',
        provider,
        quotaLimit: -1,
        usedThisMonth: 0,
      };
    }

    let usedThisMonth = 0;
    let updatedAt = now.toISOString();
    let recordFound = false;

    // Check Supabase if available
    if (this.isSupabaseConfigured()) {
      try {
        const { data: credits, error } = await supabase
          .from('api_credits')
          .select('*')
          .eq('user_id', userId)
          .eq('provider', provider)
          .single();

        if (!error && credits) {
          recordFound = true;
          updatedAt = credits.updated_at || now.toISOString();

          // Check monthly rollover in Supabase
          if (this.isMonthlyResetDue(updatedAt, now)) {
            usedThisMonth = 0;
            const updatedTimestamp = now.toISOString();
            await supabase
              .from('api_credits')
              .update({
                used_this_month: 0,
                updated_at: updatedTimestamp,
              })
              .eq('id', credits.id);
            updatedAt = updatedTimestamp;
          } else {
            usedThisMonth = credits.used_this_month ?? 0;
          }
        } else if (!credits) {
          // Create initial record in Supabase
          try {
            await supabase.from('api_credits').insert({
              user_id: userId,
              provider,
              free_quota: totalQuota,
              used_this_month: 0,
              created_at: now.toISOString(),
              updated_at: now.toISOString(),
            });
          } catch {
            // Ignore insert race conditions
          }
        }
      } catch {
        // Fallback to in-memory store
      }
    }

    // If Supabase wasn't used or record was absent, check in-memory store
    const memRecord = this.getOrCreateInMemoryRecord(userId, tier);
    memRecord.tier = tier;

    let creditEntry = memRecord.credits.get(provider);
    if (!creditEntry) {
      creditEntry = {
        free_quota: totalQuota,
        used_this_month: recordFound ? usedThisMonth : 0,
        updated_at: updatedAt,
      };
      memRecord.credits.set(provider, creditEntry);
    } else {
      if (recordFound) {
        creditEntry.used_this_month = usedThisMonth;
        creditEntry.updated_at = updatedAt;
      } else {
        // Check monthly rollover in-memory
        if (this.isMonthlyResetDue(creditEntry.updated_at, now)) {
          creditEntry.used_this_month = 0;
          creditEntry.updated_at = now.toISOString();
        }
        usedThisMonth = creditEntry.used_this_month;
        updatedAt = creditEntry.updated_at;
      }
    }

    const remaining = Math.max(0, totalQuota - usedThisMonth);
    const allowed = usedThisMonth < totalQuota;

    let errorMessage: string | undefined;
    if (!allowed) {
      const tierLabel = tier === 'free' ? 'Free tier' : `${tier.toUpperCase()} tier`;
      errorMessage = `${tierLabel} limit exceeded: You have used ${usedThisMonth}/${totalQuota} videos this month. Limit resets on ${resetDate}. Upgrade to Pro for 50 videos/month.`;
    }

    return {
      allowed,
      remaining,
      totalQuota,
      used: usedThisMonth,
      resetDate,
      tier,
      provider,
      quotaLimit: totalQuota,
      usedThisMonth,
      error: errorMessage,
    };
  }

  /**
   * Consumes user quota by the specified count.
   * Throws QuotaExceededError if the user has reached their limit.
   */
  public async consumeQuota(
    userId: string,
    count: number = 1,
    provider: string = 'video_generation'
  ): Promise<QuotaConsumptionResult> {
    const status = await this.checkUserQuota(userId, provider);

    if (!status.allowed || (status.totalQuota !== -1 && status.used + count > status.totalQuota)) {
      const message =
        status.error ||
        `Quota exceeded: Cannot consume ${count} units. Used ${status.used}/${status.totalQuota}. Resets on ${status.resetDate}.`;
      throw new QuotaExceededError(message, status, userId);
    }

    const now = this.getCurrentDate();
    const newUsed = status.used + count;
    const updatedAt = now.toISOString();

    // Update in-memory record
    const memRecord = this.getOrCreateInMemoryRecord(userId, status.tier as UserTier);
    let creditEntry = memRecord.credits.get(provider);
    if (!creditEntry) {
      creditEntry = {
        free_quota: status.totalQuota,
        used_this_month: newUsed,
        updated_at: updatedAt,
      };
      memRecord.credits.set(provider, creditEntry);
    } else {
      creditEntry.used_this_month = newUsed;
      creditEntry.updated_at = updatedAt;
    }

    // Sync to Supabase if configured
    if (this.isSupabaseConfigured()) {
      try {
        const { data: existing } = await supabase
          .from('api_credits')
          .select('id')
          .eq('user_id', userId)
          .eq('provider', provider)
          .single();

        if (existing) {
          await supabase
            .from('api_credits')
            .update({
              used_this_month: newUsed,
              updated_at: updatedAt,
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('api_credits').insert({
            user_id: userId,
            provider,
            free_quota: status.totalQuota,
            used_this_month: newUsed,
            created_at: updatedAt,
            updated_at: updatedAt,
          });
        }
      } catch {
        // Fallback silently
      }
    }

    const updatedRemaining = status.totalQuota === -1 ? 999999 : Math.max(0, status.totalQuota - newUsed);
    const updatedStatus: QuotaCheckResult = {
      ...status,
      used: newUsed,
      usedThisMonth: newUsed,
      remaining: updatedRemaining,
      allowed: status.totalQuota === -1 || newUsed < status.totalQuota,
    };

    return {
      success: true,
      remaining: updatedRemaining,
      used: newUsed,
      totalQuota: status.totalQuota,
      status: updatedStatus,
    };
  }

  /**
   * Refunds user quota by the specified count upon failed generation/render jobs.
   */
  public async refundQuota(
    userId: string,
    count: number = 1,
    provider: string = 'video_generation'
  ): Promise<QuotaCheckResult> {
    const status = await this.checkUserQuota(userId, provider);
    const now = this.getCurrentDate();
    const newUsed = Math.max(0, status.used - count);
    const updatedAt = now.toISOString();

    // Update in-memory record
    const memRecord = this.getOrCreateInMemoryRecord(userId, status.tier as UserTier);
    const creditEntry = memRecord.credits.get(provider);
    if (creditEntry) {
      creditEntry.used_this_month = newUsed;
      creditEntry.updated_at = updatedAt;
    }

    // Sync to Supabase if configured
    if (this.isSupabaseConfigured()) {
      try {
        await supabase
          .from('api_credits')
          .update({
            used_this_month: newUsed,
            updated_at: updatedAt,
          })
          .eq('user_id', userId)
          .eq('provider', provider);
      } catch {
        // Fallback
      }
    }

    const updatedRemaining = status.totalQuota === -1 ? 999999 : Math.max(0, status.totalQuota - newUsed);
    return {
      ...status,
      used: newUsed,
      usedThisMonth: newUsed,
      remaining: updatedRemaining,
      allowed: true,
      error: undefined,
    };
  }

  /**
   * Fetches full usage breakdown for a user across providers and active render jobs.
   */
  public async getUserUsage(userId: string): Promise<UserUsageRecord> {
    const now = this.getCurrentDate();
    const tier = await this.getUserTier(userId);
    const resetDate = this.getNextMonthResetDate(now);
    const videoQuotaStatus = await this.checkUserQuota(userId, 'video_generation');

    const providersRecord: Record<
      string,
      { used: number; quota: number; remaining: number; updatedAt: string }
    > = {
      video_generation: {
        used: videoQuotaStatus.used,
        quota: videoQuotaStatus.totalQuota,
        remaining: videoQuotaStatus.remaining,
        updatedAt: now.toISOString(),
      },
    };

    let activeJobsCount = 0;

    // Fetch active jobs from Supabase if configured
    if (this.isSupabaseConfigured()) {
      try {
        const { count, error } = await supabase
          .from('render_jobs')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'processing']);

        if (!error && typeof count === 'number') {
          activeJobsCount = count;
        }

        const { data: allCredits } = await supabase
          .from('api_credits')
          .select('*')
          .eq('user_id', userId);

        if (allCredits && Array.isArray(allCredits)) {
          for (const item of allCredits) {
            const pQuota = item.free_quota || this.getDefaultQuota(tier, item.provider);
            const pUsed = item.used_this_month || 0;
            providersRecord[item.provider] = {
              used: pUsed,
              quota: pQuota,
              remaining: pQuota === -1 ? 999999 : Math.max(0, pQuota - pUsed),
              updatedAt: item.updated_at || now.toISOString(),
            };
          }
        }
      } catch {
        // Fallback to in-memory
      }
    }

    const memRecord = this.inMemoryStore.get(userId);
    if (memRecord) {
      for (const [providerName, cred] of memRecord.credits.entries()) {
        if (!providersRecord[providerName]) {
          providersRecord[providerName] = {
            used: cred.used_this_month,
            quota: cred.free_quota,
            remaining: cred.free_quota === -1 ? 999999 : Math.max(0, cred.free_quota - cred.used_this_month),
            updatedAt: cred.updated_at,
          };
        }
      }
      if (memRecord.activeJobs > 0 && activeJobsCount === 0) {
        activeJobsCount = memRecord.activeJobs;
      }
    }

    return {
      userId,
      tier,
      totalQuota: videoQuotaStatus.totalQuota,
      usedThisMonth: videoQuotaStatus.used,
      remaining: videoQuotaStatus.remaining,
      resetDate,
      providers: providersRecord,
      activeJobsCount,
      updatedAt: now.toISOString(),
    };
  }

  /**
   * Resets monthly quota manually or for a specific user
   */
  public async resetMonthlyQuota(
    userId: string,
    provider: string = 'video_generation'
  ): Promise<QuotaCheckResult> {
    const now = this.getCurrentDate();
    const memRecord = this.inMemoryStore.get(userId);
    if (memRecord) {
      const cred = memRecord.credits.get(provider);
      if (cred) {
        cred.used_this_month = 0;
        cred.updated_at = now.toISOString();
      }
    }

    if (this.isSupabaseConfigured()) {
      try {
        await supabase
          .from('api_credits')
          .update({
            used_this_month: 0,
            updated_at: now.toISOString(),
          })
          .eq('user_id', userId)
          .eq('provider', provider);
      } catch {}
    }

    return this.checkUserQuota(userId, provider);
  }

  /**
   * Test/Mock Helper: Manually sets mock user tier, usage, and updated timestamp
   */
  public setMockUser(
    userId: string,
    tier: UserTier = 'free',
    used: number = 0,
    updatedAt?: string,
    provider: string = 'video_generation'
  ): void {
    const now = updatedAt || this.getCurrentDate().toISOString();
    const record = this.getOrCreateInMemoryRecord(userId, tier);
    record.tier = tier;
    const quota = this.getDefaultQuota(tier, provider);
    record.credits.set(provider, {
      free_quota: quota,
      used_this_month: used,
      updated_at: now,
    });
  }

  /**
   * Test/Mock Helper: Advances mock clock by specified milliseconds
   */
  public advanceMockTime(ms: number): void {
    this.mockTimeOffsetMs += ms;
  }

  /**
   * Test/Mock Helper: Clears the in-memory store and resets clock
   */
  public clearMockStore(): void {
    this.inMemoryStore.clear();
    this.mockTimeOffsetMs = 0;
  }
}

// Export singleton instance
export const quotaManager = new QuotaManager();

// Functional exports for ease of consumption
export const checkUserQuota = (userId: string, provider?: string) =>
  quotaManager.checkUserQuota(userId, provider);

export const consumeQuota = (userId: string, count?: number, provider?: string) =>
  quotaManager.consumeQuota(userId, count, provider);

export const refundQuota = (userId: string, count?: number, provider?: string) =>
  quotaManager.refundQuota(userId, count, provider);

export const getUserUsage = (userId: string) =>
  quotaManager.getUserUsage(userId);

export const resetMonthlyQuota = (userId: string, provider?: string) =>
  quotaManager.resetMonthlyQuota(userId, provider);
