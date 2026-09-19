import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/components/wizard/wizard-store';
import MissionProgressPage from '@/app/(app)/create/mission/[id]/page';

const MOCK_IN_PROGRESS_JOB = {
  success: true,
  jobId: 'test-mission-123',
  currentStage: 'voice_synthesis',
  overallProgress: 60,
  data: {
    prompt: 'How Black Holes Warp Spacetime',
    aspectRatio: '9:16',
    style: 'cinematic',
    voice: 'alloy',
    script: 'Black holes warp spacetime so severely that not even light can escape their pull.',
    scenes: [
      {
        id: 'scene-1',
        text: 'Black holes warp spacetime severely.',
        duration: 4,
        keywords: ['black hole', 'space'],
        videoUrl: 'https://example.com/blackhole.mp4',
      },
      {
        id: 'scene-2',
        text: 'Not even light can escape.',
        duration: 3,
        keywords: ['light', 'event horizon'],
        videoUrl: 'https://example.com/light.mp4',
      },
    ],
  },
  steps: [
    {
      stage: 'script_generation',
      label: 'Script Generation',
      status: 'completed',
      progress: 100,
      startedAt: '2026-09-17T00:00:00.000Z',
      completedAt: '2026-09-17T00:00:02.000Z',
      log: 'Script generated: 14 words',
    },
    {
      stage: 'scene_planning',
      label: 'Scene Decomposition',
      status: 'completed',
      progress: 100,
      startedAt: '2026-09-17T00:00:02.000Z',
      completedAt: '2026-09-17T00:00:04.000Z',
      log: 'Decomposed into 2 visual scenes',
    },
    {
      stage: 'asset_sourcing',
      label: 'Asset Sourcing',
      status: 'completed',
      progress: 100,
      startedAt: '2026-09-17T00:00:04.000Z',
      completedAt: '2026-09-17T00:00:06.000Z',
      log: 'Matched 2 B-roll clips from Pexels',
    },
    {
      stage: 'voice_synthesis',
      label: 'Voice & Audio Synthesis',
      status: 'in_progress',
      progress: 50,
      startedAt: '2026-09-17T00:00:06.000Z',
      log: 'Synthesizing voiceover with OpenAI Alloy...',
    },
    {
      stage: 'video_composition',
      label: 'Video Composition',
      status: 'pending',
      progress: 0,
    },
  ],
};

const MOCK_COMPLETED_JOB = {
  ...MOCK_IN_PROGRESS_JOB,
  currentStage: 'completed',
  overallProgress: 100,
  data: {
    ...MOCK_IN_PROGRESS_JOB.data,
    videoUrl: 'https://example.com/final-output.mp4',
  },
  steps: MOCK_IN_PROGRESS_JOB.steps.map((s) => ({ ...s, status: 'completed', progress: 100 })),
};

const MOCK_FAILED_JOB = {
  ...MOCK_IN_PROGRESS_JOB,
  currentStage: 'voice_synthesis',
  overallProgress: 60,
  error: 'Voice synthesis service rate limit reached',
};

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

