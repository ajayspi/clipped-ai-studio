/**
 * Clipped E2E Master Test Runner
 * Orchestrates requirement-driven opaque-box testing across all 6 workflows:
 * - Tier 1: Feature Coverage
 * - Tier 2: Boundary & Corner Cases
 * - Tier 3: Pairwise & Cross-Feature Interactions
 * - Tier 4: Real-World Workload Scenarios
 * - API Routes & Supabase Database Contract
 */

import { registry } from './test-harness';
import { registerTier1Tests } from './tier1-feature-coverage.test';
import { registerTier2Tests } from './tier2-boundary-corner.test';
import { registerTier3Tests } from './tier3-pairwise-interactions.test';
import { registerTier4Tests } from './tier4-workload-scenarios.test';
import { registerTier5Tests } from './tier5-adversarial-hardening.test';
import { registerApiRouteTests } from './api-routes.test';
import { registerTier6Tests } from './tier6-integration.test';
import { registerM6StressTests } from './stress-m6-quotas-publishing.test';

export async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('  CLIPPED E2E TEST RUNNER - 6 WORKFLOWS & EXTERNAL SUBSYSTEM VERIFICATION');
  console.log('='.repeat(80) + '\n');

  // Register all tiers
  await registerTier1Tests();
  await registerTier2Tests();
  await registerTier3Tests();
  await registerTier4Tests();
  await registerTier5Tests();
  await registerApiRouteTests();
  await registerTier6Tests();
  await registerM6StressTests();

  console.log(`[INFO] Registered test suites. Executing test matrix...\n`);

  const summary = await registry.run();

  // Group results by Tier
  const tierMap: Record<string, typeof summary.results> = {
    'Tier 1: Feature Coverage': summary.results.filter((r) => r.tier === 'tier1'),
    'Tier 2: Boundary & Corner Cases': summary.results.filter((r) => r.tier === 'tier2'),
    'Tier 3: Pairwise & Cross-Feature': summary.results.filter((r) => r.tier === 'tier3'),
    'Tier 4: Real-World Workloads': summary.results.filter((r) => r.tier === 'tier4'),
    'Tier 5: Adversarial Hardening': summary.results.filter((r) => r.tier === 'tier5'),
    'API Routes & Supabase Contract': summary.results.filter((r) => r.tier === 'api'),
    'Tier 6: External Integrations (TTS, Publishing, Quotas, Audio)': summary.results.filter((r) => r.tier === 'tier6'),
  };

  for (const [tierName, tests] of Object.entries(tierMap)) {
    console.log(`\n--- ${tierName} (${tests.length} tests) ---`);
    for (const test of tests) {
      const statusIcon = test.passed ? '✓ PASS' : '✗ FAIL';
      const durationStr = `${test.durationMs}ms`.padStart(6, ' ');
      console.log(`  [${statusIcon}] [${test.workflow.padEnd(14, ' ')}] ${test.id}: ${test.title} (${durationStr})`);
      if (!test.passed && test.error) {
        console.error(`          Error: ${test.error}`);
      }
    }
  }

  // Summary Banner
  console.log('\n' + '='.repeat(80));
  console.log('  TEST EXECUTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`  Total Tests  : ${summary.total}`);
  console.log(`  Passed       : ${summary.passed}`);
  console.log(`  Failed       : ${summary.failed}`);
  console.log(`  Total Time   : ${summary.durationMs}ms`);
  console.log(`  Success Rate : ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
  console.log('='.repeat(80) + '\n');

  if (summary.failed > 0) {
    console.error(`❌ E2E Test Suite FAILED with ${summary.failed} failing tests.\n`);
    return false;
  } else {
    console.log(`✨ All E2E test tiers PASSED with 100% genuine contract compliance.\n`);
    return true;
  }
}

// Auto-run if executed directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('runner')) {
  runAllTests().then((success) => {
    if (!success) {
      process.exitCode = 1;
    }
  }).catch((err) => {
    console.error('Fatal Runner Error:', err);
    process.exitCode = 1;
  });
}
