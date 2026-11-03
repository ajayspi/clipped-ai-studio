# create

## Overview
Central Studio Creation Hub consolidating the platform's video generation pipelines into 4 Signature Creative Studios (Social Shorts, Cinema & Drama, 2D & Explainer, Campaign & Newsroom) alongside the Auto-Pilot omni-prompt director bar.

## Interface
- [page.tsx:CreateHubPage] Default React client component displaying search filter, Omni-Launchpad prompt bar, and categorized studio cards

### 1. Social Shorts Studio Subsystems
- [auto](./auto/README.md): 1-click autonomous prompt bar workflow
- [avatar](./avatar/README.md): Audio-driven talking head avatar pipeline
- [outpaint](./outpaint/README.md): Spatial video aspect ratio outpainting
- [reddit](./reddit/README.md): Reddit story and social thread scraper to video
- [shorts](./shorts/README.md): Long-form video highlights and shorts extractor
- [trivia](./trivia/README.md): Interactive multiple-choice trivia video generator
- [v2v](./v2v/README.md): Video-to-video stylistic neural restyler

### 2. Cinema & Drama Studio Subsystems
- [character](./character/README.md): Visual character consistency and IP-Adapter wardrobe studio
- [cinema](./cinema/README.md): Director mode with cinematic lens choices and camera blocking
- [drama](./drama/README.md): Micro-Drama 1:N serialized episodic pipeline
- [mission](./mission/README.md): Autonomous multi-agent creative director workflow
- [previs](./previs/README.md): 3D zero-dependency perspective camera pre-visualization studio
- [scriptbreak](./scriptbreak/README.md): Screenplay parser and emotional tension curve breakdown

### 3. 2D & Explainer Studio Subsystems
- [2d](./2d/README.md): Canonical routing shim to the 2D Stick Figure Studio
- [code-video](./code-video/README.md): WaveDrom timing diagrams and syntax-highlighted code morph animations
- [papercraft](./papercraft/README.md): Vox-style paper cutout and origami transition studio
- [stick-figure](./stick-figure/README.md): 11-point kinematics, character wardrobe, and choreography auto-director
- [whiteboard](./whiteboard/README.md): Hand-drawn sketch and chalkboard animation studio

### 4. Campaign & Newsroom Studio Subsystems
- [bulk](./bulk/README.md): 30-day viral trend planner and scheduled batch creation
- [campaign](./campaign/README.md): Canonical routing shim to the bulk newsroom planner
- [podcast](./podcast/README.md): Multi-speaker conversational dialogue podcast generator
- [url](./url/README.md): Web article and blog scraper to video pipeline
- [yaml](./yaml/README.md): Declarative YAML video graph editor
- [[workflowType]](./[workflowType]/README.md): Dynamic route wrapper for legacy wizard workflows (ai-videos, footage, images, stories)

## Invariants
- [page.tsx:useApiKeys] Dynamically computes workflow readiness badges ('Ready', 'Fallback', 'Keys Needed') based on configured keys
- [page.tsx:CategoryGrouping] Categorizes creative options into the 4 Signature Studios to prevent choice overload

## Side Effects
- [page.tsx:refresh] Triggers client-side API key validation state refresh
- [page.tsx:Link] Client navigation to individual studio routes, `/queue`, or `/settings`

## Verification
- Run: `node tests/e2e/standalone-runner.js`
