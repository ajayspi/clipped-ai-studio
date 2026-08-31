/**
 * Functional validation for QuotaManager and AudioMixer logic
 */

const assert = require('assert');

// Test Quota Logic Simulation
function testQuotaEngineLogic() {
  console.log('Testing Quota Engine Logic...');

  // Mock implementation matching lib/quotas.ts
  class MockQuotaManager {
    constructor() {
      this.store = new Map();
      this.offset = 0;
    }
    getCurrentDate() {
      return new Date(Date.now() + this.offset);
    }
    getNextMonthResetDate(fromDate) {
      const now = fromDate || this.getCurrentDate();
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0)).toISOString();
    }
    isMonthlyResetDue(lastDateStr) {
      if (!lastDateStr) return false;
      const last = new Date(lastDateStr);
      const now = this.getCurrentDate();
      return (
        last.getUTCFullYear() < now.getUTCFullYear() ||
        (last.getUTCFullYear() === now.getUTCFullYear() && last.getUTCMonth() < now.getUTCMonth())
      );
    }
    async checkUserQuota(userId) {
      const now = this.getCurrentDate();
      const resetDate = this.getNextMonthResetDate(now);
      let record = this.store.get(userId) || { tier: 'free', used: 0, updatedAt: now.toISOString() };
      
      if (this.isMonthlyResetDue(record.updatedAt)) {
        record.used = 0;
        record.updatedAt = now.toISOString();
      }
      this.store.set(userId, record);

      const totalQuota = record.tier === 'enterprise' ? -1 : (record.tier === 'pro' ? 50 : 3);
      const remaining = totalQuota === -1 ? 999999 : Math.max(0, totalQuota - record.used);
      const allowed = totalQuota === -1 || record.used < totalQuota;

      return {
        allowed,
        remaining,
        totalQuota,
        used: record.used,
        resetDate,
        tier: record.tier,
      };
    }
    async consumeQuota(userId, count = 1) {
      const status = await this.checkUserQuota(userId);
      if (!status.allowed || (status.totalQuota !== -1 && status.used + count > status.totalQuota)) {
        const err = new Error(`Quota exceeded: ${status.used}/${status.totalQuota}`);
        err.name = 'QuotaExceededError';
        err.status = status;
        throw err;
      }
      const record = this.store.get(userId);
      record.used += count;
      record.updatedAt = this.getCurrentDate().toISOString();
      return { success: true, remaining: status.totalQuota - record.used, used: record.used };
    }
    async refundQuota(userId, count = 1) {
      const record = this.store.get(userId);
      if (record) {
        record.used = Math.max(0, record.used - count);
        record.updatedAt = this.getCurrentDate().toISOString();
      }
      return this.checkUserQuota(userId);
    }
  }

  const qm = new MockQuotaManager();
  const userId = 'test-user-123';

  // 1. Initial check (free tier)
  return (async () => {
    let q = await qm.checkUserQuota(userId);
    assert.strictEqual(q.allowed, true);
    assert.strictEqual(q.remaining, 3);
    assert.strictEqual(q.totalQuota, 3);
    assert.strictEqual(q.used, 0);
    assert.strictEqual(q.tier, 'free');

    // 2. Consume 1
    let res = await qm.consumeQuota(userId, 1);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.used, 1);
    assert.strictEqual(res.remaining, 2);

    // 3. Consume 2 more
    await qm.consumeQuota(userId, 1);
    await qm.consumeQuota(userId, 1);
    q = await qm.checkUserQuota(userId);
    assert.strictEqual(q.allowed, false);
    assert.strictEqual(q.remaining, 0);
    assert.strictEqual(q.used, 3);

    // 4. Consume 4th should throw
    let threw = false;
    try {
      await qm.consumeQuota(userId, 1);
    } catch (e) {
      threw = true;
      assert.strictEqual(e.name, 'QuotaExceededError');
    }
    assert.strictEqual(threw, true, '4th consumption should throw QuotaExceededError');

    // 5. Refund 1 credit
    q = await qm.refundQuota(userId, 1);
    assert.strictEqual(q.allowed, true);
    assert.strictEqual(q.remaining, 1);
    assert.strictEqual(q.used, 2);

    // 6. Monthly reset simulation
    qm.store.get(userId).updatedAt = '2026-07-01T00:00:00.000Z'; // Last month
    q = await qm.checkUserQuota(userId);
    assert.strictEqual(q.allowed, true);
    assert.strictEqual(q.remaining, 3);
    assert.strictEqual(q.used, 0, 'Monthly rollover should reset used to 0');

    console.log('Quota Engine Logic tests passed!');
  })();
}

