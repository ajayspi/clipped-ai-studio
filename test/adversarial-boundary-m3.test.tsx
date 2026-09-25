import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';

import ShortsPage from '@/app/(app)/create/shorts/page';
import MissionProgressPage from '@/app/(app)/create/mission/[id]/page';
import AvatarCreatePage from '@/app/(app)/create/avatar/page';
import { AVATAR_PRESETS } from '@/lib/engine/types';

async function renderMissionPage(paramsPromise: Promise<{ id: string }>) {
  let view: ReturnType<typeof render>;
  await act(async () => {
    view = render(
      <React.Suspense fallback={<div>Loading mission params...</div>}>
        <MissionProgressPage params={paramsPromise} />
      </React.Suspense>
    );
  });
  return view!;
}

describe('Adversarial Boundary Condition Tests — Milestone 3', () => {
  let router: ReturnType<typeof useRouter>;
  const baseFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    router = useRouter();
    global.fetch = baseFetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = baseFetch;
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Boundary 1: Empty & Whitespace Transcripts in Shorts
  // ==========================================================================
  describe('Boundary Condition 1: Shorts Transcript Validation & Error Handling', () => {
    it('blocks submission and displays error when transcript is empty string', async () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      render(<ShortsPage />);

      // Switch to transcript tab
      const transcriptTab = screen.getByRole('button', { name: /raw transcript/i });
      fireEvent.click(transcriptTab);

      // Verify empty textarea is rendered
      const textarea = screen.getByPlaceholderText(/the single biggest secret to our 10x growth/i);
      expect((textarea as HTMLTextAreaElement).value).toBe('');

      // Submit
      const submitBtn = screen.getByRole('button', { name: /extract 3 viral shorts/i });
      fireEvent.click(submitBtn);

      // Verify validation: fetch must NOT be called
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(screen.getByText('Please paste a transcript to extract clips from')).toBeInTheDocument();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('blocks submission when transcript contains only spaces, tabs, and newlines', async () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      render(<ShortsPage />);

      const transcriptTab = screen.getByRole('button', { name: /raw transcript/i });
      fireEvent.click(transcriptTab);

      const textarea = screen.getByPlaceholderText(/the single biggest secret to our 10x growth/i);
      fireEvent.change(textarea, { target: { value: '   \n\t   \n   ' } });

      const submitBtn = screen.getByRole('button', { name: /extract 3 viral shorts/i });
      fireEvent.click(submitBtn);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(screen.getByText('Please paste a transcript to extract clips from')).toBeInTheDocument();
    });

    it('blocks submission when video URL is cleared to empty or whitespace in url mode', async () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      render(<ShortsPage />);

      // Default is URL mode. Clear the video URL input
      const urlInput = screen.getByDisplayValue('https://storage.clipped.ai/raw/tech-keynote-2026.mp4');
      fireEvent.change(urlInput, { target: { value: '   ' } });

      const submitBtn = screen.getByRole('button', { name: /extract 3 viral shorts/i });
      fireEvent.click(submitBtn);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(screen.getByText('Please provide a valid video URL')).toBeInTheDocument();
    });

    it('recovers from empty transcript error after user inputs valid transcript', async () => {
      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/workflows/extract-shorts') && init?.method === 'POST') {
          return Promise.resolve(
            new Response(JSON.stringify({ success: true, jobId: 'recovered-shorts-101' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return baseFetch(url, init);
      });
      global.fetch = fetchSpy;

      render(<ShortsPage />);

      // Switch to transcript tab and trigger error
      fireEvent.click(screen.getByRole('button', { name: /raw transcript/i }));
      fireEvent.click(screen.getByRole('button', { name: /extract 3 viral shorts/i }));
      expect(screen.getByText('Please paste a transcript to extract clips from')).toBeInTheDocument();

      // Now supply valid transcript
      const textarea = screen.getByPlaceholderText(/the single biggest secret to our 10x growth/i);
      fireEvent.change(textarea, {
        target: {
          value: '[00:00:15] Here is the main insight: building robust AI systems requires adversarial validation.',
        },
      });

      // Submit again
      fireEvent.click(screen.getByRole('button', { name: /extract 3 viral shorts/i }));

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/workflows/extract-shorts',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Here is the main insight'),
          })
        );
        expect(router.push).toHaveBeenCalledWith('/dashboard?job=recovered-shorts-101');
      });
    });

    it('handles backend 500 error gracefully without crashing', async () => {
      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/workflows/extract-shorts')) {
          return Promise.resolve(
            new Response(JSON.stringify({ success: false, error: 'Speech-to-text token quota exhausted' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return baseFetch(url, init);
      });
      global.fetch = fetchSpy;

      render(<ShortsPage />);

      const submitBtn = screen.getByRole('button', { name: /extract 3 viral shorts/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Speech-to-text token quota exhausted')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Boundary 2: Failed Mission APIs
  // ==========================================================================
  describe('Boundary Condition 2: Mission API Failures, 404s, and Network Errors', () => {
    it('handles initial 404 response by populating fallback initial placeholder and rendering', async () => {
      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/api/workflows/mission')) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: 'Job not found yet' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return baseFetch(url, init);
      });
      global.fetch = fetchSpy;

      await renderMissionPage(Promise.resolve({ id: 'missing-mission-404' }));

      // 404 fallback sets placeholder stage
      await waitFor(() => {
        expect(screen.getByText('Automatic Video Mission')).toBeInTheDocument();
        expect(screen.getByText('1. Script Generation')).toBeInTheDocument();
        expect(screen.getByText('In Progress (10%)')).toBeInTheDocument();
      });
    });

    it('handles initial HTTP 500 error gracefully without unhandled crashes', async () => {
      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/api/workflows/mission')) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: 'Database connection failed' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return baseFetch(url, init);
      });
      global.fetch = fetchSpy;

      await renderMissionPage(Promise.resolve({ id: 'err-mission-500' }));

      // Initial placeholder remains visible, no uncaught exceptions
      expect(screen.getByText(/initializing autonomous mission pipeline/i)).toBeInTheDocument();
    });

    it('handles network throw in pollJobStatus without unhandled rejection', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/api/workflows/mission')) {
          return Promise.reject(new Error('Network offline or connection refused'));
        }
        return baseFetch(url, init);
      });
      global.fetch = fetchSpy;

      await renderMissionPage(Promise.resolve({ id: 'net-err-mission' }));

      await waitFor(() => {
        expect(warnSpy).toHaveBeenCalledWith('Polling error:', expect.any(Error));
      });

      warnSpy.mockRestore();
    });

    it('renders mission fatal error in header, stepper, and log console', async () => {
      const FAILED_MISSION = {
        success: true,
        jobId: 'failed-job-999',
        currentStage: 'video_composition',
        overallProgress: 80,
        error: 'GPU VRAM out of memory during Remotion render bundle',
        data: {
          prompt: 'Adversarial Failure Test Video',
          aspectRatio: '16:9',
          style: 'hyperrealistic',
          voice: 'onyx',
        },
        steps: [
          { stage: 'script_generation', label: 'Script Generation', status: 'completed', progress: 100 },
          { stage: 'scene_planning', label: 'Scene Decomposition', status: 'completed', progress: 100 },
          { stage: 'asset_sourcing', label: 'Asset Sourcing', status: 'completed', progress: 100 },
          { stage: 'voice_synthesis', label: 'Voice & Audio', status: 'completed', progress: 100 },
          { stage: 'video_composition', label: 'Video Composition', status: 'failed', progress: 50, log: 'Composition failed' },
        ],
      };

      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/api/workflows/mission')) {
          return Promise.resolve(
            new Response(JSON.stringify(FAILED_MISSION), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return baseFetch(url, init);
      });
      global.fetch = fetchSpy;

      await renderMissionPage(Promise.resolve({ id: 'failed-job-999' }));

      // Verify Header failure indicators
      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry mission/i })).toBeInTheDocument();
      });

      // Verify Console fatal error log
      expect(
        screen.getByText(/fatal error encountered: gpu vram out of memory during remotion render bundle/i)
      ).toBeInTheDocument();

      // Verify Stepper shows failed status
      const failureMessages = screen.getAllByText('Composition failed');
      expect(failureMessages.length).toBeGreaterThan(0);
    });

    it('handles retry API failure and displays fetch error notification banner', async () => {
      const FAILED_MISSION = {
        success: true,
        jobId: 'failed-job-retry',
        currentStage: 'video_composition',
        overallProgress: 80,
        error: 'Initial engine crash',
        data: {
          prompt: 'Retry Failure Test',
          aspectRatio: '9:16',
          style: 'cinematic',
          voice: 'alloy',
        },
        steps: [],
      };

      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/api/workflows/mission')) {
          if (init?.method === 'POST') {
            return Promise.reject(new Error('Retry worker queue is full'));
          }
          return Promise.resolve(
            new Response(JSON.stringify(FAILED_MISSION), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return baseFetch(url, init);
      });
      global.fetch = fetchSpy;

      await renderMissionPage(Promise.resolve({ id: 'failed-job-retry' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry mission/i })).toBeInTheDocument();
      });

      // Click retry button which rejects
      const retryBtn = screen.getByRole('button', { name: /retry mission/i });
      fireEvent.click(retryBtn);

      // Verify error alert banner
      await waitFor(() => {
        expect(screen.getByText('Retry worker queue is full')).toBeInTheDocument();
        expect(screen.getByText('Retry Fetch')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Boundary 3: Custom Photo Image URL Inputs in Avatar Studio
  // ==========================================================================
  describe('Boundary Condition 3: Avatar Studio Custom Photo Image URL Inputs', () => {
    it('safely falls back to default preset image when custom photo URL is empty string', () => {
      render(<AvatarCreatePage />);

      // Switch to Custom Photo tab
      const customTab = screen.getByRole('button', { name: /custom photo/i });
      fireEvent.click(customTab);

      // Custom preview thumbnail should NOT exist when URL is empty
      expect(screen.queryByAltText('Custom Preview')).not.toBeInTheDocument();

      // Canvas presenter image should safely fall back to default preset previewUrl
      const presenterImgs = screen.getAllByAltText('Presenter');
      expect(presenterImgs.length).toBeGreaterThan(0);
      expect(presenterImgs[0]).toHaveAttribute('src', AVATAR_PRESETS[0].previewUrl);
    });

    it('safely falls back to default preset image when custom photo URL is whitespace only', () => {
      render(<AvatarCreatePage />);

      fireEvent.click(screen.getByRole('button', { name: /custom photo/i }));

      const urlInput = screen.getByPlaceholderText(/https:\/\/example\.com\/portrait\.jpg/i);
      fireEvent.change(urlInput, { target: { value: '   \t  \n  ' } });

      expect(screen.queryByAltText('Custom Preview')).not.toBeInTheDocument();
      const presenterImgs = screen.getAllByAltText('Presenter');
      expect(presenterImgs[0]).toHaveAttribute('src', AVATAR_PRESETS[0].previewUrl);
    });

    it('updates thumbnail and canvas preview when valid custom image URL is provided', () => {
      render(<AvatarCreatePage />);

      fireEvent.click(screen.getByRole('button', { name: /custom photo/i }));

      const testUrl = 'https://images.unsplash.com/photo-custom-portrait-hd.jpg';
      const urlInput = screen.getByPlaceholderText(/https:\/\/example\.com\/portrait\.jpg/i);
      fireEvent.change(urlInput, { target: { value: testUrl } });

      // Thumbnail preview now appears
      const thumbnail = screen.getByAltText('Custom Preview');
      expect(thumbnail).toBeInTheDocument();
      expect(thumbnail).toHaveAttribute('src', testUrl);

      // Canvas presenter image updates to custom URL
      const presenterImgs = screen.getAllByAltText('Presenter');
      expect(presenterImgs[0]).toHaveAttribute('src', testUrl);
    });

    it('preserves custom photo image URL across different compositing layouts', () => {
      render(<AvatarCreatePage />);

      fireEvent.click(screen.getByRole('button', { name: /custom photo/i }));
      const testUrl = 'https://images.unsplash.com/photo-expert-speaker.png';
      fireEvent.change(screen.getByPlaceholderText(/https:\/\/example\.com\/portrait\.jpg/i), {
        target: { value: testUrl },
      });

      // Switch to Fullscreen Presenter layout
      fireEvent.click(screen.getByRole('button', { name: /fullscreen presenter/i }));
      let presenterImg = screen.getByAltText('Presenter');
      expect(presenterImg).toHaveAttribute('src', testUrl);

      // Switch to Circular Bubble layout
      fireEvent.click(screen.getByRole('button', { name: /circular bubble/i }));
      presenterImg = screen.getByAltText('Presenter');
      expect(presenterImg).toHaveAttribute('src', testUrl);

      // Switch to Side by Side layout
      fireEvent.click(screen.getByRole('button', { name: /side by side/i }));
      presenterImg = screen.getByAltText('Presenter');
      expect(presenterImg).toHaveAttribute('src', testUrl);
    });

    it('submits generation payload with avatarType="custom_photo" and customImageUrl', async () => {
      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/workflows/avatar') && init?.method === 'POST') {
          return Promise.resolve(
            new Response(JSON.stringify({ success: true, jobId: 'custom-avatar-job-888' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return baseFetch(url, init);
      });
      global.fetch = fetchSpy;

      render(<AvatarCreatePage />);

      fireEvent.click(screen.getByRole('button', { name: /custom photo/i }));
      const customUrl = 'https://images.unsplash.com/photo-ceo-executive.jpg';
      fireEvent.change(screen.getByPlaceholderText(/https:\/\/example\.com\/portrait\.jpg/i), {
        target: { value: customUrl },
      });

      const genBtn = screen.getByRole('button', { name: /generate talking head avatar video/i });
      fireEvent.click(genBtn);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/workflows/avatar',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"avatarType":"custom_photo"'),
          })
        );
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/workflows/avatar',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining(customUrl),
          })
        );
        expect(router.push).toHaveBeenCalledWith('/create/mission/custom-avatar-job-888');
      });
    });

    it('reverts customImageUrl to undefined in payload when user switches back to preset tab', async () => {
      const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/workflows/avatar') && init?.method === 'POST') {
          return Promise.resolve(
            new Response(JSON.stringify({ success: true, jobId: 'preset-reverted-job-777' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return baseFetch(url, init);
      });
      global.fetch = fetchSpy;

      render(<AvatarCreatePage />);

      // Type in custom tab
      fireEvent.click(screen.getByRole('button', { name: /custom photo/i }));
      fireEvent.change(screen.getByPlaceholderText(/https:\/\/example\.com\/portrait\.jpg/i), {
        target: { value: 'https://images.unsplash.com/ignored-custom.jpg' },
      });

      // Switch back to preset tab
      fireEvent.click(screen.getByRole('button', { name: /preset avatars/i }));

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /generate talking head avatar video/i }));

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/workflows/avatar',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"avatarType":"preset"'),
          })
        );
        // customImageUrl should NOT be present in JSON body
        const callArgs = fetchSpy.mock.calls.find((c: any[]) => c[0].includes('/api/workflows/avatar'))!;
        const bodyObj = JSON.parse(callArgs[1].body);
        expect(bodyObj.customImageUrl).toBeUndefined();
        expect(bodyObj.avatarType).toBe('preset');
      });
    });
  });
});
