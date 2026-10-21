# ArtCraft Porting Proposal

After examining `storytold/artcraft` (an intentional, WYSIWYG crafting engine for AI artists), here is a breakdown of their best features and a concrete plan for porting them to Clipped AI's web-based ecosystem.

## 1. Feature Analysis: ArtCraft vs Clipped AI

| Feature | ArtCraft | Clipped AI (Current) | Action Required |
|---------|----------|----------------------|-----------------|
| **Canvas Image Editing** | Yes (Draw, mask, inpaint to mold images) | Partial (We have Outpainting, but no interactive masking canvas) | Build a React canvas where users can draw masks over an image to guide targeted AI inpainting/restyling. |
| **Image to Video** | Yes (Animate images with controls) | Partial (Workflows exist, but no granular motion controls) | Add "Motion Brush" or trajectory tracking to let users draw motion vectors on static images. |
| **3D & Splats** | Yes (Generates 3D meshes and Gaussian Splats) | No | Introduce a `3D Assets` generation workflow (e.g., using Tripo3D or Meshy APIs) for generating B-roll objects. |

---

## 2. Recommended Features to Port (In Order of Impact)

### 🥇 1. Interactive Masking & Inpainting Canvas
Currently, our `Outpainting` workflow relies entirely on text prompts. ArtCraft excels at *visual control*. 
**Implementation:** We can port this by building an interactive React canvas (`app/(app)/create/inpaint/page.tsx`) using the standard HTML5 `<canvas>`. Users can upload a 16:9 or 9:16 image, draw a visual mask over a specific object or region, and send the base64 mask + image to an Inpainting API (like Fal or Kling) to surgically alter only that region.

### 🥈 2. Motion Brush / Image-to-Video Trajectory
Instead of blindly animating an image in the `v2v` or `ai-videos` workflows, we can add a "Motion Brush" tool.
**Implementation:** Expand our image-to-video capabilities by allowing users to draw directional arrows (vectors) on the image. These vectors get translated into camera pan/tilt parameters (e.g., `pan_left`, `zoom_in`) or passed as motion-brush masks to APIs that support it (like Runway Gen-3 or Luma).

### 🥉 3. 3D Asset Generator
ArtCraft supports generating 3D meshes (Hunyuan 3D, Meshy). We can add a simple `3D Model` workflow.
**Implementation:** Add a `/create/3d` route that hooks into a 3D generation API (like Tripo3D), allowing users to generate `.glb` files and save them to the Generative Asset Board.

---

I recommend we start with the **Interactive Masking & Inpainting Canvas**, as it introduces the "WYSIWYG" (What You See Is What You Get) visual control that makes ArtCraft so powerful. Should we begin implementing it?
