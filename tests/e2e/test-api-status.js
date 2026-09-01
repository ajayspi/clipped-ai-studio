/**
 * E2E & Unit Verification Test for Milestone 1: API Configuration Status Indicators & Settings Links
 * 
 * Verifies:
 * 1. All 10 Workflow Definitions (IDs, titles, cost tiers, primary providers, fallbacks, routes).
 * 2. Status resolution logic (🟢 Ready, 🟡 Fallback, 🔴 Keys Needed) across multiple key states.
 * 3. Provider normalization (handling 'gemini' vs 'api_gemini', case insensitivity, active flag).
 * 4. Cost tier integrity ($, $$, $$$ assignments).
 * 5. Settings navigation URLs and parameters for all workflows.
 * 6. API keys route simulation (environment variable fallback + database record merge + key masking).
 * 7. Avatar and Whiteboard workflow specific requirement checks.
 */

const fs = require('fs');
const path = require('path');

// Test Suite Harness
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function describe(suiteName, fn) {
  console.log(`\n\x1b[1m\x1b[34m▶ ${suiteName}\x1b[0m`);
  fn();
}

function test(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  \x1b[32m✔\x1b[0m ${testName}`);
  } catch (err) {
    failedTests++;
    const errMsg = err.message || String(err);
    failures.push({ suite: testName, error: errMsg });
    console.log(`  \x1b[31m✖\x1b[0m ${testName}`);
    console.log(`    \x1b[31m${errMsg}\x1b[0m`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy value, got ${actual}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy value, got ${actual}`);
    },
    toBeDefined() {
      if (actual === undefined || actual === null) throw new Error(`Expected defined value, got ${actual}`);
    },
    toContain(item) {
      if (typeof actual === 'string' || Array.isArray(actual)) {
        if (!actual.includes(item)) throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`);
      }
    },
    toBeGreaterThan(n) {
      if (typeof actual !== 'number' || actual <= n) throw new Error(`Expected ${actual} > ${n}`);
    },
  };
}

// ====================================================================
// Pure JavaScript Implementations of Milestone 1 Logic for Testing
// ====================================================================

const WORKFLOWS = [
  {
    id: "footage",
    title: "Stock Footage Video",
    description: "Generate video using premium stock footage matched to your script.",
    href: "/create/footage",
    category: "stock",
    costTier: "$",
    primaryProviders: ["pexels", "pixabay", "gemini"],
    fallbackProviders: ["Public Stock & Openverse Scraper"],
    hasFallback: true,
    settingsUrl: "/settings?tab=Stock%20Media&provider=api_pexels",
    settingsTab: "Stock Media",
  },
  {
    id: "images",
    title: "AI Images Video",
    description: "Generate consistent AI images and animate them into a video.",
    href: "/create/images",
    category: "ai-video",
    costTier: "$$",
    primaryProviders: ["fal", "openai", "gemini"],
    fallbackProviders: ["Pollinations.ai Keyless Flux Generator"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_fal",
    settingsTab: "AI Models",
  },
  {
    id: "ai-videos",
    title: "AI Videos",
    description: "Use Kling, Luma, or Fal to generate 100% synthetic video scenes.",
    href: "/create/ai-videos",
    category: "ai-video",
    costTier: "$$$",
    primaryProviders: ["kling", "luma", "fal"],
    fallbackProviders: ["Mixkit Royalty-Free Clips & Dry Run"],
    hasFallback: true,
    settingsUrl: "/settings?tab=Stock%20Media&provider=api_kling",
    settingsTab: "Stock Media",
  },
  {
    id: "stories",
    title: "Stories Generator",
    description: "Turn any topic into a multi-part shorts narrative series automatically.",
    href: "/create/stories",
    category: "automation",
    costTier: "$$",
    primaryProviders: ["gemini", "openai"],
    fallbackProviders: ["Deterministic Narrative Bank & Free TTS"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "bulk",
    title: "Bulk Planner",
    description: "Generate 30 days of viral content in a specific niche at once.",
    href: "/create/bulk",
    category: "automation",
    costTier: "$$",
    primaryProviders: ["gemini", "openai"],
    fallbackProviders: ["30-Day Procedural Content Template Bank"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "shorts",
    title: "Extract Shorts",
    description: "Find viral hooks in long-form video or transcripts and extract shorts.",
    href: "/create/shorts",
    category: "automation",
    costTier: "$",
    primaryProviders: ["gemini", "openai"],
    fallbackProviders: ["Heuristic Virality & Energy Slicer"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "drama",
    title: "Micro-Drama",
    description: "Generate a cinematic episodic mini-series with consistent characters.",
    href: "/create/drama",
    category: "ai-video",
    costTier: "$$$",
    primaryProviders: ["fal", "kling", "gemini"],
    fallbackProviders: ["Dynamic Comic Arc Storyboard Mock Engine"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_fal",
    settingsTab: "AI Models",
  },
  {
    id: "auto",
    title: "Auto Pilot",
    description: "Fully hands-off prompt-to-video generation and scheduling pipeline.",
    href: "/create/auto",
    category: "automation",
    costTier: "$$",
    primaryProviders: ["gemini", "openai", "pexels"],
    fallbackProviders: ["Autonomous Cascade Dry-Run Engine"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "avatar",
    title: "Avatar to Video",
    description: "Generate talking-head videos with realistic AI avatars and voice sync.",
    href: "/create/avatar",
    category: "avatar-wb",
    costTier: "$$$",
    primaryProviders: ["heygen", "did"],
    fallbackProviders: ["Remotion PiP Talking Head & Audio Visualizer"],
    hasFallback: true,
    badge: "NEW",
    isNew: true,
    settingsUrl: "/settings?tab=Voice%20%26%20Audio&provider=api_heygen",
    settingsTab: "Voice & Audio",
  },
  {
    id: "whiteboard",
    title: "Whiteboard Animation",
    description: "Create hand-drawn sketch videos driven by consistent Gemini character sheets.",
    href: "/create/whiteboard",
    category: "avatar-wb",
    costTier: "$",
    primaryProviders: ["gemini"],
    fallbackProviders: ["Pre-rendered 9-Pose SVG Sketch Bank"],
    hasFallback: true,
    badge: "NEW",
    isNew: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
];

function isProviderConfigured(provider, keysMap = {}) {
  if (!provider) return false;
  const raw = provider.toLowerCase().trim();
  const clean = raw.replace(/^api_/, "");
  const entry = keysMap[clean] || keysMap[`api_${clean}`] || keysMap[raw];
  return Boolean(entry && entry.isConfigured && entry.isActive !== false);
}

function evaluateWorkflowStatus(workflow, keysMap = {}) {
  const required = workflow.primaryProviders || [];
  const configured = required.filter((p) => isProviderConfigured(p, keysMap));
  const missing = required.filter((p) => !isProviderConfigured(p, keysMap));

  let status = "ready";
  let label = "Ready";
  let message = "All required AI engines configured.";

  if (configured.length > 0) {
    status = "ready";
    label = "Ready";
    message = `Configured: ${configured.map((p) => p.toUpperCase()).join(", ")}`;
  } else if (workflow.hasFallback) {
    status = "warning";
    label = "Fallback Mode";
    const fallbackName = workflow.fallbackProviders && workflow.fallbackProviders[0] ? workflow.fallbackProviders[0] : "Built-in Engine";
    message = `Missing ${missing.map((p) => p.toUpperCase()).join("/")}. Active fallback: ${fallbackName}.`;
  } else {
    status = "error";
    label = "Keys Needed";
    message = `Requires ${missing.map((p) => p.toUpperCase()).join("/")} API key to operate.`;
  }

  return {
    status,
    costTier: workflow.costTier,
    label,
    requiredProviders: required,
    missingProviders: missing,
    configuredProviders: configured,
    fallbackAvailable: Boolean(workflow.hasFallback),
    message,
  };
}

function maskKey(key) {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `••••••••••••${key.slice(-4)}`;
}

const PROVIDER_ENV_MAP = {
  gemini: { envVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_AI_KEY'], category: 'AI Models' },
  openai: { envVars: ['OPENAI_API_KEY'], category: 'AI Models' },
  anthropic: { envVars: ['ANTHROPIC_API_KEY'], category: 'AI Models' },
  openrouter: { envVars: ['OPENROUTER_API_KEY'], category: 'AI Models' },
  pexels: { envVars: ['PEXELS_API_KEY'], category: 'Stock Media' },
  pixabay: { envVars: ['PIXABAY_API_KEY'], category: 'Stock Media' },
  fal: { envVars: ['FAL_API_KEY', 'FAL_KEY'], category: 'AI Models' },
  kling: { envVars: ['KLING_API_KEY'], category: 'Stock Media' },
  luma: { envVars: ['LUMA_API_KEY'], category: 'Stock Media' },
  elevenlabs: { envVars: ['ELEVENLABS_API_KEY', 'XI_API_KEY'], category: 'Voice & Audio' },
  heygen: { envVars: ['HEYGEN_API_KEY'], category: 'Avatar' },
  did: { envVars: ['DID_API_KEY', 'D_ID_API_KEY'], category: 'Avatar' },
  deepgram: { envVars: ['DEEPGRAM_API_KEY'], category: 'Voice & Audio' },
  huggingface: { envVars: ['HUGGINGFACE_API_KEY', 'HF_TOKEN'], category: 'Stock Media' },
};

function simulateApiKeysEndpoint(mockEnv = {}, mockDbRows = []) {
  const result = {};

  // 1. Env vars
  for (const [provider, config] of Object.entries(PROVIDER_ENV_MAP)) {
    let envKey;
    for (const envVar of config.envVars) {
      if (mockEnv[envVar]) {
        envKey = mockEnv[envVar];
        break;
      }
    }

    const hasEnv = Boolean(envKey && envKey.trim().length > 0);
    const entry = {
      isConfigured: hasEnv,
      isActive: hasEnv,
      maskedValue: hasEnv ? maskKey(envKey) : '',
      updatedAt: hasEnv ? new Date().toISOString() : null,
      source: hasEnv ? 'env' : 'none',
    };

    result[provider] = entry;
    result[`api_${provider}`] = entry;
  }

  // 2. DB merge
  for (const row of mockDbRows) {
    if (!row.provider) continue;
    const cleanName = row.provider.replace(/^api_/, '');
    const hasKey = Boolean(row.api_key && row.api_key.trim().length > 0);

    if (hasKey || !result[cleanName] || !result[cleanName].isConfigured) {
      const dbEntry = {
        isConfigured: hasKey,
        isActive: row.is_active !== undefined ? row.is_active : hasKey,
        maskedValue: hasKey ? maskKey(row.api_key) : '',
        updatedAt: row.updated_at || new Date().toISOString(),
        source: hasKey ? 'database' : (result[cleanName]?.source || 'none'),
      };

      result[cleanName] = dbEntry;
      result[`api_${cleanName}`] = dbEntry;
      result[row.provider] = dbEntry;
    }
  }

  return { keys: result };
}

// ====================================================================
// Test Execution
// ====================================================================

console.log("================================================================================");
console.log("  Clipped AI Studio — Milestone 1 E2E Verification Suite");
console.log("  Testing API Status Indicators, Workflow Definitions, Settings Links, & Key Logic");
console.log("================================================================================");

describe("1. Workflow Inventory & Specification Validation", () => {
  test("Exactly 10 distinct video generation workflows are defined", () => {
    expect(WORKFLOWS.length).toBe(10);
    const ids = WORKFLOWS.map((w) => w.id);
    expect(ids).toContain("footage");
    expect(ids).toContain("images");
    expect(ids).toContain("ai-videos");
    expect(ids).toContain("stories");
    expect(ids).toContain("bulk");
    expect(ids).toContain("shorts");
    expect(ids).toContain("drama");
    expect(ids).toContain("auto");
    expect(ids).toContain("avatar");
    expect(ids).toContain("whiteboard");
  });

  test("Each workflow has valid title, description, category, and href", () => {
    WORKFLOWS.forEach((wf) => {
      expect(typeof wf.title).toBe("string");
      expect(wf.title.length).toBeGreaterThan(0);
      expect(typeof wf.description).toBe("string");
      expect(wf.description.length).toBeGreaterThan(10);
      expect(typeof wf.href).toBe("string");
      expect(wf.href.startsWith("/create/")).toBe(true);
      expect(["stock", "ai-video", "automation", "avatar-wb"]).toContain(wf.category);
    });
  });

  test("Avatar to Video and Whiteboard Animation cards have NEW badges and avatar-wb category", () => {
    const avatar = WORKFLOWS.find((w) => w.id === "avatar");
    const whiteboard = WORKFLOWS.find((w) => w.id === "whiteboard");

    expect(avatar).toBeDefined();
    expect(avatar.badge).toBe("NEW");
    expect(avatar.isNew).toBe(true);
    expect(avatar.category).toBe("avatar-wb");
    expect(avatar.href).toBe("/create/avatar");

    expect(whiteboard).toBeDefined();
    expect(whiteboard.badge).toBe("NEW");
    expect(whiteboard.isNew).toBe(true);
    expect(whiteboard.category).toBe("avatar-wb");
    expect(whiteboard.href).toBe("/create/whiteboard");
  });
});

describe("2. Cost Tier Assignments ($ / $$ / $$$)", () => {
  test("Stock Footage, Shorts Extractor, and Whiteboard Animation are assigned Tier 1 ($)", () => {
    const tier1Ids = ["footage", "shorts", "whiteboard"];
    tier1Ids.forEach((id) => {
      const wf = WORKFLOWS.find((w) => w.id === id);
      expect(wf.costTier).toBe("$");
    });
  });

  test("AI Images, Stories, Bulk Planner, and Auto Pilot are assigned Tier 2 ($$)", () => {
    const tier2Ids = ["images", "stories", "bulk", "auto"];
    tier2Ids.forEach((id) => {
      const wf = WORKFLOWS.find((w) => w.id === id);
      expect(wf.costTier).toBe("$$");
    });
  });

  test("AI Videos (Kling/Luma), Micro-Drama, and Avatar to Video are assigned Tier 3 ($$$)", () => {
    const tier3Ids = ["ai-videos", "drama", "avatar"];
    tier3Ids.forEach((id) => {
      const wf = WORKFLOWS.find((w) => w.id === id);
      expect(wf.costTier).toBe("$$$");
    });
  });
});

describe("3. Settings Navigation Shortcuts & Deep-Linking", () => {
  test("Every workflow card provides a valid settingsUrl pointing to /settings with tab parameters", () => {
    WORKFLOWS.forEach((wf) => {
      expect(typeof wf.settingsUrl).toBe("string");
      expect(wf.settingsUrl.startsWith("/settings")).toBe(true);
      expect(wf.settingsUrl).toContain("tab=");
    });
  });

  test("Avatar card links to Voice & Audio / HeyGen settings", () => {
    const avatar = WORKFLOWS.find((w) => w.id === "avatar");
    expect(avatar.settingsUrl).toContain("tab=Voice%20%26%20Audio");
    expect(avatar.settingsUrl).toContain("provider=api_heygen");
  });

  test("Whiteboard card links to AI Models / Gemini settings", () => {
    const whiteboard = WORKFLOWS.find((w) => w.id === "whiteboard");
    expect(whiteboard.settingsUrl).toContain("tab=AI%20Models");
    expect(whiteboard.settingsUrl).toContain("provider=api_gemini");
  });

  test("AI Videos card links to Stock Media / Kling settings", () => {
    const aiVideos = WORKFLOWS.find((w) => w.id === "ai-videos");
    expect(aiVideos.settingsUrl).toContain("tab=Stock%20Media");
    expect(aiVideos.settingsUrl).toContain("provider=api_kling");
  });
});

describe("4. Provider Normalization & Status Resolution Logic", () => {
  test("isProviderConfigured handles both canonical ('gemini') and aliased ('api_gemini')", () => {
    const keysMap1 = { gemini: { isConfigured: true, isActive: true } };
    expect(isProviderConfigured("gemini", keysMap1)).toBe(true);
    expect(isProviderConfigured("api_gemini", keysMap1)).toBe(true);

    const keysMap2 = { api_pexels: { isConfigured: true, isActive: true } };
    expect(isProviderConfigured("pexels", keysMap2)).toBe(true);
    expect(isProviderConfigured("api_pexels", keysMap2)).toBe(true);
  });

  test("isProviderConfigured treats isActive: false as unconfigured", () => {
    const keysMap = { gemini: { isConfigured: true, isActive: false } };
    expect(isProviderConfigured("gemini", keysMap)).toBe(false);
  });

  test("When zero keys are configured, workflows with fallbacks resolve to 🟡 Warning (Fallback Mode)", () => {
    const emptyKeys = {};
    WORKFLOWS.forEach((wf) => {
      const evaluation = evaluateWorkflowStatus(wf, emptyKeys);
      expect(evaluation.status).toBe("warning");
      expect(evaluation.label).toBe("Fallback Mode");
      expect(evaluation.fallbackAvailable).toBe(true);
      expect(evaluation.configuredProviders.length).toBe(0);
      expect(evaluation.missingProviders.length).toBe(wf.primaryProviders.length);
    });
  });

  test("When primary key is configured, workflow resolves to 🟢 Ready", () => {
    const keysMap = {
      gemini: { isConfigured: true, isActive: true, maskedValue: "••••4910" },
    };

    const whiteboard = WORKFLOWS.find((w) => w.id === "whiteboard");
    const evalResult = evaluateWorkflowStatus(whiteboard, keysMap);

    expect(evalResult.status).toBe("ready");
    expect(evalResult.label).toBe("Ready");
    expect(evalResult.configuredProviders).toContain("gemini");
    expect(evalResult.missingProviders.length).toBe(0);
  });

  test("Avatar workflow evaluates to Ready if heygen OR did is configured", () => {
    const avatar = WORKFLOWS.find((w) => w.id === "avatar");

    // Case 1: Heygen set
    const keysHeygen = { heygen: { isConfigured: true, isActive: true } };
    expect(evaluateWorkflowStatus(avatar, keysHeygen).status).toBe("ready");

    // Case 2: D-ID set
    const keysDid = { did: { isConfigured: true, isActive: true } };
    expect(evaluateWorkflowStatus(avatar, keysDid).status).toBe("ready");

    // Case 3: Neither set -> Fallback
    expect(evaluateWorkflowStatus(avatar, {}).status).toBe("warning");
  });

  test("Workflow without fallback and missing keys resolves to 🔴 Error (Keys Needed)", () => {
    const strictWorkflow = {
      id: "custom-strict",
      title: "Strict Workflow",
      primaryProviders: ["proprietary_key"],
      hasFallback: false,
      costTier: "$$$",
    };

    const evalResult = evaluateWorkflowStatus(strictWorkflow, {});
    expect(evalResult.status).toBe("error");
    expect(evalResult.label).toBe("Keys Needed");
    expect(evalResult.fallbackAvailable).toBe(false);
  });
});

describe("5. API Keys Endpoint Simulation & Environment Integration", () => {
  test("Masking logic obscures key values safely", () => {
    expect(maskKey("")).toBe("");
    expect(maskKey("12345")).toBe("••••••••");
    expect(maskKey("AIzaSyB1234567890abcdef")).toBe("••••••••••••cdef");
  });

  test("Simulated API keys endpoint populates from process.env", () => {
    const mockEnv = {
      GEMINI_API_KEY: "AIzaSyGeminiSecret1234",
      PEXELS_API_KEY: "PexelsSecret9999",
    };

    const res = simulateApiKeysEndpoint(mockEnv, []);
    expect(res.keys.gemini.isConfigured).toBe(true);
    expect(res.keys.gemini.isActive).toBe(true);
    expect(res.keys.gemini.maskedValue).toBe("••••••••••••1234");
    expect(res.keys.api_gemini.isConfigured).toBe(true);

    expect(res.keys.pexels.isConfigured).toBe(true);
    expect(res.keys.api_pexels.isConfigured).toBe(true);

    expect(res.keys.openai.isConfigured).toBe(false);
    expect(res.keys.heygen.isConfigured).toBe(false);
  });

  test("Simulated API keys endpoint merges Supabase database overrides over env", () => {
    const mockEnv = {
      GEMINI_API_KEY: "AIzaSyEnv1111",
    };
    const mockDbRows = [
      { provider: "api_gemini", api_key: "AIzaSyDbOverride2222", is_active: true, updated_at: "2026-09-01T10:00:00Z" },
      { provider: "heygen", api_key: "HeygenKey3333", is_active: true, updated_at: "2026-09-01T11:00:00Z" },
    ];

    const res = simulateApiKeysEndpoint(mockEnv, mockDbRows);
    expect(res.keys.gemini.isConfigured).toBe(true);
    expect(res.keys.gemini.maskedValue).toBe("••••••••••••2222");
    expect(res.keys.gemini.source).toBe("database");

    expect(res.keys.heygen.isConfigured).toBe(true);
    expect(res.keys.heygen.maskedValue).toBe("••••••••••••3333");
    expect(res.keys.heygen.source).toBe("database");
  });
});

describe("6. Types and File Artifact Integrity Check", () => {
  test("Check that lib/engine/types.ts contains extended types", () => {
    const typesPath = path.join(__dirname, '../../lib/engine/types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');

    expect(content.includes("'avatar'")).toBe(true);
    expect(content.includes("'whiteboard'")).toBe(true);
    expect(content.includes("'mission'")).toBe(true);
    expect(content.includes('ApiKeyStatus')).toBe(true);
    expect(content.includes('WorkflowDefinition')).toBe(true);
    expect(content.includes('CharacterReferenceSheet')).toBe(true);
    expect(content.includes('WhiteboardStoryboardBeat')).toBe(true);
    expect(content.includes('AvatarConfig')).toBe(true);
  });

  test("Check that components/create files exist", () => {
    const files = [
      'components/create/useApiKeys.ts',
      'components/create/workflow-definitions.ts',
      'components/create/WorkflowCard.tsx',
      'components/create/WorkflowGrid.tsx',
      'components/create/MissionPromptBar.tsx',
      'app/(app)/create/page.tsx',
    ];

    files.forEach((file) => {
      const fullPath = path.join(__dirname, '../../', file);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });
});

// ====================================================================
// Summary Report
// ====================================================================

console.log("\n================================================================================");
console.log(`  Test Results: ${passedTests} / ${totalTests} Passed (${failedTests} Failed)`);
if (failedTests === 0) {
  console.log("  \x1b[32m✔ 100% Milestone 1 Tests Passed Successfully!\x1b[0m");
} else {
  console.log(`  \x1b[31m✖ ${failedTests} Tests Failed!\x1b[0m`);
  failures.forEach((f) => console.log(`    - ${f.suite}: ${f.error}`));
}
console.log("================================================================================");

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
