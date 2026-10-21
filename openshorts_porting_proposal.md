# OpenShorts Porting Proposal

After examining `mutonby/openshorts` (an open-source AI video automation platform for vertical shorts), here is a breakdown of their best features and a concrete plan for porting them to Clipped AI.

## 1. Feature Analysis: OpenShorts vs Clipped AI

| Feature | OpenShorts | Clipped AI (Current) | Action Required |
|---------|------------|----------------------|-----------------|
| **Long-to-Short Clipping** | Yes (AI Moment Detection) | Partial (Podcast workflow extracts text) | We need to add visual analysis and **Face Tracking / Auto-Framing** to keep the speaker centered in a 9:16 crop. |
| **UGC AI Actors** | Yes (Synthesia/HeyGen clones) | Yes (Avatar workflow exists) | None. |
| **Social Media Publishing** | Yes (TikTok, IG, YouTube) | Partial (`publish-worker.ts` exists for YouTube) | Extend our publisher to support the TikTok and Instagram Graph APIs. |
| **Agentic API (MCP Server)** | Yes (Exposes an MCP Server) | No | **High Priority.** We should expose an MCP Server so any local AI (like Claude or Cursor) can programmatically orchestrate video pipelines through our engine. |

---

## 2. Recommended Features to Port (In Order of Impact)

### 🥇 1. Face-Tracking Auto-Framer (The "MrBeast" Crop)
Currently, our video workflows simply crop 16:9 assets to 9:16 by anchoring to the center. OpenShorts uses face-tracking to dynamically pan the 9:16 crop window left and right to follow the active speaker. 
**Implementation:** We can build an FFmpeg complex filter using `crop` and `pan` math, or use a lightweight ONNX model in our render worker to detect bounding boxes and generate the FFmpeg filter dynamically.

### 🥈 2. Clipped AI MCP Server
OpenShorts proved that exposing a Model Context Protocol (MCP) server allows users to let local AI agents (like Claude Desktop) generate videos for them. 
**Implementation:** Create a Node.js MCP server in `mcp/` that exposes a `generate_video` tool, which POSTs directly to our `/api/workflows/generate` route.

### 🥉 3. TikTok & Instagram Publishing Pipelines
Our `publish-worker.ts` currently handles YouTube. We can expand it to natively authenticate and post to TikTok and Instagram Reels to match OpenShorts' distribution capabilities.

---

I recommend we start with the **Face-Tracking Auto-Framer**, as it drastically improves the visual quality of our 9:16 output, which is the core format for AI shorts. Should we begin implementing it?
