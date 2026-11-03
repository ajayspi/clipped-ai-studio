# models

## Overview
Model and resource manager tracking local offline models (Piper TTS, ONNX face tracking, Whisper.cpp) and cloud API circuit breakers.

## Interface
- [page.tsx:default] ModelManagerPage React client component displaying installed/downloadable local models and cloud API health
- [page.tsx:MOCK_MODELS] Constant array defining local models, sizes, and installation statuses

## Invariants
- [page.tsx:MOCK_MODELS] Distinguishes installed models from available ones with distinct status pill styling

## Side Effects
- [page.tsx:handleDownload] Simulates asynchronous local model download with transient loading state

## Verification
- Run: `pnpm test`
