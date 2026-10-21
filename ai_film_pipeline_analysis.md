# AI Film Pipeline Analysis: Seedance, Blender, & Shotbuddy

Based on the three repositories examined, here is a comprehensive analysis of the bleeding-edge "3D-to-AI" filmmaking pipeline and how we can port these capabilities into **Clipped AI**.

## 1. Feature Breakdown

### A. Emily2040/seedance-2.0
- **What it is:** A comprehensive resource hub and "Agent Skill OS" for **Seedance 2.0**, a highly capable quad-modal AI video generator.
- **Core Concept:** Instead of users clicking buttons, an AI Agent (like Claude) acts as the "Director," using this Skill OS to autonomously manage shot planning, reference binding, and scene extensions.
- **Porting Potential:** We should add **Seedance 2.0** as a primary video provider in our `lib/engine/video-generator.ts`, competing with Kling and Fal. Furthermore, our `/create/auto` workflow should adopt their "Skill OS" prompting techniques for better autonomous direction.

### B. Evolink-AI/Awesome-Blender-Seedance-Workflow-Usecases
- **What it is:** A workflow guide for integrating **Blender 3D** with Seedance using an **MCP Server**.
- **Core Concept:** Generative AI struggles with spatial consistency and camera control. This workflow solves that by using Blender to create a "3D Blockout" (a crude 3D scene with perfect camera motion). The AI Agent uses the Blender MCP to automatically setup the scene, renders a "clay" pass, and feeds that render into Seedance as a structural reference. The result is hyper-consistent AI video with perfect cinematic camera tracking.
- **Porting Potential:** **High.** We can build a `Blender to AI` workflow. By utilizing a local Blender MCP server, our orchestration engine can generate a 3D blockout automatically, render it, and pass it to our video APIs for stylization.

### C. albozes/shotbuddy
- **What it is:** An open-source desktop app for managing AI film assets and version control.
- **Core Concept:** AI generation results in thousands of messy files. Shotbuddy enforces strict naming conventions (e.g., `SH011_v3`) and UI-based drag-and-drop shot versioning. Crucially, it locks the exact text prompt and reference image to the shot metadata so you never lose track of how an asset was made.
- **Porting Potential:** We recently built a Generative Asset Board (`/assets`), but it is a simple gallery. We should upgrade it into a true **Shot Manager** with version control (V1, V2, V3) and retained prompt metadata, just like Shotbuddy.

---

## 2. Action Plan for Clipped AI

If we were to integrate these paradigms, here is the execution order:

1. **The Shotbuddy Asset Upgrade:** Upgrade our Generative Asset Board to support `Versions` and display the `Generation Prompt / Model / Seed` alongside every clip.
2. **Seedance Integration:** Add the Seedance API to our engine as a premium generation provider.
3. **The 3D-to-AI Workflow:** Add a `/create/3d-previs` workflow that accepts a 3D blockout file (or connects to a Blender MCP) to lock in camera motions before passing to the AI video model.
