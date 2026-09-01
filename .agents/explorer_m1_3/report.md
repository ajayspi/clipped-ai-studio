# UI Design, Glassmorphism Styling, Icons & Tooltip Architecture for Clipped AI Studio

**Milestone 1 Specification & Implementation Blueprint**  
**Explorer M1-3 Analysis Report**  
**Date**: September 1, 2026  
**Target Scope**: 10 Workflow Cards, Glassmorphism Tokens, Lucide Icons, API Status Tooltips, Responsive Grid Layout

---

## 1. Executive Summary & Design System Foundation

The Clipped AI Studio "Create" hub (`app/(app)/create/page.tsx`) serves as the primary gateway for users to initiate 10 distinct AI video production pipelines. To deliver a polished, high-tech creative suite experience, the interface utilizes **Tailwind CSS v4** styling tokens, **glassmorphic translucency**, dynamic **lucide-react** iconography, real-time **API configuration status badges**, and an adaptive **1-to-5 column responsive grid**.

### Key Architectural Principles:
1. **Tailwind v4 Token Compliance**: Uses CSS variable-driven tokens (`bg-card/70`, `backdrop-blur-xl`, `border-border/50`, `text-muted-foreground`) that seamlessly toggle between Light and Dark modes (`dark:bg-zinc-950/70 dark:border-white/10`).
2. **Distinct Visual Identity for 10 Workflows**: Each workflow receives a dedicated color gradient, glowing background accent, and thematic Lucide icon.
3. **Transparent API Key Status UX**: Status dots (🟢 Ready, 🟡 Fallback/Mock, 🔴 Keys Needed) equipped with rich, glassmorphic popover tooltips that display exact provider key statuses (e.g. `Google Gemini: Configured`, `Pexels: Not Configured`).
4. **Fluid Responsiveness**: Symmetrically arranges all 10 cards across breakpoints:
   - Mobile (`<640px`): `grid-cols-1` (10 rows)
   - Small Tablet (`640px-767px`): `sm:grid-cols-2` (5 rows × 2 cols)
   - Medium Tablet / Small Desktop (`768px-1023px`): `md:grid-cols-2` / `md:grid-cols-3`
   - Large Desktop (`1024px-1279px`): `lg:grid-cols-3`
   - Widescreen (`1280px-1535px`): `xl:grid-cols-4`
   - Ultra-Wide (`≥1536px`): `2xl:grid-cols-5` (clean 2 rows × 5 cols)

---

## 2. Tailwind v4 Glassmorphic Styling Tokens

Tailwind v4 in Next.js 16 leverages modern CSS `@theme inline` mapping HSL CSS variables from `app/globals.css`. This enables high-performance hardware-accelerated backdrop blur filters and variable alpha channels.

### 2.1 Glassmorphic Card Container Classes

```tsx
// Primary Card Shell
className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/50 bg-card/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-md transition-all duration-300 hover:shadow-2xl hover:border-violet-500/40 hover:-translate-y-1"
```

| Element | Tailwind v4 Classes | Visual Rationale |
|---------|---------------------|------------------|
| **Background** | `bg-card/70 dark:bg-zinc-900/60` | 70% opacity card surface in light mode; 60% opacity deep zinc in dark mode. |
| **Backdrop Filter** | `backdrop-blur-xl` | 24px background Gaussian blur for frosted glass diffusion over animated background particles/gradients. |
| **Border** | `border border-border/50 hover:border-primary/40` | Subtle hairline separation; illuminates to brand purple/primary upon hover. |
| **Shadow** | `shadow-sm hover:shadow-xl hover:shadow-violet-500/10` | Elevated hover state with soft colored ambient shadow. |
| **Hover Transform** | `transition-all duration-300 hover:-translate-y-1` | Micro-elevation feedback indicating clickability. |

### 2.2 Ambient Glow Accent & Light Leak Overlay

Inside each card, a radial blur gradient provides an ambient light leak matching the workflow's accent color:

```tsx
{/* Ambient Glow Accent */}
<div 
  className={cn(
    "absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl pointer-events-none opacity-40 group-hover:opacity-80 transition-all duration-500",
    workflow.glowBg // e.g. "bg-gradient-to-br from-violet-500/30 to-fuchsia-500/10"
  )} 
/>
```

### 2.3 Status Indicators & Cost Badges

```tsx
// Status Badge Pill
const statusStyles = {
  ready: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  error: "bg-rose-500/10 text-rose-500 border-rose-500/20",
}

// Cost Tier Badge
const costStyles = {
  "$": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "$$": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "$$$": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
}
```

---

## 3. Taxonomy & Icon Mapping for All 10 Workflows

All 10 workflows are categorized with dedicated `lucide-react` icons, bespoke color palettes, cost tier indicators, and required API dependencies:

