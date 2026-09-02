## 2026-09-03T04:25:45Z
Objective: Implement Milestone 3 (Modernize Subtitles UI & Remotion Subtitle Styling):
1. Redesign `components/wizard/SubtitlesStep.tsx`:
   - High-depth modern glassmorphism styling (`backdrop-blur-xl`, `bg-card/70 dark:bg-zinc-900/60`, layered borders, subtle inner glow `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]`, smooth Framer Motion transitions).
   - Master Burn-in Toggle switch with animated glowing status.
   - 6 High-Impact Visual Presets with live animated mini-previews and clickable selection cards:
     1. **Hormozi Pop**: Heavy uppercase, primary white `#FFFFFF`, active yellow highlight `#FACC15`, 3.5px black outline, spring pop scale.
     2. **Cyber Neon**: Bold futuristic uppercase, primary cyan `#22D3EE`, active hot pink `#F43F5E`, radiant multi-layer neon glow.
     3. **Minimalist Clean**: Medium modern sans, primary white `#FFFFFF`, active soft silver `#E2E8F0`, clean diffused shadow.
     4. **Cinematic Boxed**: Elegant uppercase, wide letter-spacing, primary `#F8FAFC`, active sky blue `#38BDF8`, frosted dark translucent pill box (`rgba(0,0,0,0.7)`).
     5. **Bold Impact**: Ultra-heavy condensed uppercase, primary `#FFFFFF`, active orange `#FB923C`, solid 4px outline.
     6. **Retro Karaoke**: Rounded bold, primary `#F1F5F9`, active purple `#A855F7`, rounded translucent highlight badge.
   - 3-Segment Visual Position Selector:
     - Stylized smartphone mockup with 3 interactive segments for Top (15%), Center (50%), Bottom (78%), plus a fine-tuning slider (5% - 95%) with percentage readout.
   - Custom Styling & Color Controls:
     - Primary text color picker & swatches.
     - Highlight / Active Word color picker & swatches.
     - Stroke/Outline width slider (0 - 8px) and color picker.
     - Background box toggle, color picker, and opacity slider.
     - Typography toggles (Uppercase, Font scale slider, Max width slider).
   - In-Situ Live Subtitle Animated Sandbox:
     - Real-time animated preview banner demonstrating active word-by-word animation based on chosen style parameters.
   - Ensure clean rendering with zero React 19 / console warnings or errors.
2. Update `components/wizard/wizard-store.ts`:
   - Add any missing subtitle state properties (`subtitleHighlightColor`, `subtitleGlow`, `subtitleBoxOpacity`, `subtitleBoxRadius`, etc.) with sensible defaults matching the presets.
3. Update `remotion/Composition.tsx`:
   - Enhance `SubtitleOverlay` to support dynamic `highlightColor`, neon glow effects (`textShadow: 0 0 12px ...`), box opacity, and box radius.
   - Ensure 100% backward compatibility and seamless fallback for existing render pipelines.

Scope Boundaries:
- You exclusively own `components/wizard/SubtitlesStep.tsx`, subtitle state in `components/wizard/wizard-store.ts`, and `SubtitleOverlay` in `remotion/Composition.tsx`.
- Do not modify database or voice API routes.
