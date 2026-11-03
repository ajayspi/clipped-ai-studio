# v1

## Overview
V1 Public Developer REST API subsystem providing authenticated video generation, job polling, and webhook delivery.

## Interface
- generate: ./generate/README.md
- jobs: ./jobs/README.md

## Invariants
- [api:v1] Enforces developer API key authentication on mutation endpoints and UUID primary keys for render_jobs

## Side Effects
- None

## Verification
- Run: `pnpm test`
