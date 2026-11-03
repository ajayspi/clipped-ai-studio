import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import CreateHubPage from '@/app/(app)/create/page';
import TwoDStudioLandingPage from '@/app/(app)/create/2d/page';
import CampaignStudioLandingPage from '@/app/(app)/create/campaign/page';
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

  it('renders header, dynamic Workflows badge, Refresh Keys button, and API Settings link', async () => {
    render(<CreateHubPage />);

    expect(screen.getByRole('heading', { level: 1, name: /create studio/i })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${WORKFLOWS.length} Workflows`, 'i'))).toBeInTheDocument();
    expect(
      screen.getByText(/choose an ai generation workflow or use 1-click auto pilot/i)
    ).toBeInTheDocument();

    const refreshBtn = screen.getByRole('button', { name: /refresh keys/i });
    expect(refreshBtn).toBeInTheDocument();

    const settingsLink = screen.getByRole('link', { name: /api settings/i });
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute('href', '/settings');
  });

  it('renders the 4 signature studios with hero cards', async () => {
    render(<CreateHubPage />);

    expect(screen.getByRole('heading', { level: 2, name: /the 4 signature studios/i })).toBeInTheDocument();
    expect(screen.getByText('Social Shorts Studio')).toBeInTheDocument();
    expect(screen.getByText('Cinema & Drama Studio')).toBeInTheDocument();
    expect(screen.getByText('2D & Explainer Studio')).toBeInTheDocument();
    expect(screen.getByText('Campaign & Newsroom Studio')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /social shorts studio/i })).toHaveAttribute('href', '/create/shorts');
    expect(screen.getByRole('link', { name: /cinema & drama studio/i })).toHaveAttribute('href', '/create/cinema');
    expect(screen.getByRole('link', { name: /2d & explainer studio/i })).toHaveAttribute('href', '/create/stick-figure');
    expect(screen.getByRole('link', { name: /campaign & newsroom studio/i })).toHaveAttribute('href', '/create/bulk');
  });

  it('renders all workflow pipeline cards', async () => {
    render(<CreateHubPage />);

    expect(screen.getByRole('heading', { level: 2, name: /video generation pipelines/i })).toBeInTheDocument();

    // Verify each workflow title is present
    for (const wf of WORKFLOWS) {
      const titleEls = screen.getAllByText(wf.title);
      expect(titleEls.length).toBeGreaterThan(0);
      expect(screen.getByText(wf.description)).toBeInTheDocument();
    }

    // Verify each workflow has a link pointing to its href
    for (const wf of WORKFLOWS) {
      const escapedTitle = wf.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const cardLinks = screen.getAllByRole('link', { name: new RegExp(escapedTitle, 'i') });
      expect(cardLinks.length).toBeGreaterThan(0);
      expect(cardLinks.some((l) => l.getAttribute('href') === wf.href)).toBe(true);
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

    // Click "2D & Explainers" category
    const twoDCatBtn = screen.getByRole('button', { name: /2d & explainers/i });
    fireEvent.click(twoDCatBtn);

    expect(screen.getByText('Avatar to Video')).toBeInTheDocument();
    expect(screen.getByText('Whiteboard Animation')).toBeInTheDocument();
    expect(screen.getByText('2D Stick Figure Studio')).toBeInTheDocument();
    expect(screen.getByText('AI Podcast Studio')).toBeInTheDocument();
    expect(screen.getByText('Code Explainer Studio')).toBeInTheDocument();
    expect(screen.queryByText('Stock Footage Video')).not.toBeInTheDocument();
    expect(screen.queryByText('AI Videos')).not.toBeInTheDocument();

    // Click "Social Shorts" category
    const shortsCatBtn = screen.getByRole('button', { name: /social shorts/i });
    fireEvent.click(shortsCatBtn);

    expect(screen.getByText('Stock Footage Video')).toBeInTheDocument();
    expect(screen.getByText('Reddit & Thread Shorts')).toBeInTheDocument();
    expect(screen.queryByText('Avatar to Video')).not.toBeInTheDocument();

    // Click "Cinema & Drama" category
    const cinemaCatBtn = screen.getByRole('button', { name: /cinema & drama/i });
    fireEvent.click(cinemaCatBtn);

    expect(screen.getByText('Cinema Studio (Director Mode)')).toBeInTheDocument();
    expect(screen.getByText('3D Camera Previs')).toBeInTheDocument();
    expect(screen.getByText('Script Breakdown & Tension')).toBeInTheDocument();
    expect(screen.getByText('Micro-Drama')).toBeInTheDocument();
    expect(screen.queryByText('Avatar to Video')).not.toBeInTheDocument();
    expect(screen.queryByText('Stock Footage Video')).not.toBeInTheDocument();

    // Click "Campaigns & Automation" category
    const campaignCatBtn = screen.getByRole('button', { name: /campaigns & automation/i });
    fireEvent.click(campaignCatBtn);

    expect(screen.getByText('Zero-Click Newsroom & Bulk Planner')).toBeInTheDocument();
    expect(screen.getByText('Declarative YAML Pipelines')).toBeInTheDocument();
    expect(screen.getByText('Spatial Video Outpainting')).toBeInTheDocument();
    expect(screen.queryByText('Micro-Drama')).not.toBeInTheDocument();
    expect(screen.queryByText('Avatar to Video')).not.toBeInTheDocument();

    // Return to "All Pipelines"
    const allCatBtn = screen.getByRole('button', { name: /all pipelines/i });
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

    // Status filter buttons (Ready / Fallback / Unset)
    const fallbackPill = screen.getByRole('button', { name: /fallback/i });
    expect(fallbackPill).toBeInTheDocument();

    // Toggle fallback filter
    fireEvent.click(fallbackPill);
    expect(screen.getByText('Stock Footage Video')).toBeInTheDocument();

    // Toggle off fallback filter
    fireEvent.click(fallbackPill);
    expect(screen.getByText('Stock Footage Video')).toBeInTheDocument();

    // Toggle ready filter (Deterministic engines: stick-figure and yaml)
    const readyPill = screen.getByRole('button', { name: /ready/i });
    fireEvent.click(readyPill);
    expect(screen.getByText('2D Stick Figure Studio')).toBeInTheDocument();
    expect(screen.getByText('Declarative YAML Pipelines')).toBeInTheDocument();
    expect(screen.queryByText('Stock Footage Video')).not.toBeInTheDocument();

    // Toggle off ready filter
    fireEvent.click(readyPill);
    expect(screen.getByText('Stock Footage Video')).toBeInTheDocument();

    // Toggle unset/error filter (character, v2v have hasFallback: false)
    const unsetPill = screen.getByRole('button', { name: /unset/i });
    fireEvent.click(unsetPill);
    expect(screen.getByText('Character Consistency (IP-Adapter)')).toBeInTheDocument();
    expect(screen.getByText('Video-to-Video Restyle')).toBeInTheDocument();
    expect(screen.queryByText('Stock Footage Video')).not.toBeInTheDocument();

    // Toggle off unset filter
    fireEvent.click(unsetPill);
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

describe('Studio Landing Redirects (/create/2d and /create/campaign)', () => {
  it('/create/2d redirects to /create/stick-figure without searchParams', async () => {
    await expect(TwoDStudioLandingPage({})).rejects.toThrow('NEXT_REDIRECT:/create/stick-figure');
  });

  it('/create/2d preserves searchParams upon redirection', async () => {
    await expect(
      TwoDStudioLandingPage({ searchParams: Promise.resolve({ prompt: 'vector art', style: 'minimal' }) })
    ).rejects.toThrow('NEXT_REDIRECT:/create/stick-figure?prompt=vector+art&style=minimal');
  });

  it('/create/campaign redirects to /create/bulk without searchParams', async () => {
    await expect(CampaignStudioLandingPage({})).rejects.toThrow('NEXT_REDIRECT:/create/bulk');
  });

  it('/create/campaign preserves searchParams upon redirection', async () => {
    await expect(
      CampaignStudioLandingPage({ searchParams: Promise.resolve({ niche: 'crypto', cadence: 'daily' }) })
    ).rejects.toThrow('NEXT_REDIRECT:/create/bulk?niche=crypto&cadence=daily');
  });
});
