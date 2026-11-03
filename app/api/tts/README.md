# tts

## Overview
Subsystem grouping for Text-to-Speech preview generation and voice catalog management.

## Interface
- preview: ./preview/README.md
- voices: ./voices/README.md

## Invariants
- [engine:ttsEngine] Coordinates voice discovery and synthesis across local and remote TTS providers

## Side Effects
- None

## Verification
- Run: `pnpm test`