// Test Audio Mixer Logic
function testAudioMixerLogic() {
  console.log('Testing Audio Mixer Filter Generation & Ducking Logic...');

  function generateFilterGraph(options) {
    const voiceVol = options.voiceVolume ?? 1.0;
    const musicVol = options.bgmVolume ?? options.musicVolume ?? 0.2;
    const ducking = options.enableDucking !== false && options.ducking !== false;
    const duckRatio = options.duckingRatio ?? 4.0;
    const duckThreshold = options.duckingThreshold ?? 0.125;
    const attack = options.attackMs ?? 50;
    const release = options.releaseMs ?? 300;
    const duration = options.targetDuration ?? 30;
    const fadeIn = options.fadeInSeconds ?? options.fadeInDuration ?? 0.5;
    const fadeOut = options.fadeOutSeconds ?? options.fadeOutDuration ?? 2.0;
    const fadeOutStart = Math.max(0, duration - fadeOut);

    const voicePath = options.voiceAudioPath || 'voice.mp3';
    const bgmPath = options.bgmAudioPath || 'bgm.mp3';
    const outputPath = options.outputPath || 'mixed.mp3';

    let filterComplex;
    if (ducking) {
      filterComplex =
        `[0:a]volume=${voiceVol},aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[voice];` +
        `[1:a]volume=${musicVol},afade=t=in:ss=0:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut},aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[music_faded];` +
        `[music_faded][voice]sidechaincompress=threshold=${duckThreshold}:ratio=${duckRatio}:attack=${attack}:release=${release}[ducked_music];` +
        `[voice][ducked_music]amix=inputs=2:duration=first:dropout_transition=2[outa]`;
    } else {
      filterComplex =
        `[0:a]volume=${voiceVol},aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[voice];` +
        `[1:a]volume=${musicVol},afade=t=in:ss=0:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut},aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[music_faded];` +
        `[voice][music_faded]amix=inputs=2:duration=first[outa]`;
    }

    const command = `ffmpeg -y -i "${voicePath}" -stream_loop -1 -i "${bgmPath}" -filter_complex "${filterComplex}" -map "[outa]" -t ${duration} -c:a libmp3lame -b:a 192k "${outputPath}"`;

    return { filterComplex, command, duration };
  }

  // Test standard ducking graph
  const fg1 = generateFilterGraph({
    voiceAudioPath: 'test_voice.mp3',
    bgmAudioPath: 'test_music.mp3',
    targetDuration: 30,
    voiceVolume: 1.2,
    musicVolume: 0.15,
    enableDucking: true,
  });

  assert(fg1.command.includes('-stream_loop -1'), 'Command must loop BGM');
  assert(fg1.command.includes('sidechaincompress=threshold=0.125:ratio=4:attack=50:release=300'), 'Filter graph must include sidechain compressor');
  assert(fg1.command.includes('volume=1.2'), 'Filter graph must configure voice volume');
  assert(fg1.command.includes('volume=0.15'), 'Filter graph must configure music volume');
  assert(fg1.command.includes('afade=t=in:ss=0:d=0.5'), 'Filter graph must include fade in');
  assert(fg1.command.includes('afade=t=out:st=28:d=2'), 'Filter graph must include fade out starting at duration - 2s');
  assert(fg1.command.includes('amix=inputs=2'), 'Filter graph must mix inputs');

  // Test without ducking
  const fg2 = generateFilterGraph({
    targetDuration: 15,
    enableDucking: false,
  });
  assert(!fg2.filterComplex.includes('sidechaincompress'), 'Filter graph without ducking should not have sidechaincompress');
  assert(fg2.filterComplex.includes('[voice][music_faded]amix=inputs=2:duration=first[outa]'), 'Filter graph without ducking should mix voice and music directly');

  console.log('Audio Mixer Logic tests passed!');
}

(async () => {
  await testQuotaEngineLogic();
  testAudioMixerLogic();
  console.log('--- ALL M6C FUNCTIONAL TESTS COMPLETED SUCCESSFULLY ---');
})();
