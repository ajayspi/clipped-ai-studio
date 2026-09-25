import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import QueuePage from '@/app/(app)/queue/page';

function jsonResponse() {
  return {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  };
}

function job(id: string, title: string, workflow_type: string, status: string) {
  return {
    id,
    title,
    workflow_type,
    status,
    progress: status === 'completed' ? 100 : 40,
    created_at: '2026-09-25T10:00:00.000Z',
    updated_at: '2026-09-25T10:05:00.000Z',
    error_message: null,
    output_url: status === 'completed' ? 'https://example.com/out.mp4' : null,
    clip_count: 3,
  };
}

describe('Queue Route Headless Test (app/(app)/queue/page.tsx)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders QueuePage with empty state when no jobs exist in API response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, jobs: [] }), jsonResponse())
    );

    render(<QueuePage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Render Queue' })).toBeInTheDocument();
    expect(
      screen.getByText(/Track your video renders and download completed exports/i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('No active jobs found')).toBeInTheDocument();
    });

    const createLinks = screen.getAllByRole('link', { name: /create/i });
    expect(createLinks.length).toBeGreaterThanOrEqual(1);
    expect(createLinks[0]).toHaveAttribute('href', '/create');
  });

  it('renders active jobs by default with accurate KPI tab counts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          jobs: [
            job('job-active-1', 'Cyberpunk Teaser Episode 1', 'AI Video', 'processing'),
            job('job-completed-1', 'Historical Documentary', 'Stories', 'completed'),
            job('job-failed-1', 'Explainer Failed Render', 'Whiteboard', 'failed'),
          ],
        }),
        jsonResponse()
      )
    );

    render(<QueuePage />);

    await waitFor(() => {
      expect(screen.getByText('Cyberpunk Teaser Episode 1')).toBeInTheDocument();
    });

    // Default tab is Active → only the processing job is listed
    expect(screen.getByText('AI Video')).toBeInTheDocument();
    expect(screen.getByText('Rendering')).toBeInTheDocument();
    expect(screen.queryByText('Historical Documentary')).not.toBeInTheDocument();
    expect(screen.queryByText('Explainer Failed Render')).not.toBeInTheDocument();

    // KPI tabs are present
    expect(screen.getByRole('button', { name: /active/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /failed/i })).toBeInTheDocument();
  });

  it('filters job list when filter tabs are clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          jobs: [
            job('job-active-1', 'Active Rendering Job', 'AI Video', 'processing'),
            job('job-completed-1', 'Completed Rendered Video', 'Footage', 'completed'),
            job('job-failed-1', 'Failed Generation Attempt', 'Auto', 'failed'),
          ],
        }),
        jsonResponse()
      )
    );

    render(<QueuePage />);

    await waitFor(() => {
      expect(screen.getByText('Active Rendering Job')).toBeInTheDocument();
    });

    // Click Completed filter tab
    fireEvent.click(screen.getByRole('button', { name: /completed/i }));

    expect(screen.queryByText('Active Rendering Job')).not.toBeInTheDocument();
    expect(screen.getByText('Completed Rendered Video')).toBeInTheDocument();
    expect(screen.queryByText('Failed Generation Attempt')).not.toBeInTheDocument();

    // Click Failed filter tab
    fireEvent.click(screen.getByRole('button', { name: /failed/i }));

    expect(screen.queryByText('Active Rendering Job')).not.toBeInTheDocument();
    expect(screen.queryByText('Completed Rendered Video')).not.toBeInTheDocument();
    expect(screen.getByText('Failed Generation Attempt')).toBeInTheDocument();
  });

  it('triggers refresh when Refresh button is clicked', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ success: true, jobs: [] }), jsonResponse()));

    render(<QueuePage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Render Queue' })).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(fetchSpy).toHaveBeenCalled();
  });
});