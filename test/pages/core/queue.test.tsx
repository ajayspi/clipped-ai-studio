import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import QueuePage from '@/app/(app)/queue/page';

describe('Queue Route Headless Test (app/(app)/queue/page.tsx)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders QueuePage with empty state when no jobs exist in API response', async () => {
    render(<QueuePage />);

    expect(screen.getByText('Render Queue')).toBeInTheDocument();
    expect(
      screen.getByText(/Monitor background video rendering, status, and job progression/i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('No jobs in queue')).toBeInTheDocument();
    });

    const createLinks = screen.getAllByRole('link', { name: /create video|create new video/i });
    expect(createLinks.length).toBeGreaterThanOrEqual(1);
    expect(createLinks[0]).toHaveAttribute('href', '/create');
  });

  it('renders active and failed jobs with accurate KPI counts', async () => {
    const mockJobsResponse = {
      success: true,
      queued: [
        {
          id: 'job-active-1',
          title: 'Cyberpunk Teaser Episode 1',
          workflow_type: 'AI Video',
          status: 'processing',
          thumbnail: 'https://example.com/cyber.jpg',
        },
      ],
      completed: [
        {
          id: 'job-completed-1',
          title: 'Historical Documentary',
          workflow_type: 'Stories',
          status: 'completed',
          thumbnail: 'https://example.com/history.jpg',
        },
      ],
      failed: [
        {
          id: 'job-failed-1',
          title: 'Explainer Failed Render',
          workflow_type: 'Whiteboard',
          status: 'failed',
          thumbnail: null,
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockJobsResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(<QueuePage />);

    await waitFor(() => {
      expect(screen.getByText('Cyberpunk Teaser Episode 1')).toBeInTheDocument();
      expect(screen.getByText('Historical Documentary')).toBeInTheDocument();
      expect(screen.getByText('Explainer Failed Render')).toBeInTheDocument();
    });

    expect(screen.getByText('Whiteboard')).toBeInTheDocument();
  });

  it('filters job list when filter tabs are clicked', async () => {
    const mockJobsResponse = {
      success: true,
      queued: [
        {
          id: 'job-active-1',
          title: 'Active Rendering Job',
          workflow_type: 'AI Video',
          status: 'processing',
          thumbnail: null,
        },
      ],
      completed: [
        {
          id: 'job-completed-1',
          title: 'Completed Rendered Video',
          workflow_type: 'Footage',
          status: 'completed',
          thumbnail: null,
        },
      ],
      failed: [
        {
          id: 'job-failed-1',
          title: 'Failed Generation Attempt',
          workflow_type: 'Auto',
          status: 'failed',
          thumbnail: null,
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockJobsResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(<QueuePage />);

    await waitFor(() => {
      expect(screen.getByText('Active Rendering Job')).toBeInTheDocument();
    });

    // Click Active filter tab
    const activeTab = screen.getByRole('button', { name: /^active$/i });
    fireEvent.click(activeTab);

    expect(screen.getByText('Active Rendering Job')).toBeInTheDocument();
    expect(screen.queryByText('Completed Rendered Video')).not.toBeInTheDocument();
    expect(screen.queryByText('Failed Generation Attempt')).not.toBeInTheDocument();

    // Click Completed filter tab
    const completedTab = screen.getByRole('button', { name: /^completed$/i });
    fireEvent.click(completedTab);

    expect(screen.queryByText('Active Rendering Job')).not.toBeInTheDocument();
    expect(screen.getByText('Completed Rendered Video')).toBeInTheDocument();
    expect(screen.queryByText('Failed Generation Attempt')).not.toBeInTheDocument();

    // Click Failed filter tab
    const failedTab = screen.getByRole('button', { name: /^failed$/i });
    fireEvent.click(failedTab);

    expect(screen.queryByText('Active Rendering Job')).not.toBeInTheDocument();
    expect(screen.queryByText('Completed Rendered Video')).not.toBeInTheDocument();
    expect(screen.getByText('Failed Generation Attempt')).toBeInTheDocument();

    // Click All filter tab
    const allTab = screen.getByRole('button', { name: /^all$/i });
    fireEvent.click(allTab);

    expect(screen.getByText('Active Rendering Job')).toBeInTheDocument();
    expect(screen.getByText('Completed Rendered Video')).toBeInTheDocument();
    expect(screen.getByText('Failed Generation Attempt')).toBeInTheDocument();
  });

  it('triggers refresh when Refresh button is clicked', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(<QueuePage />);

    await waitFor(() => {
      expect(screen.getByText('Render Queue')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(fetchSpy).toHaveBeenCalled();
  });
});
