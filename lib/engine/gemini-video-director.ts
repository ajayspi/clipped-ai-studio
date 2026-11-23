/**
 * Google Developer Knowledge Enhancement: Gemini Video Director & Multimodal Auditor
 * 
 * Implements official Google GenAI / Gemini API developer specifications:
 * 1. Native Structured Output (`responseSchema` + `responseMimeType: 'application/json'`)
 *    guaranteeing 100% schema-compliant StoryTreatment generation without markdown fences.
 * 2. Multimodal Video Quality Auditing (LLM-as-a-Director Judge) using Gemini 2.5 Flash
 *    to visually inspect rendered contact sheets for palette purity, framing, and text overlap.
 */

import { type StoryTreatment, LEMO_OPUSCAR_DIRECTOR_SYSTEM_PROMPT } from './visual-storytelling';

// ==========================================
// 1. Official Google GenAI JSON Schema for StoryTreatment
// ==========================================

export const GEMINI_STORY_TREATMENT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING', description: 'Title of the video' },
    styleSlug: { type: 'STRING', description: 'One of the 66 Lemo-Opuscar style slugs' },
    targetDurationSeconds: { type: 'NUMBER', description: 'Target total runtime in seconds' },
    logline: { type: 'STRING', description: 'One compelling sentence summarizing subject, desire, and turn' },
    arc: {
      type: 'OBJECT',
      properties: {
        setup: { type: 'STRING', description: 'Opening hook (0-8s)' },
        turn: { type: 'STRING', description: 'The complication or shift (8-24s)' },
        endingEcho: { type: 'STRING', description: 'Resolution bookending the opening' },
        nativeMove: { type: 'STRING', description: 'The medium-native transformation' }
      },
      required: ['setup', 'turn', 'endingEcho', 'nativeMove']
    },
    benchmark: {
      type: 'OBJECT',
      properties: {
        learnFrom: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Composition and grammar to emulate'
        },
        avoid: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Tropes, trademarked designs, or cliches to avoid'
        }
      },
      required: ['learnFrom', 'avoid']
    },
    shots: {
      type: 'ARRAY',
      description: 'Ordered sequence of shots comprising the video',
      items: {
        type: 'OBJECT',
        properties: {
          shotNumber: { type: 'INTEGER' },
          framing: {
            type: 'STRING',
            enum: ['extreme-wide', 'wide', 'medium', 'close-up', 'extreme-close-up', 'insert', 'oner']
          },
          cameraMove: { type: 'STRING', description: 'Specific camera motion choreography' },
          durationSeconds: { type: 'NUMBER', description: 'Shot length in seconds' },
          actionDescription: { type: 'STRING', description: 'Visual action and staging' },
          dialogueOrSubtitle: { type: 'STRING', description: 'Exact on-screen subtitle or spoken narration' },
          audioLayers: {
            type: 'OBJECT',
            properties: {
              ambience: { type: 'STRING', description: 'Room tone or background noise bed' },
              foley: { type: 'STRING', description: 'Specific material-accurate action sound' },
              musicState: { type: 'STRING', description: 'State of the musical score or silence' },
              isSilenceOrBreath: { type: 'BOOLEAN' },
              transition: {
                type: 'STRING',
                enum: ['hard-cut', 'j-cut', 'l-cut', 'native-wipe']
              }
            },
            required: ['ambience', 'foley', 'musicState']
          },
          narrativePurpose: { type: 'STRING', description: 'Dramatic motivation for this shot' }
        },
        required: ['shotNumber', 'framing', 'cameraMove', 'durationSeconds', 'actionDescription', 'audioLayers', 'narrativePurpose']
      }
    }
  },
  required: ['title', 'styleSlug', 'targetDurationSeconds', 'logline', 'arc', 'benchmark', 'shots']
};

// ==========================================
// 2. Official Gemini Request Builder
// ==========================================

export function buildGeminiTreatmentPayload(
  topic: string,
  styleSlug: string = 'blueprint',
  targetSeconds: number = 45
) {
  return {
    system_instruction: {
      parts: [{ text: LEMO_OPUSCAR_DIRECTOR_SYSTEM_PROMPT }]
    },
    contents: [
      {
        parts: [
          {
            text: `Direct a complete, broadcast-quality video treatment on the topic: "${topic}".
Style: ${styleSlug}
Target Duration: ${targetSeconds} seconds @ 24 fps.
Enforce the 0-3s Hook, min 4 camera moves, 3-layer audio with silences, and native medium climax.`
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_STORY_TREATMENT_SCHEMA,
      temperature: 0.7,
      maxOutputTokens: 4096
    }
  };
}

// ==========================================
// 3. Multimodal Video Quality Auditor Payload
// ==========================================

export function buildGeminiMultimodalAuditPayload(
  contactSheetBase64: string,
  treatment: StoryTreatment
) {
  const auditInstruction = `You are an elite cinematic supervisor auditing a rendered video contact sheet against its director treatment.
Evaluate the visual frames against the Lemo-Opuscar standard:
1. Palette Purity: Does the imagery strictly observe the style palette (e.g. Prussian blue + single signal accent for Blueprint; monochrome phosphor for CRT)?
2. Text Legibility: Are subtitle callouts and technical labels clear, high-contrast, and free from background clutter?
3. Silhouette & Staging: Does the subject occupy at least 1/3 of frame height during critical beats?
4. Hook Delivery: Does Shot 1 immediately convey tension/stakes?

Return a structured JSON review with scores (0-100) and actionable notes.`;

  return {
    contents: [
      {
        parts: [
          { text: auditInstruction },
          {
            text: `Treatment Reference:
Title: ${treatment.title}
Style: ${treatment.styleSlug}
Logline: ${treatment.logline}
Shots Count: ${treatment.shots.length}`
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: contactSheetBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          visualScore: { type: 'INTEGER' },
          paletteIntegrity: { type: 'BOOLEAN' },
          legibilityPassed: { type: 'BOOLEAN' },
          silhouetteScore: { type: 'INTEGER' },
          hookImpactScore: { type: 'INTEGER' },
          critique: { type: 'STRING' },
          actionableFixes: {
            type: 'ARRAY',
            items: { type: 'STRING' }
          }
        },
        required: ['visualScore', 'paletteIntegrity', 'legibilityPassed', 'hookImpactScore', 'critique', 'actionableFixes']
      }
    }
  };
}
