# (auth)

## Overview
Root layout container for authentication routes (/login, /register) applying consistent full-screen presentation styling.

## Interface
- [layout.tsx:AuthLayout] Default export layout function accepting { children: React.ReactNode }
- [login] Child route contract at ./login/README.md
- [register] Child route contract at ./register/README.md

## Invariants
- [layout.tsx:AuthLayout] Wraps all child auth routes in a div with 'min-h-screen bg-muted/20'

## Side Effects
- None

## Verification
- Run: `pnpm test`
