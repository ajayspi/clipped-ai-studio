# ui

## Overview
Core reusable primitive UI component library built on Radix UI primitives and Class Variance Authority (CVA).

## Interface
- [button.tsx:Button] - Polymorphic button component supporting variant styles, sizes, and delegation via Radix UI Slot.Root.
- [button.tsx:buttonVariants] - CVA helper generating Tailwind CSS class strings for button variants (default, destructive, outline, secondary, ghost, link) and sizes (default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg).

## Invariants
- [button.tsx:asChild] - When asChild is true, delegates element rendering to Radix UI Slot.Root instead of rendering a native <button>.
- [button.tsx:aria-invalid] - Automatically applies destructive focus-visible and border styles when aria-invalid evaluates to true.

## Side Effects
- None

## Verification
- Run: `pnpm test`