describe('Mission Dynamic Route (app/(app)/create/mission/[id]/page.tsx)', () => {
  let router: ReturnType<typeof useRouter>;
  const baseFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    router = useRouter();
    useWizardStore.getState().reset();
    global.fetch = baseFetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = baseFetch;
    vi.restoreAllMocks();
    useWizardStore.getState().reset();
  });

  it('renders initial loading state and unwraps params via Suspense', async () => {
    // Delay fetch response to observe initial placeholder
    try {
      global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/api/workflows/mission')) {
          return new Promise(() => {});
        }
        return baseFetch(url, init);
      });

      await renderMissionPage(Promise.resolve({ id: 'test-mission-123' }));

      expect(screen.getByText(/initializing autonomous mission pipeline/i)).toBeInTheDocument();
      expect(screen.getByText(/job id:/i)).toBeInTheDocument();
      expect(screen.getByText(/back to create hub/i)).toBeInTheDocument();
    } finally {
      global.fetch = baseFetch;
    }
  });

  it('polls job status, renders in-progress 5-stage pipeline and execution logs', async () => {
    const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/api/workflows/mission?id=test-mission-123')) {
        return Promise.resolve(
          new Response(JSON.stringify(MOCK_IN_PROGRESS_JOB), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return baseFetch(url, init);
    });
    global.fetch = fetchSpy;

    try {
      await renderMissionPage(Promise.resolve({ id: 'test-mission-123' }));

      // Wait for polling update
      await waitFor(() => {
        expect(screen.getByText(/how black holes warp spacetime/i)).toBeInTheDocument();
      });

      // Verify Header status
      expect(screen.getByText(/in progress \(60%\)/i)).toBeInTheDocument();
      expect(screen.getByText('Automatic Mission Mode')).toBeInTheDocument();

      // Verify 5-Stage Stepper
      expect(screen.getByText('1. Script Generation')).toBeInTheDocument();
      expect(screen.getByText('2. Scene Decomposition')).toBeInTheDocument();
      expect(screen.getByText('3. Asset Sourcing')).toBeInTheDocument();
      expect(screen.getByText('4. Voice & Audio')).toBeInTheDocument();
      expect(screen.getByText('5. Video Composition')).toBeInTheDocument();

      // Verify Streaming Execution Console
      expect(screen.getByText(/streaming execution console/i)).toBeInTheDocument();
      expect(screen.getAllByText(/synthesizing voiceover with openai alloy/i)[0]).toBeInTheDocument();

      // Verify Storyboard / Preview
      expect(screen.getByText(/live preview & storyboard/i)).toBeInTheDocument();
      expect(screen.getByText(/2 scenes/i)).toBeInTheDocument();
    } finally {
      global.fetch = baseFetch;
    }
  });

  it('copies logs to clipboard when Copy Logs button is clicked', async () => {
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/api/workflows/mission')) {
        return Promise.resolve(
          new Response(JSON.stringify(MOCK_IN_PROGRESS_JOB), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return baseFetch(url, init);
    });

    try {
      await renderMissionPage(Promise.resolve({ id: 'test-mission-123' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copy logs/i })).toBeInTheDocument();
      });

      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        const copyBtn = screen.getByRole('button', { name: /copy logs/i });
        fireEvent.click(copyBtn);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('Initiating Script Generation...')
        );
        expect(screen.getByText(/copied/i)).toBeInTheDocument();

        act(() => {
          vi.runAllTimers();
        });
      } finally {
        vi.useRealTimers();
      }
    } finally {
      global.fetch = baseFetch;
    }
  });

  it('renders completed mission state with 100% progress badge', async () => {
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/api/workflows/mission')) {
        return Promise.resolve(
          new Response(JSON.stringify(MOCK_COMPLETED_JOB), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return baseFetch(url, init);
    });

    try {
      await renderMissionPage(Promise.resolve({ id: 'test-mission-123' }));

      await waitFor(() => {
        expect(screen.getByText(/completed \(100%\)/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/how black holes warp spacetime/i)).toBeInTheDocument();
    } finally {
      global.fetch = baseFetch;
    }
  });

  it('renders failed mission state, displays error in console, and allows retry', async () => {
    const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/api/workflows/mission')) {
        if (init?.method === 'POST') {
          return Promise.resolve(
            new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify(MOCK_FAILED_JOB), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return baseFetch(url, init);
    });
    global.fetch = fetchSpy;

    try {
      await renderMissionPage(Promise.resolve({ id: 'test-mission-123' }));

      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
        expect(screen.getByText(/fatal error encountered: voice synthesis service rate limit reached/i)).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole('button', { name: /retry mission/i });
      expect(retryBtn).toBeInTheDocument();
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/workflows/mission',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('How Black Holes Warp Spacetime'),
          })
        );
      });
    } finally {
      global.fetch = baseFetch;
    }
  });

  it('transfers mission state to wizard and navigates to /create/footage on "Manual / Edit in Wizard"', async () => {
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/api/workflows/mission')) {
        return Promise.resolve(
          new Response(JSON.stringify(MOCK_IN_PROGRESS_JOB), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return baseFetch(url, init);
    });

    try {
      await renderMissionPage(Promise.resolve({ id: 'test-mission-123' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /manual \/ edit in wizard/i })).toBeInTheDocument();
      });

      const editWizardBtn = screen.getByRole('button', { name: /manual \/ edit in wizard/i });
      fireEvent.click(editWizardBtn);

      // Verify Zustand store hydration
      expect(useWizardStore.getState().workflowType).toBe('footage');
      expect(useWizardStore.getState().subject).toBe('How Black Holes Warp Spacetime');
      expect(useWizardStore.getState().narration).toContain('Black holes warp spacetime');
      expect(useWizardStore.getState().beats.length).toBe(2);
      expect(useWizardStore.getState().step).toBe(1);

      // Verify router navigation to /create/footage
      expect(router.push).toHaveBeenCalledWith('/create/footage');
    } finally {
      global.fetch = baseFetch;
    }
  });
});
