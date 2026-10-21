# Epic Masterplan: Part II (The Advanced Studio)

With the foundational AI film OS (Master Canvas, Shot Manager, and Hyperframes) successfully deployed, we now turn to the remaining highly-advanced products from our architectural research.

## Phase 5: The 3D Previs Engine (ControlNet Director)
*(Inspired by: `wassermanproductions/blockout`, `wassermanproductions/motion-previs-studio`)*

**The Vision:** Text-to-video models hallucinate camera movement. We will fix this by providing exact geometric structure.
**The Plan:**
- **WebGL Grey-Box Stage:** Build `app/(app)/create/previs/page.tsx` using `@react-three/fiber`. 
- **Choreography:** Users can drop basic primitives (cubes, cylinders) and a camera, setting keyframes for panning/dollying.
- **Structural Export:** The canvas renders a WebGL "Depth Map" or "Canny Edge" video pass. 
- **Video Model Handoff:** This structural video is sent to the Video Generator (e.g., Kling or Seedance) alongside the prompt, forcing the AI to strictly obey the cinematic physics and lighting of the 3D scene.

## Phase 6: ScriptBreak & Emotional Analytics
*(Inspired by: `wassermanproductions/wassermans-filmmaker-suite` (ScriptBreak), `JohnTheTripper/moviegoer-prototype`, `bkingfilm/lapian-notes`)*

**The Vision:** Moving beyond basic prompt generation to true story analysis. 
**The Plan:**
- **ScriptBreak API:** A new orchestrator that accepts a full 10-page PDF screenplay. It uses a long-context LLM to parse it into an array of strictly defined `Scene` and `Shot` objects, automatically generating the `SH001, SH002` naming convention.
- **Emotional Curve Visualization:** For every broken-down scene, the LLM assigns a "Tension Score" (1-100). We will build a UI component using `Recharts` to draw the film's "Emotion Curve" (a line chart showing the narrative peaks and valleys) directly above the NLE timeline.

## Phase 7: Post-Production & DaVinci Resolve MCP
*(Inspired by: `wassermanproductions/wassermans-filmmaker-suite` (Stem Studio & DaVinci MCP), `SimileSystems/awesome-volumetric-filmmaking`)*

**The Vision:** Handing off the AI-generated assets to traditional post-production tools.
**The Plan:**
- **Stem Studio (Audio):** Add an automated audio separation workflow (using a tool like `spleeter` or an API) that splits generated AI video audio into `Dialogue`, `Music`, and `SFX` stems.
- **DaVinci Resolve MCP Server:** Expand our `clipped-mcp` so it can talk to DaVinci Resolve's Python API. You can tell Claude: "Take the approved V2 shots from the Shot Manager and assemble them on the DaVinci Resolve timeline."
- **Volumetric Export:** Add an export format that generates a standard MP4 + a separate Depth Map MP4 side-by-side, allowing playback in VR headsets (like Apple Vision Pro) for spatial computing filmmaking.
