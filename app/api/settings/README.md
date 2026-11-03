# settings

## Overview
Subsystem grouping for application settings, AI provider credentials, health monitoring, and Supabase database diagnostics.

## Interface
- keys: ./keys/README.md
- health: ./health/README.md
- supabase: ./supabase/README.md

## Invariants
- [settings:schema] Enforces valid settings column writes without non-existent base_url columns

## Side Effects
- None

## Verification
- Run: `pnpm test`
