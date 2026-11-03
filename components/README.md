# components

## Overview
Subtree root containing application shell layouts, navigation controls, theme providers, and global background queue indicators.

## Interface
- [sidebar.tsx:Sidebar] - Collapsible desktop sidebar navigation bar with active route highlighting, workflow links, and persistent collapse state.
- [MobileNav.tsx:MobileNav] - Slide-out navigation drawer for mobile viewports with route change auto-close.
- [theme-provider.tsx:ThemeProvider] - Next-themes wrapper configuring hydration-safe script attributes for React 19 compatibility.
- [theme-toggle.tsx:ThemeToggle] - Button component toggling light and dark theme modes.
- [RenderQueueIndicator.tsx:RenderQueueIndicator] - Header status badge displaying live active background render jobs count.
- [auth](./auth/README.md) - User authentication form components.
- [create](./create/README.md) - Workflow catalog, prompt bar, and key evaluation components.
- [dashboard](./dashboard/README.md) - Dashboard video cards, workspace management, and publishing dialogs.
- [planner](./planner/README.md) - Social post scheduling modal and calendar components.
- [settings](./settings/README.md) - OmniRoute gateway monitoring and health probe hub.
- [timeline](./timeline/README.md) - NLE beat editor with undo/redo and live progress streaming.
- [ui](./ui/README.md) - Core Radix UI and CVA primitive components.
- [wizard](./wizard/README.md) - 5-step video generation wizard flow and live player.
- [workflow-builder](./workflow-builder/README.md) - Node-based visual pipeline graph editor.

## Invariants
- [theme-provider.tsx:SCRIPT_PROPS] - Injects type: 'text/javascript' on server and 'text/plain' on client to prevent React 19 script-tag rendering errors.
- [MobileNav.tsx:pathname] - Compares pathname !== prevPathname during render to close drawer on navigation without effect cascades.
- [sidebar.tsx:isCollapsed] - Persists sidebar collapse state in localStorage under key clipped_sidebar_collapsed.

## Side Effects
- [RenderQueueIndicator.tsx:poll] - Polls /api/jobs?limit=20 every 10 seconds via setInterval.
- [sidebar.tsx:localStorage] - Reads and writes clipped_sidebar_collapsed in browser localStorage.
- [theme-toggle.tsx:setTheme] - Mutates active document theme via next-themes.

## Verification
- Run: `pnpm test`
