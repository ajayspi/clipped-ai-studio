# ai

## Overview
Autonomous AI generation utilities, 9-pose character reference sheet generators, and stickman animation pose interpolators.

## Interface
- [lib/ai/llm.ts:parseJson] export function parseJson<T>(content: string, fallback?: T): T
- [lib/ai/llm.ts:complete] export function complete(req: LLMCompletionRequest, provider?: string, model?: string): Promise<string>
- [lib/ai/llm.ts:LLMCompletionRequest] export interface LLMCompletionRequest { system: string; user: string; maxTokens?: number; json?: boolean }
- [lib/ai/stickman-animator.ts:interpolatePose] export function interpolatePose(poseA: string, poseB: string, t: number): PoseFrame
- [lib/ai/stickman-animator.ts:PoseFrame] export interface PoseFrame { svgPath: string; bbox: { x: number; y: number; w: number; h: number } }
- [lib/ai/gemini-character-generator.ts:GeminiCharacterGenerator] export class GeminiCharacterGenerator
- [lib/ai/gemini-character-generator.ts:geminiCharacterGenerator] export const geminiCharacterGenerator: GeminiCharacterGenerator
- [lib/ai/gemini-character-generator.ts:GenerateSheetOptions] export interface GenerateSheetOptions { archetype?: WhiteboardArchetype | string; customDescription?: string; style?: WhiteboardStyle | string; mock?: boolean }
- [lib/ai/gemini-character-generator.ts:KNOWN_ARCHETYPES] export const KNOWN_ARCHETYPES: WhiteboardArchetype[]
- [lib/ai/gemini-character-generator.ts:POSE_GRID_BBOXES] export const POSE_GRID_BBOXES: Record<string, [number, number, number, number]>
- [lib/ai/gemini-character-generator.ts:POSE_DEFINITIONS] export const POSE_DEFINITIONS: Array<{ id: string; name: string; defaultDesc: string }>

## Invariants
- [lib/ai/stickman-animator.ts:interpolatePose] Pose keys must exist in POSE_DEFINITIONS ('pose_1' through 'pose_9') or throws Error('Unknown pose key').
- [lib/ai/stickman-animator.ts:interpolatePose] For identical poses (poseA === poseB), returns the exact SVG path for any t in [0, 1]. All coordinate numbers in returned PoseFrame are strictly finite.
- [lib/ai/gemini-character-generator.ts:GeminiCharacterGenerator] Archetypes must map to KNOWN_ARCHETYPES ('stickman', 'saint', 'old man', 'founder', 'doctor', 'teacher', 'scientist', 'custom'), defaulting to 'stickman'.
- [lib/ai/llm.ts:parseJson] Safely parses LLM JSON outputs by stripping markdown code fences, bracket boundaries, and unescaped newlines without raw JSON.parse.

## Side Effects
- [lib/ai/gemini-character-generator.ts:generateWithOmniroute] Outbound HTTP POST requests to OmniRoute / Gemini API endpoints when mock is false.

## Verification
- Run: `pnpm test`
