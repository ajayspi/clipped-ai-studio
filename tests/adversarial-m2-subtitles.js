/**
 * Adversarial Empirical Challenge Suite for Milestone 2:
 * Subtitle Effects & FFmpeg Filter Generation
 *
 * This test harness stress-tests:
 * 1. Special character escaping in FFmpeg drawtext
 * 2. All subtitle presets (Hormozi Pop, Cyber Neon, Cinematic Boxed, Bold Impact, Classic Minimal)
 * 3. Extreme boundary values for subtitleSize (0, 0.1, 10, 100, -10, 500)
 * 4. Extreme boundary values for subtitleY (0, 100, -10, 150)
 * 5. burnSubtitles: false behavior
 * 6. Color formats and box rendering (including API default rgba(0, 0, 0, 0.7))
 * 7. Live FFmpeg compilation & syntax validation of every generated filter graph
 * 8. External voice key clobbering in render worker
 */

const { spawnSync } = require('child_process');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const path = require('path');
const fs = require('fs');

// Register TypeScript hook
const ts = require('typescript');
require.extensions['.ts'] = function (module, filename) {
  let source = fs.readFileSync(filename, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};

const {
  escapeFfmpegDrawtext,
  buildSubtitleDrawtextFilter,
} = require('../scripts/render-worker.ts');

const BASE_FILTER = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920';

function compileFilterWithFfmpeg(filter) {
  const videoFilter = filter ? `${BASE_FILTER},${filter}` : BASE_FILTER;
  const args = [
    '-v', 'error',
    '-f', 'lavfi',
    '-i', 'color=c=black:s=1080x1920:d=0.04',
    '-vf', videoFilter,
    '-f', 'null',
    '-'
  ];
  const res = spawnSync(ffmpegInstaller.path, args);
  return {
    code: res.status,
    stderr: res.stderr ? res.stderr.toString().trim() : '',
    videoFilter,
  };
}

const testResults = [];

function recordTest(category, name, passed, details = {}) {
  const result = { category, name, passed, details };
  testResults.push(result);
  const mark = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${mark}: [${category}] ${name}`);
  if (!passed) {
    console.error(`     Reason: ${details.error || details.reason || 'Assertion failed'}`);
    if (details.filter) console.error(`     Filter: ${details.filter}`);
    if (details.stderr) console.error(`     FFmpeg Stderr: ${details.stderr}`);
  }
}

async function runAdversarialHarness() {
  console.log('================================================================');
  console.log('🔥 Adversarial Empirical Challenge: Milestone 2 Subtitle Engine');
  console.log('================================================================\n');

  // =========================================================================
  // Dimension 1: Special Characters Stress-Testing & Live FFmpeg Compilation
  // =========================================================================
  console.log('--- Dimension 1: Special Characters Stress-Testing ---');

  const specialCharCases = [
    {
      name: 'Single quotes',
      text: "Don't let's go, it's the user's ultimate test",
    },
    {
      name: 'Double quotes',
      text: 'He said "Hello World" and "Welcome to Clipped"',
    },
    {
      name: 'Colons',
      text: 'Key: Value: Part 1: Chapter 2: Ratio 16:9',
    },
    {
      name: 'Percent signs',
      text: 'Special 100% discount! Save 50% on all %s %d %{pts} tokens',
    },
    {
      name: 'Backslashes',
      text: 'C:\\Program Files\\App and \\\\network\\share\\data',
    },
    {
      name: 'Commas',
      text: 'One, two, three, four, five, six, seven, eight',
    },
    {
      name: 'Semicolons',
      text: 'First statement; second statement; final result;',
    },
    {
      name: 'Unicode emojis',
      text: '🔥 Viral Clip 🚀 Launching 💎 Diamond 🎬 Action',
    },
    {
      name: 'Newlines and carriage returns',
      text: "Line One\nLine Two\r\nLine Three\rLine Four",
    },
    {
      name: 'HTML tags and entities',
      text: '<span><b>Bold headline</b> &amp; <i>italic text</i></span>',
    },
    {
      name: 'All special characters combined',
      text: "It's 100% 'epic': \"Quotes\", C:\\path, 1:2 ratio, yes, no; 🔥 \n<b>Tags</b>",
    },
    {
      name: 'Command injection payload attempt',
      text: "Normal text; $(whoami); `rm -rf /`; ' OR '1'='1",
    },
  ];

  for (const tc of specialCharCases) {
    const filter = buildSubtitleDrawtextFilter(tc.text, {
      burnSubtitles: true,
      subtitlePreset: 'Hormozi Pop',
    });

    if (!filter) {
      recordTest('Special Characters', tc.name, false, {
        reason: 'buildSubtitleDrawtextFilter returned null',
        text: tc.text,
      });
      continue;
    }

    // Live compile with FFmpeg
    const ffmpegRes = compileFilterWithFfmpeg(filter);
    const passed = ffmpegRes.code === 0;
    recordTest('Special Characters', tc.name, passed, {
      filter,
      code: ffmpegRes.code,
      stderr: ffmpegRes.stderr,
    });
  }

  // =========================================================================
  // Dimension 2: Subtitle Presets
  // =========================================================================
  console.log('\n--- Dimension 2: Subtitle Presets ---');

  const presetCases = [
    {
      name: 'Hormozi Pop',
      config: { subtitlePreset: 'Hormozi Pop' },
      expectedChecks: (filter) =>
        filter.includes("text='VIRAL GROWTH HOOK'") &&
        (filter.includes('fontcolor=0xFACC15') || filter.includes('fontcolor=#FACC15')) &&
        filter.includes('borderw=3') &&
        filter.includes('bordercolor=black'),
    },
    {
      name: 'Cyber Neon',
      config: {
        subtitlePreset: 'Cyber Neon',
        subtitleColor: '#22D3EE',
        subtitleGlow: true,
        subtitleGlowColor: '#22D3EE',
        subtitleOutline: true,
        subtitleOutlineWidth: 2,
      },
      expectedChecks: (filter) =>
        filter.includes("text='VIRAL GROWTH HOOK'") &&
        (filter.includes('fontcolor=0x22D3EE') || filter.includes('fontcolor=#22D3EE')) &&
        filter.includes('borderw=2') &&
        (filter.includes('bordercolor=0x22D3EE') || filter.includes('bordercolor=#22D3EE')),
    },
    {
      name: 'Cinematic Boxed (with hex boxcolor)',
      config: {
        subtitlePreset: 'Cinematic Boxed',
        subtitleColor: '#F8FAFC',
        subtitleBox: true,
        subtitleBoxColor: '#000000',
      },
      expectedChecks: (filter) =>
        filter.includes("text='VIRAL GROWTH HOOK'") &&
        filter.includes(':box=1') &&
        filter.includes('boxcolor=0x000000@0.7') &&
        filter.includes('boxborderw=10'),
    },
    {
      name: 'Bold Impact',
      config: {
        subtitlePreset: 'Bold Impact',
        subtitleColor: '#FFFFFF',
      },
      expectedChecks: (filter) =>
        filter.includes("text='VIRAL GROWTH HOOK'") &&
        filter.includes('borderw=4') &&
        filter.includes('bordercolor=black'),
    },
    {
      name: 'Classic Minimal',
      config: {
        subtitlePreset: 'Classic Minimal',
        subtitleColor: '#FFFFFF',
        subtitleOutline: false,
      },
      expectedChecks: (filter) =>
        filter.includes('fontcolor=0xFFFFFF') || filter.includes('fontcolor=white'),
    },
    {
      name: 'Minimalist Clean',
      config: {
        subtitlePreset: 'Minimalist Clean',
        subtitleColor: '#FFFFFF',
        subtitleOutline: true,
        subtitleOutlineWidth: 1,
      },
      expectedChecks: (filter) =>
        filter.includes('borderw=1') &&
        (filter.includes('bordercolor=black') || filter.includes('bordercolor=0x000000')),
    },
  ];

  for (const pc of presetCases) {
    const text = 'Viral Growth Hook';
    const filter = buildSubtitleDrawtextFilter(text, {
      burnSubtitles: true,
      ...pc.config,
    });

    const structureValid = filter && pc.expectedChecks(filter);
    const ffmpegRes = filter ? compileFilterWithFfmpeg(filter) : { code: 1, stderr: 'No filter' };
    const passed = structureValid && ffmpegRes.code === 0;

    recordTest('Presets', pc.name, passed, {
      filter,
      structureValid,
      code: ffmpegRes.code,
      stderr: ffmpegRes.stderr,
    });
  }

  // =========================================================================
  // Dimension 3: Extreme Boundary Values for subtitleSize
  // =========================================================================
  console.log('\n--- Dimension 3: Boundary Values for subtitleSize ---');

  const sizeCases = [
    { name: 'subtitleSize = 0 (boundary/zero)', size: 0 },
    { name: 'subtitleSize = 0.1 (fractional/tiny)', size: 0.1 },
    { name: 'subtitleSize = 10 (scale threshold)', size: 10 },
    { name: 'subtitleSize = 100 (large)', size: 100 },
    { name: 'subtitleSize = -10 (negative)', size: -10 },
    { name: 'subtitleSize = 500 (huge)', size: 500 },
  ];

  for (const sc of sizeCases) {
    const filter = buildSubtitleDrawtextFilter('Size Boundary Test', {
      burnSubtitles: true,
      subtitleSize: sc.size,
    });

    if (!filter) {
      recordTest('Boundary: subtitleSize', sc.name, false, {
        reason: 'buildSubtitleDrawtextFilter returned null',
      });
      continue;
    }

    const ffmpegRes = compileFilterWithFfmpeg(filter);
    const passed = ffmpegRes.code === 0;
    recordTest('Boundary: subtitleSize', sc.name, passed, {
      filter,
      code: ffmpegRes.code,
      stderr: ffmpegRes.stderr,
    });
  }

  // =========================================================================
  // Dimension 4: Extreme Boundary Values for subtitleY
  // =========================================================================
  console.log('\n--- Dimension 4: Boundary Values for subtitleY ---');

  // SubtitleY = 0 should be top of screen (0.00). Let's verify if the code produces 0.00 or incorrectly falls back to 0.75:
  const yZeroFilter = buildSubtitleDrawtextFilter('Y Position Zero Test', {
    burnSubtitles: true,
    subtitleY: 0,
  });
  const yZeroTopPreserved = yZeroFilter && yZeroFilter.includes('y=(h-text_h)*0.00');
  recordTest(
    'Boundary: subtitleY',
    'subtitleY = 0 correctly positioned at top of screen (y*0.00)',
    yZeroTopPreserved,
    {
      filter: yZeroFilter,
      reason: yZeroTopPreserved
        ? 'Passed'
        : 'DEFECT: s.subtitleY > 0 treats 0 as falsey, discarding user selection and falling back to bottom (0.75)',
    }
  );

  const yHundredFilter = buildSubtitleDrawtextFilter('Y Position Hundred Test', {
    burnSubtitles: true,
    subtitleY: 100,
  });
  const yHundredPreserved = yHundredFilter && yHundredFilter.includes('y=(h-text_h)*1.00');
  recordTest(
    'Boundary: subtitleY',
    'subtitleY = 100 correctly positioned at bottom boundary (y*1.00)',
    yHundredPreserved,
    { filter: yHundredFilter }
  );

  const yNegativeFilter = buildSubtitleDrawtextFilter('Y Position Negative Test', {
    burnSubtitles: true,
    subtitleY: -10,
  });
  const yNegativePreserved = yNegativeFilter !== null;
  recordTest(
    'Boundary: subtitleY',
    'subtitleY = -10 falls back to default 0.75 without crashing',
    yNegativePreserved && compileFilterWithFfmpeg(yNegativeFilter).code === 0,
    { filter: yNegativeFilter }
  );

  const yOffscreenFilter = buildSubtitleDrawtextFilter('Y Position 150 Test', {
    burnSubtitles: true,
    subtitleY: 150,
  });
  const yOffscreenPreserved = yOffscreenFilter !== null && compileFilterWithFfmpeg(yOffscreenFilter).code === 0;
  recordTest(
    'Boundary: subtitleY',
    'subtitleY = 150 compiles in FFmpeg without syntax error',
    yOffscreenPreserved,
    { filter: yOffscreenFilter }
  );

  // =========================================================================
  // Dimension 5: burnSubtitles: false and Edge Cases
  // =========================================================================
  console.log('\n--- Dimension 5: burnSubtitles: false and Empty Text ---');

  const falseFilter = buildSubtitleDrawtextFilter('Some text', { burnSubtitles: false });
  const falsePassed = falseFilter === null;
  recordTest('Control Flag', 'burnSubtitles: false returns null', falsePassed, {
    filter: falseFilter,
  });

  const emptyFilter = buildSubtitleDrawtextFilter('', { burnSubtitles: true });
  const emptyPassed = emptyFilter === null;
  recordTest('Control Flag', 'Empty text returns null', emptyPassed, {
    filter: emptyFilter,
  });

  const whitespaceFilter = buildSubtitleDrawtextFilter('   \n  \t  ', { burnSubtitles: true });
  const whitespacePassed = whitespaceFilter === null;
  recordTest('Control Flag', 'Whitespace only text returns null', whitespacePassed, {
    filter: whitespaceFilter,
  });

  // Verify that null filter compiles cleanly as base videoFilter
  const nullFfmpegRes = compileFilterWithFfmpeg(null);
  recordTest('Control Flag', 'Clean video fallback compiles in FFmpeg', nullFfmpegRes.code === 0, {
    code: nullFfmpegRes.code,
    stderr: nullFfmpegRes.stderr,
  });

  // =========================================================================
  // Dimension 6: Color & Box Format Vulnerability (API Default rgba())
  // =========================================================================
  console.log('\n--- Dimension 6: Color & Box Styling Stress-Test ---');

  // Case 6.1: Hex box color
  const hexBoxFilter = buildSubtitleDrawtextFilter('Hex Box Test', {
    burnSubtitles: true,
    subtitleBox: true,
    subtitleBoxColor: '#000000',
  });
  const hexBoxRes = compileFilterWithFfmpeg(hexBoxFilter);
  recordTest('Color & Box', 'Hex box color (#000000)', hexBoxRes.code === 0, {
    filter: hexBoxFilter,
    code: hexBoxRes.code,
    stderr: hexBoxRes.stderr,
  });

  // Case 6.2: Named box color with alpha
  const namedBoxFilter = buildSubtitleDrawtextFilter('Named Box Test', {
    burnSubtitles: true,
    subtitleBox: true,
    subtitleBoxColor: 'black@0.6',
  });
  const namedBoxRes = compileFilterWithFfmpeg(namedBoxFilter);
  recordTest('Color & Box', 'Named box color (black@0.6)', namedBoxRes.code === 0, {
    filter: namedBoxFilter,
    code: namedBoxRes.code,
    stderr: namedBoxRes.stderr,
  });

  // Case 6.3: Default box color from app/api/workflows/generate/route.ts: 'rgba(0, 0, 0, 0.7)'
  const apiDefaultBoxFilter = buildSubtitleDrawtextFilter('API Default Box Test', {
    burnSubtitles: true,
    subtitleBox: true,
    subtitleBoxColor: 'rgba(0, 0, 0, 0.7)',
  });
  const apiDefaultBoxRes = compileFilterWithFfmpeg(apiDefaultBoxFilter);
  const apiDefaultBoxPassed = apiDefaultBoxRes.code === 0;
  recordTest(
    'Color & Box',
    'API default rgba(0, 0, 0, 0.7) boxcolor compiles in FFmpeg',
    apiDefaultBoxPassed,
    {
      filter: apiDefaultBoxFilter,
      code: apiDefaultBoxRes.code,
      stderr: apiDefaultBoxRes.stderr,
      reason: apiDefaultBoxPassed
        ? 'Passed'
        : 'CRITICAL BUG: FFmpeg parses commas in rgba(...) as filter separators and crashes drawtext with invalid argument',
    }
  );

  // Case 6.4: Preset Cinematic Boxed without explicit boxColor (inheriting route.ts default)
  const cinematicWithApiDefault = buildSubtitleDrawtextFilter('Cinematic Default Box', {
    burnSubtitles: true,
    subtitlePreset: 'Cinematic Boxed',
    subtitleBoxColor: 'rgba(0, 0, 0, 0.7)',
  });
  const cinematicApiRes = compileFilterWithFfmpeg(cinematicWithApiDefault);
  recordTest(
    'Color & Box',
    'Cinematic Boxed preset with API default rgba(0, 0, 0, 0.7) compiles in FFmpeg',
    cinematicApiRes.code === 0,
    {
      filter: cinematicWithApiDefault,
      code: cinematicApiRes.code,
      stderr: cinematicApiRes.stderr,
      reason:
        cinematicApiRes.code === 0
          ? 'Passed'
          : 'CRITICAL BUG: Cinematic Boxed crashes render worker when triggered via generate route with default boxColor',
    }
  );

  // =========================================================================
  // Dimension 7: Key Resolution Isolation in render-worker.ts
  // =========================================================================
  console.log('\n--- Dimension 7: Voice Provider Key Contamination in render-worker.ts ---');

  const workerSource = fs.readFileSync(
    path.resolve(__dirname, '../scripts/render-worker.ts'),
    'utf8'
  );

  // Check if render-worker clobbers API key with elevenKey || googleKey || azureKey || openAiKey
  const hasKeyClobbering = workerSource.includes('apiKey: elevenKey || googleKey || azureKey || openAiKey');
  recordTest(
    'Key Reflection',
    'render-worker does NOT pass indiscriminate fallback key to specific voice providers',
    !hasKeyClobbering,
    {
      reason: hasKeyClobbering
        ? 'DEFECT: scripts/render-worker.ts line 263 passes elevenKey || googleKey || azureKey || openAiKey as explicit apiKey, clobbering Azure/Google/OpenAI requests with ElevenLabs key whenever ElevenLabs key is configured.'
        : 'Passed',
    }
  );

  // =========================================================================
  // Summary & Statistics
  // =========================================================================
  console.log('\n================================================================');
  console.log('📊 Milestone 2 Empirical Challenge Summary:');
  const total = testResults.length;
  const passedCount = testResults.filter((t) => t.passed).length;
  const failedCount = total - passedCount;
  console.log(`  Total Scenarios Tested: ${total}`);
  console.log(`  Passed: ${passedCount}`);
  console.log(`  Failed: ${failedCount}`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    console.log('🚨 FAILED SCENARIOS:');
    testResults
      .filter((t) => !t.passed)
      .forEach((f) => {
        console.log(`  - [${f.category}] ${f.name}`);
        console.log(`    Reason: ${f.details.reason || f.details.error || f.details.stderr}`);
        if (f.details.filter) console.log(`    Filter: ${f.details.filter}`);
      });
  }

  return { total, passedCount, failedCount, testResults };
}

runAdversarialHarness().then(({ failedCount }) => {
  if (failedCount > 0) {
    console.log('\n⚠️ Empirical challenge found reproducible defects. Verdict: REJECT');
    process.exit(1);
  } else {
    console.log('\n🎉 All empirical challenge scenarios passed! Verdict: APPROVE');
    process.exit(0);
  }
}).catch((err) => {
  console.error('Fatal harness error:', err);
  process.exit(2);
});
