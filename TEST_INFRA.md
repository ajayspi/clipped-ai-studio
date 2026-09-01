# E2E Test Infra: Clipped AI Studio 'Create' Workflows

## Test Philosophy
- Opaque-box, requirement-driven, zero external network dependency (mock/dry-run fallbacks guaranteed).
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial Testing + Real-World Workloads.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | API Status Badges (Green/Orange/Red) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | Cost Tier Badges ($, $$, $$$) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 3 | Settings Shortcut Links | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 4 | 10 Workflow Cards Grid | ORIGINAL_REQUEST §R1, §R3 | 5 | 5 | ✓ |
| 5 | Automatic Mission One-Click Prompt Submission | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 6 | Mission Orchestration & Auto Pipeline Chaining | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 7 | Dedicated Mission Progress View with Stepper & Logs | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 8 | Manual / Edit in Wizard State Hydration Toggle | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 9 | Google Gemini Character Reference Sheet Generation | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 10 | Whiteboard Animation Orchestration & Storyboard Assembly | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 11 | Whiteboard Studio UI & API Endpoint | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 12 | Avatar to Video Orchestration & Compositing | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 13 | Avatar Studio UI & API Endpoint | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 14 | Cost-Safe Multi-Tier Dry-Run/Mock Fallbacks | ORIGINAL_REQUEST | 5 | 5 | ✓ |

## Test Architecture
- Test Runner: `node tests/e2e/test-create-workflows.js` and `node tests/e2e/standalone-runner.js`
- Test Framework: Node.js native assert, HTTP request mocking / direct endpoint execution, Remotion composition schema checks, and state hydration verification.
- Pass/Fail semantics: Exit code 0 on all tests passing; explicit error assertion logs on failure.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | One-Click Auto Mission: "Why the Roman Empire Collapsed" from prompt bar to completed video job | F5, F6, F7, F8, F14 | High |
| 2 | Whiteboard Video Generation with Gemini "Stickman" character reference and progressive sketch beats | F4, F9, F10, F11, F14 | High |
| 3 | Avatar Video Generation with Sarah presenter preset, voice synthesis, and PiP compositing | F4, F12, F13, F14 | High |
| 4 | API Keys Missing Fallback: Verify all 10 workflow cards gracefully render 🟡 Fallback status and execute safely | F1, F2, F3, F4, F14 | Medium |
| 5 | Mission Progress to Manual Wizard Handoff: Verify full state restoration into Zustand store | F6, F7, F8 | Medium |

## Coverage Thresholds
- Tier 1: ≥ 70 test cases (≥5 per feature across 14 features)
- Tier 2: ≥ 70 boundary & corner test cases
- Tier 3: ≥ 15 cross-feature interaction test cases
- Tier 4: ≥ 5 realistic application scenario test cases
- Total minimum test assertions: ≥ 160 test cases
