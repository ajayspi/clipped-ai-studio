import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/(app)/dashboard/page';
import { supabase } from '@/lib/db';

describe('Dashboard Route Headless Test (app/(app)/dashboard/page.tsx)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Studio Dashboard with empty state when no jobs exist in database', async () => {
    const page = await DashboardPage();
    render(page);

    expect(screen.getByText('Studio Dashboard')).toBeInTheDocument();
    expect(
      screen.getByText(/Manage, view, and publish your rendered short-form videos/i)
    ).toBeInTheDocument();
    expect(screen.getByText('No videos yet')).toBeInTheDocument();
    expect(
      screen.getByText(/Get started by creating your first AI-generated short-form video in the creation wizard/i)
    ).toBeInTheDocument();

    const viewWorkspacesLink = screen.getByRole('link', { name: /view workspaces/i });
    expect(viewWorkspacesLink).toHaveAttribute('href', '/library');

    const createVideoLinks = screen.getAllByRole('link', { name: /create new video/i });
    expect(createVideoLinks.length).toBeGreaterThanOrEqual(1);
    expect(createVideoLinks[0]).toHaveAttribute('href', '/create/footage');
  });

  it('renders video cards when jobs exist in database', async () => {
    const mockJobs = [
      {
        id: 'job-cyberpunk-1234',
        status: 'completed',
        logs: JSON.stringify({
          subject: 'AI Cyberpunk City',
          workflowType: 'AI Videos',
          videos: [{ thumbnail: 'https://example.com/cyberpunk.jpg' }],
        }),
        created_at: '2026-09-17T00:00:00.000Z',
      },
      {
        id: 'job-history-5678',
        status: 'completed',
        logs: JSON.stringify({
          subject: 'Ancient Rome Secrets',
          workflowType: 'Stories',
          videos: [{ thumbnail: 'https://example.com/rome.jpg' }],
        }),
        created_at: '2026-09-17T01:00:00.000Z',
      },
    ];

    const mockWorkspaces = [
      { id: 'ws-marketing', name: 'Product Marketing', color: '#8b5cf6' },
    ];

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'render_jobs') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
        } as any;
      }
      if (table === 'workspaces') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockWorkspaces, error: null }),
        } as any;
      }
      return {} as any;
    });

    const page = await DashboardPage();
    render(page);

    expect(screen.getByText('Studio Dashboard')).toBeInTheDocument();
    expect(screen.getByText('AI Cyberpunk City')).toBeInTheDocument();
    expect(screen.getByText('Ancient Rome Secrets')).toBeInTheDocument();
    expect(screen.queryByText('No videos yet')).not.toBeInTheDocument();
  });

  it('handles malformed logs JSON gracefully without crashing', async () => {
    const mockJobs = [
      {
        id: 'job-corrupted-9999',
        status: 'completed',
        logs: '{ invalid json corrupt payload',
        created_at: '2026-09-17T02:00:00.000Z',
      },
    ];

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'render_jobs') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
        } as any;
      }
      if (table === 'workspaces') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any;
      }
      return {} as any;
    });

    const page = await DashboardPage();
    render(page);

    // Fallback title uses slice(0, 8) of id: "Job job-corr"
    expect(screen.getByText('Job job-corr')).toBeInTheDocument();
  });
});
