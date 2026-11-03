# planner

## Overview
Content calendar view presenting automated video publication schedules across platforms in a 7-day rolling week layout.

## Interface
- [page.tsx:default] PlannerPage async React Server Component
- [page.tsx:dynamic] force-dynamic route segment configuration with revalidate = 0

## Invariants
- [page.tsx:weekDays] Generates a 7-day calendar window starting from current wall-clock date
- [page.tsx:posts] Groups posts by matching scheduled_for timestamp to calendar day via isSameDay helper

## Side Effects
- [page.tsx:supabase] Performs server-side SELECT on Supabase scheduled_posts table joining render_jobs(logs)

## Verification
- Run: `pnpm test`
