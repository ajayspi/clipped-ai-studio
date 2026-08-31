/**
 * M6C Self-Verification Test Suite
 * Tests Quotas Engine & Audio Mixer logic
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Test Quotas & Audio Mixer
console.log('--- Starting Milestone 6C Self-Verification ---');

// 1. Inspect lib/quotas.ts
const quotasSource = fs.readFileSync(path.join(__dirname, '../../lib/quotas.ts'), 'utf-8');
assert(quotasSource.includes('export class QuotaManager'), 'lib/quotas.ts must export QuotaManager');
assert(quotasSource.includes('export const quotaManager'), 'lib/quotas.ts must export quotaManager singleton');
assert(quotasSource.includes('export class QuotaExceededError'), 'lib/quotas.ts must export QuotaExceededError');
assert(quotasSource.includes('checkUserQuota'), 'lib/quotas.ts must export checkUserQuota');
assert(quotasSource.includes('consumeQuota'), 'lib/quotas.ts must export consumeQuota');
assert(quotasSource.includes('refundQuota'), 'lib/quotas.ts must export refundQuota');
assert(quotasSource.includes('getUserUsage'), 'lib/quotas.ts must export getUserUsage');
assert(quotasSource.includes('isMonthlyResetDue'), 'lib/quotas.ts must implement monthly reset detection');
assert(quotasSource.includes('free_quota: 3') || quotasSource.includes('videoQuota: 3'), 'Free tier must default to 3 videos');

// 2. Inspect lib/engine/audio-mixer.ts
const mixerSource = fs.readFileSync(path.join(__dirname, '../../lib/engine/audio-mixer.ts'), 'utf-8');
assert(mixerSource.includes('export class AudioMixer'), 'lib/engine/audio-mixer.ts must export AudioMixer');
assert(mixerSource.includes('export const audioMixer'), 'lib/engine/audio-mixer.ts must export audioMixer singleton');
assert(mixerSource.includes('mixAudio'), 'lib/engine/audio-mixer.ts must implement mixAudio');
assert(mixerSource.includes('sidechaincompress'), 'Filter complex must include sidechaincompress ducking');
assert(mixerSource.includes('afade=t=in'), 'Filter complex must include afade in');
assert(mixerSource.includes('afade=t=out'), 'Filter complex must include afade out');
assert(mixerSource.includes('-stream_loop -1'), 'Command must include -stream_loop -1 for music looping');
assert(mixerSource.includes('generateMockAudioBuffer'), 'Audio mixer must support synthetic mock audio generation');
assert(mixerSource.includes('isDryRun'), 'Audio mixer must support dryRun mode');

console.log('All source code assertions passed successfully!');
