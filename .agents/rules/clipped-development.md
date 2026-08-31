---
trigger: always_on
description: Core architectural and environmental guidelines for the Clipped AI codebase.
---

# Clipped AI Development Guidelines

## 1. Development Environment (Local-First)
- **Constraint**: ALWAYS develop, port features, and edit code in the local Windows workspace (`C:\Users\vigilare\.gemini\antigravity\scratch\clipped`).
- **Restriction**: DO NOT develop or edit code directly on the Oracle VM over SSH. The VM is reserved exclusively for production testing and final deployment. Develop and test offline first.

## 2. LLM JSON Parsing
- **Constraint**: NEVER use standard `JSON.parse()` for parsing LLM (Claude, OpenAI, Gemini) responses.
- **Requirement**: Always use the robust `parseJson` helper utility (located at `lib/ai/llm.ts`) to safely handle markdown fences (```json), unescaped newlines, and trailing conversational text inherent to LLM outputs.

## 3. UI/UX Generation Patterns
- **Constraint**: When building new generation workflows in the `/create` section, strictly maintain the Shadcn UI and Tailwind design system established in the codebase.
- **Auto-Pilot Requirement**: Generation flows must support a hybrid "Auto-Pilot mode." Auto mode should orchestrate the steps automatically without blocking, BUT the UI must remain accessible so the user can inspect or intervene at any time (e.g., pausing to swap out AI-selected clips or modifying the script) during the process.
