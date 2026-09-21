import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/components/wizard/wizard-store';

import AutoPilotPage from '@/app/(app)/create/auto/page';
import BulkPage from '@/app/(app)/create/bulk/page';
import DramaPage from '@/app/(app)/create/drama/page';
import ShortsPage from '@/app/(app)/create/shorts/page';
import UrlToVideoPage from '@/app/(app)/create/url/page';

describe('Creation Generator Routes (app/(app)/create/{auto,bulk,drama,shorts,url}/page.tsx)', () => {
  let router: ReturnType<typeof useRouter>;
  const baseFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    router = useRouter();
    useWizardStore.getState().reset();
    global.fetch = baseFetch;
  });

  afterEach(() => {
    global.fetch = baseFetch;
    vi.restoreAllMocks();
    useWizardStore.getState().reset();
  });

  // ==========================================================================
  // Suite 1: Auto Pilot Page (app/(app)/create/auto/page.tsx)
  // ==========================================================================
  describe('Auto Pilot Route (/create/auto)', () => {
    it('mounts cleanly and renders all form controls', () => {
      render(<AutoPilotPage />);

      expect(screen.getByRole('heading', { level: 1, name: /auto pilot pipeline/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/pipeline identifier name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/content niche & industry focus/i)).toBeInTheDocument();
      expect(screen.getByText(/trending curation source strategy/i)).toBeInTheDocument();
      expect(screen.getByText(/visual generation engine/i)).toBeInTheDocument();
      expect(screen.getByText(/primary target platforms/i)).toBeInTheDocument();
      expect(screen.getByText(/dry run \/ test mode/i)).toBeInTheDocument();

      const deployBtn = screen.getByRole('button', { name: /deploy & activate auto pilot pipeline/i });
      expect(deployBtn).toBeInTheDocument();
      expect(deployBtn).toBeDisabled(); // Disabled until name & niche entered
    });

    it('toggles platforms, dry-run mock mode, and submits to /api/workflows/auto', async () => {
      const originalFetch = global.fetch;
      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/workflows/auto') && init?.method === 'POST') {
          return Promise.resolve(
            new Response(JSON.stringify({ success: true, jobId: 'auto-job-123' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return originalFetch(url, init);
      });
      global.fetch = fetchSpy;

      render(<AutoPilotPage />);

      // Fill in pipeline name & niche
      const nameInput = screen.getByLabelText(/pipeline identifier name/i);
      fireEvent.change(nameInput, { target: { value: 'Tech Daily Auto' } });

      const nicheInput = screen.getByLabelText(/content niche & industry focus/i);
      fireEvent.change(nicheInput, { target: { value: 'Quantum Computing Breakthroughs' } });

      // Toggle platform
      const igBtn = screen.getByRole('button', { name: /instagram reels/i });
      fireEvent.click(igBtn);

      // Toggle mock mode (second checkbox in settings panel)
      const checkboxes = screen.getAllByRole('checkbox');
      const mockCheckbox = checkboxes[1];
      fireEvent.click(mockCheckbox);
      expect(mockCheckbox).toBeChecked();

      // Submit
      const deployBtn = screen.getByRole('button', { name: /deploy & activate auto pilot pipeline/i });
      expect(deployBtn).not.toBeDisabled();
      fireEvent.click(deployBtn);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/workflows/auto',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Tech Daily Auto'),
          })
        );
        expect(router.push).toHaveBeenCalledWith('/dashboard?job=auto-job-123');
      });

      global.fetch = originalFetch;
    });

    it('displays error alert when /api/workflows/auto returns failure', async () => {
      const originalFetch = global.fetch;
      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/workflows/auto')) {
          return Promise.resolve(
            new Response(JSON.stringify({ success: false, error: 'Pipeline quota exceeded' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return originalFetch(url, init);
      });
      global.fetch = fetchSpy;

      render(<AutoPilotPage />);

      fireEvent.change(screen.getByLabelText(/pipeline identifier name/i), { target: { value: 'Test Pipe' } });
      fireEvent.change(screen.getByLabelText(/content niche & industry focus/i), { target: { value: 'Space' } });

      const deployBtn = screen.getByRole('button', { name: /deploy & activate auto pilot pipeline/i });
      fireEvent.click(deployBtn);

      await waitFor(() => {
        expect(screen.getByText(/pipeline quota exceeded/i)).toBeInTheDocument();
      });

      global.fetch = originalFetch;
    });
  });

  // ==========================================================================
  // Suite 2: Bulk Content Planner (app/(app)/create/bulk/page.tsx)
  // ==========================================================================
  describe('Bulk Planner Route (/create/bulk)', () => {
    it('mounts cleanly and renders all form controls', () => {
      render(<BulkPage />);

      expect(screen.getByRole('heading', { level: 1, name: /bulk content planner/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/content niche or industry domain/i)).toBeInTheDocument();
      expect(screen.getByText(/content batch size: 7 videos/i)).toBeInTheDocument();
      expect(screen.getByText(/publishing cadence/i)).toBeInTheDocument();
      expect(screen.getByText(/target distribution platforms/i)).toBeInTheDocument();
    });

    it('adjusts batch size, selects platforms, toggles mock mode, and submits to /api/workflows/bulk-plan', async () => {
      const originalFetch = global.fetch;
      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/workflows/bulk-plan') && init?.method === 'POST') {
          return Promise.resolve(
            new Response(JSON.stringify({ success: true, jobId: 'bulk-job-456' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return originalFetch(url, init);
      });
      global.fetch = fetchSpy;

      render(<BulkPage />);

      // Fill in niche
      const nicheInput = screen.getByLabelText(/content niche or industry domain/i);
      fireEvent.change(nicheInput, { target: { value: 'Productivity & Deep Work' } });

      // Select 14 videos batch size
      const batch14Btn = screen.getByRole('button', { name: /14 videos/i });
      fireEvent.click(batch14Btn);
      expect(screen.getByText(/content batch size: 14 videos/i)).toBeInTheDocument();

      // Submit
      const submitBtn = screen.getByRole('button', { name: /generate 14-day bulk content plan/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/workflows/bulk-plan',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"contentCount":14'),
          })
        );
        expect(router.push).toHaveBeenCalledWith('/dashboard?job=bulk-job-456');
      });

      global.fetch = originalFetch;
    });

    it('renders error alert on failed submission', async () => {
      const originalFetch = global.fetch;
      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/workflows/bulk-plan')) {
          return Promise.resolve(
            new Response(JSON.stringify({ success: false, error: 'Database schedule conflict' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return originalFetch(url, init);
      });
      global.fetch = fetchSpy;

      render(<BulkPage />);

      fireEvent.change(screen.getByLabelText(/content niche or industry domain/i), { target: { value: 'Mindfulness' } });
      const submitBtn = screen.getByRole('button', { name: /generate 7-day bulk content plan/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/database schedule conflict/i)).toBeInTheDocument();
      });

      global.fetch = originalFetch;
    });
  });

  // ==========================================================================
  // Suite 3: Micro-Drama (app/(app)/create/drama/page.tsx)
  // ==========================================================================
  describe('Micro-Drama Route (/create/drama)', () => {
    it('mounts cleanly and renders genre presets, characters, and controls', () => {
      render(<DramaPage />);

      expect(screen.getByRole('heading', { level: 1, name: /ai micro-drama series/i })).toBeInTheDocument();
      expect(screen.getByText('Cyberpunk Noir')).toBeInTheDocument();
      expect(screen.getByText('Royal Romance')).toBeInTheDocument();
      expect(screen.getByText('Detective Jax')).toBeInTheDocument();
      expect(screen.getByText('Dr. Vesper')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add character/i })).toBeInTheDocument();
    });

    it('adds and removes characters, modifies plot overview, and submits to /api/workflows/micro-drama', async () => {
      const originalFetch = global.fetch;
      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/workflows/micro-drama') && init?.method === 'POST') {
          return Promise.resolve(
            new Response(JSON.stringify({ success: true, jobId: 'drama-job-789' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return originalFetch(url, init);
      });
      global.fetch = fetchSpy;

      render(<DramaPage />);

      // Switch genre to Royal Romance
      const romanceBtn = screen.getByRole('button', { name: /royal romance/i });
      fireEvent.click(romanceBtn);

      // Add a third character
      const addCharBtn = screen.getByRole('button', { name: /add character/i });
      fireEvent.click(addCharBtn);
      expect(screen.getAllByPlaceholderText(/character name/i).length).toBe(3);

      // Submit
      const generateBtn = screen.getByRole('button', { name: /generate 3-episode micro-drama/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/workflows/micro-drama',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"genre":"royal-romance"'),
          })
        );
        expect(router.push).toHaveBeenCalledWith('/dashboard?job=drama-job-789');
      });

      global.fetch = originalFetch;
    });

    it('renders error message when micro-drama generation fails', async () => {
      const originalFetch = global.fetch;
      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/workflows/micro-drama')) {
          return Promise.resolve(
            new Response(JSON.stringify({ success: false, error: 'Character limit exceeded' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return originalFetch(url, init);
      });
      global.fetch = fetchSpy;

      render(<DramaPage />);

      const generateBtn = screen.getByRole('button', { name: /generate 3-episode micro-drama/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(screen.getByText(/character limit exceeded/i)).toBeInTheDocument();
      });

      global.fetch = originalFetch;
    });
  });

  // ==========================================================================
  // Suite 4: Extract Shorts (app/(app)/create/shorts/page.tsx)
  // ==========================================================================
  describe('Extract Shorts Route (/create/shorts)', () => {
    it('mounts cleanly and renders source tabs and strategy options', () => {
      render(<ShortsPage />);

      expect(screen.getByRole('heading', { level: 1, name: /extract viral shorts/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /video url/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /transcript/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upload file/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://storage.clipped.ai/raw/tech-keynote-2026.mp4')).toBeInTheDocument();
    });

    it('submits valid URL extraction to /api/workflows/extract-shorts', async () => {
      const originalFetch = global.fetch;
      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/workflows/extract-shorts') && init?.method === 'POST') {
          return Promise.resolve(
            new Response(JSON.stringify({ success: true, jobId: 'shorts-job-101' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return originalFetch(url, init);
      });
      global.fetch = fetchSpy;

      render(<ShortsPage />);

      const extractBtn = screen.getByRole('button', { name: /extract 3 viral shorts/i });
      fireEvent.click(extractBtn);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/workflows/extract-shorts',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('tech-keynote-2026.mp4'),
          })
        );
        expect(router.push).toHaveBeenCalledWith('/dashboard?job=shorts-job-101');
      });

      global.fetch = originalFetch;
    });

    it('validates transcript mode and displays error if empty', async () => {
      render(<ShortsPage />);

      // Switch to transcript tab
      const transcriptTab = screen.getByRole('button', { name: /transcript/i });
      fireEvent.click(transcriptTab);

      // Click submit without entering transcript
      const extractBtn = screen.getByRole('button', { name: /extract 3 viral shorts/i });
      fireEvent.click(extractBtn);

      expect(screen.getByText(/please paste a transcript to extract clips from/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Suite 5: URL to Video (app/(app)/create/url/page.tsx)
  // ==========================================================================
  describe('URL to Video Route (/create/url)', () => {
    it('mounts cleanly and renders URL input and generate button', () => {
      render(<UrlToVideoPage />);

      expect(screen.getByRole('heading', { level: 1, name: /url to video/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/https:\/\/example\.com\/blog\/\.\.\./i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate video/i })).toBeInTheDocument();
    });

    it('scrapes URL, mutates useWizardStore, and navigates to /create/footage in auto mode', async () => {
      const originalFetch = global.fetch;
      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/workflows/scrape') && init?.method === 'POST') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                script: 'Extracted summary of tech article about quantum computing breakthrough.',
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        return originalFetch(url, init);
      });
      global.fetch = fetchSpy;

      render(<UrlToVideoPage />);

      const urlInput = screen.getByPlaceholderText(/https:\/\/example\.com\/blog\/\.\.\./i);
      fireEvent.change(urlInput, { target: { value: 'https://techcrunch.com/quantum-leap' } });

      const genBtn = screen.getByRole('button', { name: /generate video/i });
      fireEvent.click(genBtn);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/workflows/scrape',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('https://techcrunch.com/quantum-leap'),
          })
        );
        expect(useWizardStore.getState().workflowType).toBe('footage');
        expect(useWizardStore.getState().narration).toContain('Extracted summary');
        expect(useWizardStore.getState().subject).toBe('Video from: techcrunch.com');
        expect(useWizardStore.getState().autoMode).toBe(true);
        expect(router.push).toHaveBeenCalledWith('/create/footage');
      });

      global.fetch = originalFetch;
    });

    it('handles scrape failure gracefully and displays error alert', async () => {
      const originalFetch = global.fetch;
      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/workflows/scrape')) {
          return Promise.resolve(
            new Response(JSON.stringify({ success: false, error: 'Web page could not be parsed' }), {
              status: 422,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return originalFetch(url, init);
      });
      global.fetch = fetchSpy;

      render(<UrlToVideoPage />);

      const urlInput = screen.getByPlaceholderText(/https:\/\/example\.com\/blog\/\.\.\./i);
      fireEvent.change(urlInput, { target: { value: 'https://invalid-url-domain.xyz' } });

      const genBtn = screen.getByRole('button', { name: /generate video/i });
      fireEvent.click(genBtn);

      await waitFor(() => {
        expect(screen.getByText(/web page could not be parsed/i)).toBeInTheDocument();
      });

      global.fetch = originalFetch;
    });
  });
});
