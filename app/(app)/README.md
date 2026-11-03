# (app)

## Overview
Root layout shell for the authenticated application, providing responsive glassmorphism desktop/mobile navigation and ambient glow styling.

## Interface
- [layout.tsx:default] AppLayout React component wrapping child routes in responsive sidebar and header chrome
- [./dashboard/README.md:dashboard] Relative link to dashboard contract
- [./library/README.md:library] Relative link to video library and workspace manager contract
- [./planner/README.md:planner] Relative link to content calendar planner contract
- [./queue/README.md:queue] Relative link to render queue dashboard contract
- [./settings/README.md:settings] Relative link to studio settings and OmniRoute hub contract
- [./assets/README.md:assets] Relative link to generative asset and shot manager contract
- [./models/README.md:models] Relative link to model and resource manager contract
- [./editor/README.md:editor] Relative link to visual pipeline editor contract
- [./create/README.md:create] Relative link to studio creation hub contract

## Invariants
- [layout.tsx:AppLayout] Desktop sidebar rendered only at md breakpoint and above; mobile header sticky at top on mobile
- [layout.tsx:AppLayout] Main viewport container constrained to h-[calc(100vh-3.5rem)] on mobile and h-screen on desktop

## Side Effects
- [layout.tsx:RenderQueueIndicator] Renders live queue polling indicator displaying active job count in application header

## Verification
- Run: `pnpm test`
