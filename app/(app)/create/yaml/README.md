# Declarative YAML Workflow Studio

## Overview
OpenMontage-style declarative video pipeline editor that accepts multi-scene YAML video definitions, validates schema syntax, and submits execution graphs to `/api/workflows/yaml`.

## Interface
- [page.tsx:YamlWorkflowPage] Default client component hosting monospace YAML editor and execution trigger
- [page.tsx:yamlText] State holding declarative YAML markup
- [page.tsx:handleSubmit] Submission handler posting YAML graph to API

## Invariants
- [page.tsx:Navigation] On submission success (`res.ok && data.success`), routes directly to the operational `/queue`
- [page.tsx:ErrorHandling] Catches network and validation failures, surfacing inline error alerts without page crashes

## Side Effects
- [page.tsx:fetch] Sends POST request to `/api/workflows/yaml` with JSON `{ yaml: yamlText }`
- [page.tsx:router.push] Dispatches client-side navigation to `/queue`

## Verification
- Run: `node tests/e2e/standalone-runner.js`
