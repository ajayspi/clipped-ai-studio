import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadHealth, isProviderAvailable, recordProviderFailure, recordProviderSuccess, resetProviderHealthCache } from '../lib/engine/provider-health';
import { supabaseAdmin as db } from '../lib/db';

vi.mock('../lib/db', () => ({
  supabaseAdmin: {
    rpc: vi.fn()
  }
}));

describe('Provider Health Circuit', () => {
  beforeEach(() => {
    resetProviderHealthCache();
    vi.clearAllMocks();
    (db.rpc as any).mockResolvedValue({ data: null, error: null });
  });

  it('T29-SEM-01 - fresh provider is available', async () => {
    expect(await isProviderAvailable('llm', 'fresh')).toBe(true);
  });

  it('T29-SEM-02 - failures 1 and 2 leave it available, 3rd makes it unavailable', async () => {
    await recordProviderFailure('llm', 'test', 'error 1');
    expect(await isProviderAvailable('llm', 'test')).toBe(true);
    await recordProviderFailure('llm', 'test', 'error 2');
    expect(await isProviderAvailable('llm', 'test')).toBe(true);
    await recordProviderFailure('llm', 'test', 'error 3');
    expect(await isProviderAvailable('llm', 'test')).toBe(false);
  });

  it('T29-SEM-03 - 3rd failure cooldown lasts 60s and is not shortened by success on another provider', async () => {
    vi.useFakeTimers();
    await recordProviderFailure('llm', 'test1', 'e1');
    await recordProviderFailure('llm', 'test1', 'e2');
    await recordProviderFailure('llm', 'test1', 'e3');
    expect(await isProviderAvailable('llm', 'test1')).toBe(false);
    
    await recordProviderSuccess('llm', 'test2');
    expect(await isProviderAvailable('llm', 'test1')).toBe(false);
    
    vi.advanceTimersByTime(60000);
    expect(await isProviderAvailable('llm', 'test1')).toBe(true);
    vi.useRealTimers();
  });

  it('T29-SEM-04 - success clears both counter and cooldown', async () => {
    await recordProviderFailure('llm', 'test', 'e1');
    await recordProviderFailure('llm', 'test', 'e2');
    await recordProviderFailure('llm', 'test', 'e3');
    expect(await isProviderAvailable('llm', 'test')).toBe(false);
    
    await recordProviderSuccess('llm', 'test');
    expect(await isProviderAvailable('llm', 'test')).toBe(true);
    
    // next failure doesn't trip it immediately
    await recordProviderFailure('llm', 'test', 'e4');
    expect(await isProviderAvailable('llm', 'test')).toBe(true);
  });

  it('T29-SEM-05 - after expiry, consecutive_failures is 2, one more failure recools-down', async () => {
    vi.useFakeTimers();
    await recordProviderFailure('llm', 'test', 'e1');
    await recordProviderFailure('llm', 'test', 'e2');
    await recordProviderFailure('llm', 'test', 'e3');
    
    vi.advanceTimersByTime(60000);
    expect(await isProviderAvailable('llm', 'test')).toBe(true);
    
    await recordProviderFailure('llm', 'test', 'e4');
    expect(await isProviderAvailable('llm', 'test')).toBe(false);
    vi.useRealTimers();
  });
  
  it('T29-SEM-06 - missing DB/RPC fail open', async () => {
    (db.rpc as any).mockRejectedValue(new Error('DB missing'));
    await resetProviderHealthCache();
    expect(await loadHealth()).toBeInstanceOf(Map);
    expect(await isProviderAvailable('llm', 'any')).toBe(true);
  });

  it('T29-PSH-02 - atomic update mock (we just verify it calls rpc)', async () => {
    await recordProviderFailure('llm', 'test', 'e');
    expect(db.rpc).toHaveBeenCalledWith('record_provider_failure', { p_id: 'llm:test', p_reason: 'e' });
  });
});
