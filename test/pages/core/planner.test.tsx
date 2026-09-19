import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlannerPage from '@/app/(app)/planner/page';
import { supabase } from '@/lib/db';
import { format } from 'date-fns';

describe('Planner Route Headless Test (app/(app)/planner/page.tsx)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Content Calendar week view with empty state when no posts are scheduled', async () => {
    const page = await PlannerPage();
    render(page);

    expect(screen.getByText('Content Calendar')).toBeInTheDocument();
    expect(
      screen.getByText(/Schedule and automate your AI video distribution/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /schedule post/i })).toBeInTheDocument();

    const emptySlots = screen.getAllByText('No posts scheduled');
    expect(emptySlots.length).toBe(7);

    const todayDayNumber = format(new Date(), 'd');
    expect(screen.getByText(todayDayNumber)).toBeInTheDocument();
  });

  it('renders scheduled posts in calendar days when data exists', async () => {
    const todayIso = new Date().toISOString();
    const mockScheduled = [
      {
        id: 'post-test-1',
        scheduled_for: todayIso,
        status: 'pending',
        caption: 'Viral Tech Breakthrough',
        platforms: ['youtube', 'tiktok'],
        render_jobs: {
          logs: JSON.stringify({ subject: 'Tech Breakthrough' }),
        },
      },
    ];

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'scheduled_posts') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockScheduled, error: null }),
        } as any;
      }
      return {} as any;
    });

    const page = await PlannerPage();
    render(page);

    expect(screen.getByText('Content Calendar')).toBeInTheDocument();
    expect(screen.getByText('Viral Tech Breakthrough')).toBeInTheDocument();
    expect(screen.getByText('youtube')).toBeInTheDocument();
    expect(screen.getByText('tiktok')).toBeInTheDocument();
  });

  it('handles invalid or malformed scheduled_for dates defensively without throwing RangeError', async () => {
    const mockScheduled = [
      {
        id: 'post-corrupt-date-1',
        scheduled_for: 'invalid-date-string-value',
        status: 'pending',
        caption: 'Corrupted Date Post',
        platforms: ['instagram'],
      },
      {
        id: 'post-null-date-2',
        scheduled_for: null,
        status: 'failed',
        caption: 'Null Date Post',
        platforms: ['x'],
      },
    ];

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'scheduled_posts') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockScheduled, error: null }),
        } as any;
      }
      return {} as any;
    });

    // Must execute cleanly without date-fns RangeError: Invalid time value
    const page = await PlannerPage();
    expect(() => render(page)).not.toThrow();

    expect(screen.getByText('Content Calendar')).toBeInTheDocument();
    const emptySlots = screen.getAllByText('No posts scheduled');
    expect(emptySlots.length).toBe(7);
  });
});