| # | Workflow ID | Display Title | Lucide Icon | Theme Color & Container Classes | Glow Background | Cost Tier | Required API Keys | Fallback Mode |
|---|-------------|---------------|-------------|---------------------------------|-----------------|-----------|-------------------|---------------|
| 1 | `footage` | Stock Footage Video | `Video` | `text-sky-500 bg-sky-500/10 border-sky-500/20` | `from-sky-500/30 to-blue-500/5` | `$` | `api_pexels`, `api_pixabay`, `api_gemini` | Free Stock & Public Archive fallback |
| 2 | `images` | AI Images Video | `Image` (ImageIcon) | `text-purple-500 bg-purple-500/10 border-purple-500/20` | `from-purple-500/30 to-indigo-500/5` | `$$` | `api_openai` (DALL-E), `api_gemini` (Imagen), `api_fal` | Pollinations.ai zero-key generator |
| 3 | `ai-videos` | AI Synthetic Videos | `Film` / `Clapperboard` | `text-pink-500 bg-pink-500/10 border-pink-500/20` | `from-pink-500/30 to-rose-500/5` | `$$$` | `api_kling`, `api_luma`, `api_huggingface` | Hugging Face free tier / Keyframe interpolator |
| 4 | `stories` | Stories Generator | `BookOpen` | `text-orange-500 bg-orange-500/10 border-orange-500/20` | `from-orange-500/30 to-amber-500/5` | `$` | `api_gemini`, `api_openai`, `api_deepgram` | Offline story templates + stock background |
| 5 | `bulk` | Bulk Content Planner | `Layers` / `ListTodo` | `text-emerald-500 bg-emerald-500/10 border-emerald-500/20` | `from-emerald-500/30 to-teal-500/5` | `$$` | `api_gemini`, `api_pexels`, `api_pixabay` | 30-day template bank with staggered render |
| 6 | `shorts` | Extract Viral Shorts | `Scissors` / `Zap` | `text-amber-500 bg-amber-500/10 border-amber-500/20` | `from-amber-500/30 to-yellow-500/5` | `$` | `api_gemini` (1M ctx), `api_deepgram` | FFmpeg audio silence/energy slicer |
| 7 | `drama` | Micro-Drama Series | `Drama` / `Clapperboard` | `text-red-500 bg-red-500/10 border-red-500/20` | `from-red-500/30 to-rose-500/5` | `$$$` | `api_fal` / `api_kling`, `api_gemini`, `api_deepgram` | 2D dynamic comic scene transitions |
| 8 | `auto` / `mission` | Automatic Mission | `Sparkles` / `Wand2` | `text-indigo-500 bg-indigo-500/10 border-indigo-500/20` | `from-indigo-500/35 to-violet-500/10` | `$$` | `api_gemini`, `api_pexels`, `api_deepgram` | Multi-tier autonomous fallback pipeline |
| 9 | `avatar` | Avatar to Video | `UserCheck` / `Smile` | `text-cyan-500 bg-cyan-500/10 border-cyan-500/20` | `from-cyan-500/30 to-teal-500/5` | `$$$` | `api_heygen`, `api_did`, `api_deepgram` | 2D avatar lip-flap + audio-reactive Remotion |
| 10 | `whiteboard` | Whiteboard Animation | `PenTool` / `Palette` | `text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20` | `from-fuchsia-500/30 to-pink-500/5` | `$` | `api_gemini` (GenAI Character Sheets) | Pre-rendered 9-pose SVGs (Stickman, Doctor, etc.) |

---

## 4. Tooltip & Popover UX for API Key Statuses

### 4.1 Status Badge Anatomy & States

On each card's upper right, a status pill provides immediate clarity:

1. **Ready (🟢)**:
   ```tsx
   <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
     <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
     <span>Ready</span>
   </div>
   ```
2. **Fallback Mode (🟡)**:
   ```tsx
   <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
     <span className="w-2 h-2 rounded-full bg-amber-500" />
     <span>Fallback</span>
   </div>
   ```
3. **Keys Needed (🔴)**:
   ```tsx
   <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
     <span className="w-2 h-2 rounded-full bg-rose-500" />
     <span>Keys Needed</span>
   </div>
   ```

### 4.2 Popover / Tooltip Wireframe

Hovering over the status pill opens a floating glassmorphic popover:

```
┌────────────────────────────────────────────────────────┐
│  API Configuration Status                              │
│  Stock Footage Video (2 / 3 Configured)                │
├────────────────────────────────────────────────────────┤
│  ✓ Google Gemini (Script)         ••••4910 [Active]    │
│  ✓ Pexels API (Stock Media)       ••••9812 [Active]    │
│  ⚠ ElevenLabs (Premium TTS)       Not Set  [Mock Mode] │
├────────────────────────────────────────────────────────┤
│  [⚙ Configure Keys in Settings →]                      │
└────────────────────────────────────────────────────────┘
```

### 4.3 Tooltip Styling Classes

```tsx
className="z-50 w-72 rounded-xl border border-border/60 bg-popover/95 dark:bg-zinc-950/95 p-3.5 text-popover-foreground shadow-2xl backdrop-blur-xl transition-all animate-in fade-in zoom-in-95 duration-150"
```

### 4.4 Quick Settings Shortcut

Next to the status pill, a subtle gear icon button allows jumping straight to `/settings?category=...`:

