# supabase

## Overview
Database subsystem containing Supabase PostgreSQL migration scripts, table schemas, worker lease locking protocols, and circuit breaker health tracking.

## Interface
- ./migrations/README.md

## Invariants
- Database migrations must be strictly idempotent and applied sequentially.
- Worker concurrency and job leasing must adhere to claim_render_job locking protocol without orphaned leases.

## Side Effects
- Manages core persistent database schemas, real-time event streaming publications, storage buckets, and RPC functions in Supabase PostgreSQL.

## Verification
- Run: `pnpm test`
