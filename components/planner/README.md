# planner

## Overview
Content scheduling and social publication planner modal for queuing completed videos across social platforms.

## Interface
- [ScheduleModal.tsx:ScheduleModal] - Modal dialog allowing users to pick completed render jobs, draft post captions, select target platforms, and schedule publication timestamps.

## Invariants
- [ScheduleModal.tsx:validation] - Form submission requires valid selectedJob, date, time, and a non-empty platforms array.
- [ScheduleModal.tsx:status] - New entries in scheduled_posts are initialized with status 'pending'.

## Side Effects
- [ScheduleModal.tsx:fetchJobs] - Queries Supabase render_jobs table for completed render jobs upon opening.
- [ScheduleModal.tsx:handleSchedule] - Inserts record into Supabase scheduled_posts table via supabase.from('scheduled_posts').insert and triggers window.location.reload().

## Verification
- Run: `pnpm test`
