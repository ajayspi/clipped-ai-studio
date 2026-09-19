import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LibraryPage from '@/app/(app)/library/page';

describe('Library Route Headless Test (app/(app)/library/page.tsx)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Library with empty state when no videos exist', async () => {
    render(<LibraryPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /library/i })).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Organize, filter, and manage your AI video assets/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new folder/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create video/i })).toHaveAttribute(
      'href',
      '/create/footage'
    );

    // Empty state container
    expect(screen.getByText('No videos in this workspace')).toBeInTheDocument();
    expect(
      screen.getByText(/Move existing videos into this folder or generate a new AI video/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /generate video/i })).toHaveAttribute(
      'href',
      '/create/footage'
    );

    // All Videos chip
    expect(screen.getByRole('button', { name: /all videos/i })).toBeInTheDocument();
  });

  it('renders populated video cards and workspace tabs when data exists', async () => {
    const mockWorkspaces = [
      { id: 'ws-marketing', name: 'Marketing Ads', color: '#8b5cf6', videoCount: 1 },
      { id: 'ws-tiktok', name: 'TikTok Drops', color: '#ec4899', videoCount: 1 },
    ];

    const mockJobsResponse = {
      success: true,
      queued: [],
      failed: [],
      completed: [
        {
          id: 'vid-1',
          video_id: 'vid-1',
          title: 'High Converting SaaS Ad',
          workflow_type: 'AI Video',
          status: 'completed',
          workspace_id: 'ws-marketing',
          thumbnail: 'https://example.com/saas.jpg',
        },
        {
          id: 'vid-2',
          video_id: 'vid-2',
          title: 'Viral Dance Meme',
          workflow_type: 'Shorts',
          status: 'completed',
          workspace_id: 'ws-tiktok',
          thumbnail: 'https://example.com/dance.jpg',
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/workspaces')) {
        return new Response(JSON.stringify({ success: true, workspaces: mockWorkspaces }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/jobs')) {
        return new Response(JSON.stringify(mockJobsResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    render(<LibraryPage />);

    await waitFor(() => {
      expect(screen.getByText('High Converting SaaS Ad')).toBeInTheDocument();
      expect(screen.getByText('Viral Dance Meme')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /marketing ads/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tiktok drops/i })).toBeInTheDocument();
  });

  it('filters video cards when clicking different workspace chips', async () => {
    const mockWorkspaces = [
      { id: 'ws-marketing', name: 'Marketing Ads', color: '#8b5cf6' },
      { id: 'ws-tiktok', name: 'TikTok Drops', color: '#ec4899' },
    ];

    const mockJobsResponse = {
      success: true,
      queued: [],
      failed: [],
      completed: [
        {
          id: 'vid-1',
          title: 'High Converting SaaS Ad',
          status: 'completed',
          workspace_id: 'ws-marketing',
          thumbnail: null,
        },
        {
          id: 'vid-2',
          title: 'Viral Dance Meme',
          status: 'completed',
          workspace_id: 'ws-tiktok',
          thumbnail: null,
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/workspaces')) {
        return new Response(JSON.stringify({ success: true, workspaces: mockWorkspaces }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/jobs')) {
        return new Response(JSON.stringify(mockJobsResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    render(<LibraryPage />);

    await waitFor(() => {
      expect(screen.getByText('High Converting SaaS Ad')).toBeInTheDocument();
      expect(screen.getByText('Viral Dance Meme')).toBeInTheDocument();
    });

    // Filter to Marketing Ads only
    fireEvent.click(screen.getByRole('button', { name: /marketing ads/i }));

    expect(screen.getByText('High Converting SaaS Ad')).toBeInTheDocument();
    expect(screen.queryByText('Viral Dance Meme')).not.toBeInTheDocument();

    // Filter to TikTok Drops only
    fireEvent.click(screen.getByRole('button', { name: /tiktok drops/i }));

    expect(screen.queryByText('High Converting SaaS Ad')).not.toBeInTheDocument();
    expect(screen.getByText('Viral Dance Meme')).toBeInTheDocument();

    // Reset to All Videos
    fireEvent.click(screen.getByRole('button', { name: /all videos/i }));

    expect(screen.getByText('High Converting SaaS Ad')).toBeInTheDocument();
    expect(screen.getByText('Viral Dance Meme')).toBeInTheDocument();
  });

  it('renders live rendering queue panel when queued or failed jobs exist', async () => {
    const mockJobsResponse = {
      success: true,
      completed: [],
      queued: [
        {
          id: 'q-job-1',
          title: 'Documentary In Progress',
          workflow_type: 'Stories',
          status: 'processing',
          thumbnail: null,
        },
      ],
      failed: [
        {
          id: 'f-job-2',
          title: 'Avatar Generation Failed',
          workflow_type: 'Avatar',
          status: 'failed',
          thumbnail: null,
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/jobs')) {
        return new Response(JSON.stringify(mockJobsResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, workspaces: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    render(<LibraryPage />);

    await waitFor(() => {
      expect(screen.getByText('Rendering Queue')).toBeInTheDocument();
    });

    expect(screen.getByText('Documentary In Progress')).toBeInTheDocument();
    expect(screen.getByText('Avatar Generation Failed')).toBeInTheDocument();
    expect(screen.getByText(/1 active/i)).toBeInTheDocument();
    expect(screen.getByText(/1 failed/i)).toBeInTheDocument();
  });

  it('opens and closes New Folder modal', async () => {
    render(<LibraryPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new folder/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /new folder/i }));

    await waitFor(() => {
      expect(screen.getByText('Create New Workspace')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/e\.g\. Q3 Fitness Series/i)).toBeInTheDocument();

    // Click Cancel button
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Create New Workspace')).not.toBeInTheDocument();
    });
  });
});
