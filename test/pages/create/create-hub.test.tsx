import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import CreateHubPage from '@/app/(app)/create/page';
import { WORKFLOWS } from '@/components/create/workflow-definitions';

describe('Create Hub Route (app/(app)/create/page.tsx)', () => {
  let router: ReturnType<typeof useRouter>;

  beforeEach(() => {
    vi.clearAllMocks();
    router = useRouter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mounts cleanly without throwing exceptions', () => {
    expect(() => render(<CreateHubPage />)).not.toThrow();
  });

  it('renders header, 10 Workflows badge, Refresh Keys button, and API Settings link', async () => {
    render(<CreateHubPage />);

    expect(screen.getByRole('heading', { level: 1, name: /create studio/i })).toBeInTheDocument();
    expect(screen.getByText(/10 Workflows/i)).toBeInTheDocument();
    expect(
      screen.getByText(/choose an ai generation workflow or use 1-click auto pilot/i)
    ).toBeInTheDocument();

    const refreshBtn = screen.getByRole('button', { name: /refresh keys/i });
    expect(refreshBtn).toBeInTheDocument();

    const settingsLink = screen.getByRole('link', { name: /api settings/i });
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute('href', '/settings');
  });

  it('renders all 10 workflow pipeline cards', async () => {
    render(<CreateHubPage />);

    expect(screen.getByRole('heading', { level: 2, name: /video generation pipelines/i })).toBeInTheDocument();

    // Verify each workflow title is present
    for (const wf of WORKFLOWS) {
      expect(screen.getByText(wf.title)).toBeInTheDocument();
      expect(screen.getByText(wf.description)).toBeInTheDocument();
    }

    // Verify each workflow has a link pointing to its href
    for (const wf of WORKFLOWS) {
      const cardLink = screen.getByRole('link', { name: new RegExp(wf.title, 'i') });
      expect(cardLink).toHaveAttribute('href', wf.href);
    }
  });

  it('handles suggestion chips and one-click automatic mission submission', async () => {
    const originalFetch = global.fetch;
    const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/api/workflows/mission') && init?.method === 'POST') {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, jobId: 'mission-job-999' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return originalFetch(url, init);
    });
    global.fetch = fetchSpy;

    render(<CreateHubPage />);

    const input = screen.getByPlaceholderText(/type any video topic & hit enter/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();

    // Suggestion chips
    const chip = screen.getByRole('button', { name: /quantum computing in 60 seconds/i });
    fireEvent.click(chip);
    expect(input.value).toBe('Quantum Computing in 60 Seconds');

    // Click Auto Generate button
    const autoGenBtn = screen.getByRole('button', { name: /auto generate/i });
    expect(autoGenBtn).not.toBeDisabled();
    fireEvent.click(autoGenBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/workflows/mission',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Quantum Computing in 60 Seconds'),
        })
      );
      expect(router.push).toHaveBeenCalledWith('/create/mission/mission-job-999');
    });

    global.fetch = originalFetch;
  });

  it('handles fallback navigation when mission API call fails', async () => {
    const originalFetch = global.fetch;
    const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/api/workflows/mission') && init?.method === 'POST') {
        return Promise.reject(new Error('Network error'));
      }
      return originalFetch(url, init);
    });
    global.fetch = fetchSpy;

    render(<CreateHubPage />);

    const input = screen.getByPlaceholderText(/type any video topic & hit enter/i);
    fireEvent.change(input, { target: { value: 'Black Holes in Space' } });

    const autoGenBtn = screen.getByRole('button', { name: /auto generate/i });
    fireEvent.click(autoGenBtn);

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith(
        expect.stringMatching(/\/create\/mission\/.*prompt=Black%20Holes%20in%20Space&autoStart=true/)
      );
    });

    global.fetch = originalFetch;
  });

  it('filters workflows by category tabs', async () => {
    render(<CreateHubPage />);

    // Click "Avatars & Whiteboards" category
    const avatarCatBtn = screen.getByRole('button', { name: /avatars & whiteboards/i });
    fireEvent.click(avatarCatBtn);

    expect(screen.getByText('Avatar to Video')).toBeInTheDocument();
    expect(screen.getByText('Whiteboard Animation')).toBeInTheDocument();
    expect(screen.queryByText('Stock Footage Video')).not.toBeInTheDocument();
    expect(screen.queryByText('AI Videos')).not.toBeInTheDocument();

    // Click "Stock Footage" category
    const stockCatBtn = screen.getByRole('button', { name: /stock footage/i });
    fireEvent.click(stockCatBtn);

    expect(screen.getByText('Stock Footage Video')).toBeInTheDocument();
    expect(screen.queryByText('Avatar to Video')).not.toBeInTheDocument();

    // Return to "All Workflows"
    const allCatBtn = screen.getByRole('button', { name: /all workflows/i });
    fireEvent.click(allCatBtn);

    expect(screen.getByText('Stock Footage Video')).toBeInTheDocument();
    expect(screen.getByText('Avatar to Video')).toBeInTheDocument();
    expect(screen.getByText('AI Videos')).toBeInTheDocument();
  });

  it('filters workflows by search query and shows empty state with Clear Filters button', async () => {
    render(<CreateHubPage />);

    const searchInput = screen.getByPlaceholderText(/search workflows & models\.\.\./i);

    // Search for "drama"
    fireEvent.change(searchInput, { target: { value: 'drama' } });
    expect(screen.getByText('Micro-Drama')).toBeInTheDocument();
    expect(screen.queryByText('Stock Footage Video')).not.toBeInTheDocument();

    // Search for non-existent keyword
    fireEvent.change(searchInput, { target: { value: 'nonexistentquery12345' } });
    expect(screen.getByText(/no workflows match your filter/i)).toBeInTheDocument();

    // Click "Clear Filters"
    const clearBtn = screen.getByRole('button', { name: /clear filters/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText('Stock Footage Video')).toBeInTheDocument();
    expect(screen.getByText('AI Videos')).toBeInTheDocument();
  });

  it('displays status pills and toggles status filtering', async () => {
    render(<CreateHubPage />);

    // Status filter buttons (Ready / Fallback)
    const fallbackPill = screen.getByRole('button', { name: /fallback/i });
    expect(fallbackPill).toBeInTheDocument();

    // Toggle filter
    fireEvent.click(fallbackPill);
    // All 10 workflows have fallback: true, so they match when keys are missing
    expect(screen.getByText('Stock Footage Video')).toBeInTheDocument();

    // Toggle off
    fireEvent.click(fallbackPill);
    expect(screen.getByText('Stock Footage Video')).toBeInTheDocument();
  });

  it('invokes refresh keys button without errors', async () => {
    render(<CreateHubPage />);

    const refreshBtn = screen.getByRole('button', { name: /refresh keys/i });
    fireEvent.click(refreshBtn);

    // Button remains accessible
    expect(refreshBtn).toBeInTheDocument();
  });
});