```tsx
<Link
  href="/settings"
  onClick={(e) => e.stopPropagation()}
  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
  title="Manage API Keys"
  aria-label="Open Settings"
>
  <Settings className="w-3.5 h-3.5" />
</Link>
```

---

## 5. Responsive Grid Layout Architecture

### 5.1 Breakpoint Distribution for 10 Cards

| Viewport Width | Breakpoint Class | Columns | Row Layout | Visual Balance |
|----------------|------------------|---------|------------|----------------|
| `< 640px` | `grid-cols-1` | 1 col | 10 rows | Full-width cards with comfortable tap targets (touch-friendly). |
| `640px - 767px` | `sm:grid-cols-2` | 2 cols | 5 rows | 5 even rows of 2 cards. |
| `768px - 1023px` | `md:grid-cols-2 lg:grid-cols-3` | 2 or 3 cols | 5 rows or 3.3 rows | Accommodates sidebar expansion cleanly. |
| `1024px - 1279px` | `lg:grid-cols-3` | 3 cols | 3 rows + 1 row | Clean, readable 3-column masonry/grid. |
| `1280px - 1535px` | `xl:grid-cols-4` | 4 cols | 2 rows × 4 + 1 row × 2 | Generous card widths with high information density. |
| `≥ 1536px` | `2xl:grid-cols-5` | 5 cols | 2 rows × 5 cols | **Perfect 2×5 symmetry** across ultra-wide monitors. |

### 5.2 Container Layout Classes

```tsx
<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
  {workflows.map((workflow) => (
    <WorkflowCard key={workflow.id} workflow={workflow} keysState={keysState} />
  ))}
</div>
```

### 5.3 Card Content Height Normalization

To ensure every card in a row has identical height regardless of description length:
- Container uses `flex flex-col justify-between h-full min-h-[260px]`.
- Description uses `line-clamp-2 text-sm text-muted-foreground leading-relaxed`.
- Footer actions pin to the bottom with `mt-auto pt-4 border-t border-border/30`.

---

## 6. One-Click Automatic Mission Prompt Bar Integration

At the top of `/create/page.tsx`, the One-Click Automatic Mission prompt bar is styled with glowing glassmorphism:

```tsx
{/* Automatic Mission Mode Hero Input */}
<div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-card/80 to-fuchsia-500/10 p-5 backdrop-blur-xl shadow-lg shadow-violet-500/5">
  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
    <div className="relative flex-1 flex items-center">
      <Sparkles className="absolute left-3.5 w-5 h-5 text-violet-500 pointer-events-none" />
      <input
        type="text"
        placeholder="Type any video topic & hit Enter for 1-click auto generation (e.g., 'How black holes warp spacetime')..."
        className="w-full rounded-xl border border-border/50 bg-background/80 py-3 pl-11 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 backdrop-blur-md transition-all"
      />
    </div>
    <button
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/25 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all"
    >
      <Zap className="w-4 h-4" />
      Auto Generate
    </button>
  </div>
  
  {/* Suggestion Chips */}
  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
    <span className="font-semibold text-foreground/80">Try:</span>
    {["Ancient Roman Engineering", "5 Psychology Tricks", "Quantum Computing in 60s", "Cyberpunk Tech News"].map((topic) => (
      <button
        key={topic}
        className="rounded-lg border border-border/40 bg-accent/40 px-2.5 py-1 hover:bg-accent hover:text-foreground transition-colors"
      >
        {topic}
      </button>
    ))}
  </div>
</div>
```

---

## 7. Recommended Component Code Architecture

### 7.1 Proposed File Layout
- `app/(app)/create/page.tsx`: Orchestrates state fetching (`/api/settings/keys`), renders Hero Prompt Bar, Filter tabs (optional), and the 10 Workflow Cards.
- `app/(app)/create/components/WorkflowCard.tsx`: Standalone glassmorphic card component with Framer Motion hover animations, glow accents, and status badge.
- `app/(app)/create/components/WorkflowStatusTooltip.tsx`: Accessible hover popover displaying specific required API keys and active statuses.
- `app/(app)/create/components/MissionPromptBar.tsx`: Single prompt input with fast auto-pilot submission and suggestion tags.
- `lib/types/workflows.ts`: Type definitions for workflow metadata, provider dependencies, and cost tiers.

---

## 8. Summary of Findings & Implementation Guidelines

1. **Glassmorphism Harmony**: Utilizing `bg-card/70 dark:bg-zinc-900/60 backdrop-blur-xl border-border/50` ensures complete visual continuity with the existing sidebar and dashboard cards.
2. **Icon Clarity**: Every workflow has an unambiguous Lucide icon (`Video`, `Image`, `Film`, `BookOpen`, `Layers`, `Scissors`, `Clapperboard`, `Sparkles`, `UserCheck`, `PenTool`).
3. **Status Transparency**: Users immediately see whether a workflow can be run with live production keys or fallback mock providers without guessing or hitting unexpected errors during generation.
4. **Responsive Precision**: Perfect 5-column layout on 2xl displays, scalable down to single column on mobile screens with uniform flex heights.
