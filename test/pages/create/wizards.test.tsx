import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/components/wizard/wizard-store';

import AiVideosPage from '@/app/(app)/create/ai-videos/page';
import FootagePage from '@/app/(app)/create/footage/page';
import ImagesPage from '@/app/(app)/create/images/page';
import StoriesPage from '@/app/(app)/create/stories/page';

describe('Creation Wizard Routes (app/(app)/create/{ai-videos,footage,images,stories}/page.tsx)', () => {
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
  // Suite 1: Clean Mount & Workflow Type Initialization for All 4 Routes
  // ==========================================================================
  describe('Page Route Mounts', () => {
    it('mounts AI-Videos route and initializes workflowType in store', async () => {
      render(<AiVideosPage />);

      await waitFor(() => {
        expect(useWizardStore.getState().workflowType).toBe('ai-videos');
      });
      expect(screen.getByRole('heading', { level: 2, name: /script/i })).toBeInTheDocument();
      expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
    });

    it('mounts Footage route and initializes workflowType in store', async () => {
      render(<FootagePage />);

      await waitFor(() => {
        expect(useWizardStore.getState().workflowType).toBe('footage');
      });
      expect(screen.getByRole('heading', { level: 2, name: /script/i })).toBeInTheDocument();
    });

    it('mounts Images route and initializes workflowType in store', async () => {
      render(<ImagesPage />);

      await waitFor(() => {
        expect(useWizardStore.getState().workflowType).toBe('images');
      });
      expect(screen.getByRole('heading', { level: 2, name: /script/i })).toBeInTheDocument();
    });

    it('mounts Stories route and initializes workflowType in store', async () => {
      render(<StoriesPage />);

      await waitFor(() => {
        expect(useWizardStore.getState().workflowType).toBe('stories');
      });
      expect(screen.getByRole('heading', { level: 2, name: /script/i })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Suite 2: Step Progression (Script -> Scenes -> Voice -> Subtitles -> Render)
  // ==========================================================================
  describe('Step Progression Lifecycle', () => {
    it('navigates through all 5 wizard steps and interacts with controls', async () => {
      render(<FootagePage />);

      // STEP 0: SCRIPT
      expect(screen.getByRole('heading', { level: 2, name: /script/i })).toBeInTheDocument();
      
      const subjectInput = screen.getByPlaceholderText(/e\.g\. 5 hidden features of ios 18/i);
      fireEvent.change(subjectInput, { target: { value: '5 Mind-Blowing Facts About the Deep Ocean' } });
      expect(useWizardStore.getState().subject).toBe('5 Mind-Blowing Facts About the Deep Ocean');

      const narrationArea = screen.getByPlaceholderText(/write or paste your narration here\.\.\./i);
      fireEvent.change(narrationArea, {
        target: { value: 'The deep ocean is dark and vast. Bioluminescent creatures illuminate the abyss.' },
      });
      expect(useWizardStore.getState().narration).toContain('The deep ocean is dark and vast');

      // Click Continue -> Advance to Step 1 (Scenes)
      const continueBtnStep0 = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueBtnStep0);

      // STEP 1: SCENES
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /scenes/i })).toBeInTheDocument();
        expect(screen.getByText(/step 2 of 5/i)).toBeInTheDocument();
        expect(screen.getByText(/no scenes generated yet\./i)).toBeInTheDocument();
      });

      // Back navigation test
      const backBtnStep1 = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backBtnStep1);
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /script/i })).toBeInTheDocument();
      });

      // Return to Step 1
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /scenes/i })).toBeInTheDocument();
      });

      // Advance to Step 2 (Voice)
      const continueBtnStep1 = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueBtnStep1);

      // STEP 2: VOICE
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /voice/i })).toBeInTheDocument();
        expect(screen.getByText(/OpenAI TTS/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/step 3 of 5/i)).toBeInTheDocument();
      expect(screen.getByText(/Alloy/i)).toBeInTheDocument();

      // Select another voice
      const onyxCard = screen.getByText('Onyx');
      fireEvent.click(onyxCard);
      expect(useWizardStore.getState().voice).toBe('onyx');

      // Advance to Step 3 (Subtitles)
      const continueBtnStep2 = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueBtnStep2);

      // STEP 3: SUBTITLES
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /subtitles/i })).toBeInTheDocument();
      });
      expect(screen.getByText(/step 4 of 5/i)).toBeInTheDocument();

      // Advance to Step 4 (Render)
      const continueBtnStep3 = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueBtnStep3);

      // STEP 4: RENDER
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /render/i })).toBeInTheDocument();
        expect(screen.getByText(/step 5 of 5/i)).toBeInTheDocument();
        expect(screen.getByText(/final review/i)).toBeInTheDocument();
        expect(screen.getByText(/aspect ratio/i)).toBeInTheDocument();
        expect(screen.getByText(/incomplete/i)).toBeInTheDocument();
      });
    });

    it('generates script with AI on Script step', async () => {
      const originalFetch = global.fetch;
      try {
        const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
          if (url.includes('/api/v1/script') && init?.method === 'POST') {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  narration: 'Generated script about ancient pyramids and engineering feats.',
                  keywords: ['pyramids', 'egypt', 'architecture'],
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            );
          }
          return originalFetch(url, init);
        });
        global.fetch = fetchSpy;

        render(<AiVideosPage />);

        const subjectInput = screen.getByPlaceholderText(/e\.g\. 5 hidden features of ios 18/i);
        fireEvent.change(subjectInput, { target: { value: 'Ancient Pyramids' } });

        const aiGenBtn = screen.getByRole('button', { name: /generate with ai/i });
        fireEvent.click(aiGenBtn);

        await waitFor(() => {
          expect(fetchSpy).toHaveBeenCalledWith(
            '/api/v1/script',
            expect.objectContaining({ method: 'POST' })
          );
          expect(useWizardStore.getState().narration).toContain('ancient pyramids');
        });
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('submits render to queue when beats and narration are ready', async () => {
      const originalFetch = global.fetch;
      try {
        const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
          if (url.includes('/api/workflows/generate') && init?.method === 'POST') {
            return Promise.resolve(
              new Response(JSON.stringify({ success: true, jobId: 'render-job-777' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              })
            );
          }
          return originalFetch(url, init);
        });
        global.fetch = fetchSpy;

        // Populate store with complete ready state
        useWizardStore.setState({
          workflowType: 'footage',
          subject: 'Ocean Mysteries',
          narration: 'The ocean depths are mysterious.',
          step: 4,
          furthestStep: 4,
          beats: [
            {
              id: 'beat-1',
              text: 'The ocean depths are mysterious.',
              duration: 4,
              selectedId: 'c1',
              candidates: [
                {
                  id: 'c1',
                  url: 'https://example.com/ocean.mp4',
                  title: 'Ocean Video',
                  platform: 'pexels',
                  duration: 4,
                  score: 1.0,
                },
              ],
            },
          ],
        });

        render(<FootagePage />);

        await waitFor(() => {
          expect(screen.queryByText(/incomplete/i)).not.toBeInTheDocument();
        });

        const queueBtn = screen.getByRole('button', { name: /send to queue/i });
        expect(queueBtn).not.toBeDisabled();
        fireEvent.click(queueBtn);

        await waitFor(() => {
          expect(fetchSpy).toHaveBeenCalledWith(
            '/api/workflows/generate',
            expect.objectContaining({ method: 'POST' })
          );
          expect(router.push).toHaveBeenCalledWith('/dashboard?job=render-job-777');
        });
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  // ==========================================================================
  // Suite 3: Auto-Pilot Mode
  // ==========================================================================
  describe('Auto-Pilot Mode', () => {
    it('executes full auto-pilot pipeline and jumps to Render step', async () => {
      const originalFetch = global.fetch;
      try {
        const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
          if (url.includes('/api/v1/script') && init?.method === 'POST') {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  narration: 'Autonomous script: AI breakthroughs in 2026.',
                  keywords: ['ai', 'tech'],
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            );
          }
          if (url.includes('/api/v1/analyze') && init?.method === 'POST') {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  scenes: [
                    { id: 'beat-0', text: 'AI breakthroughs in 2026', duration: 4, keywords: ['ai', 'tech'] },
                  ],
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            );
          }
          if (url.includes('/api/v1/source') && init?.method === 'POST') {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  candidates: [
                    { id: 'cand-0', url: 'https://example.com/ai.mp4', title: 'AI clip', platform: 'pexels' },
                  ],
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            );
          }
          return originalFetch(url, init);
        });
        global.fetch = fetchSpy;

        render(<FootagePage />);

        const autoPilotBtn = screen.getByRole('button', { name: /auto-pilot/i });
        fireEvent.click(autoPilotBtn);

        await waitFor(() => {
          expect(useWizardStore.getState().step).toBe(4);
          expect(useWizardStore.getState().beats.length).toBe(1);
        });

        expect(screen.getByRole('heading', { level: 2, name: /render/i })).toBeInTheDocument();
        expect(screen.getByText(/auto-pilot mode active/i)).toBeInTheDocument();

        // Test Cancel Auto button
        const cancelBtn = screen.getByRole('button', { name: /cancel auto/i });
        fireEvent.click(cancelBtn);
        expect(useWizardStore.getState().autoMode).toBe(false);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('handles error in Auto-Pilot gracefully and sets error message in store', async () => {
      const originalFetch = global.fetch;
      try {
        const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
          if (url.includes('/api/v1/script')) {
            return Promise.resolve(new Response('Server Error', { status: 500 }));
          }
          return originalFetch(url, init);
        });
        global.fetch = fetchSpy;

        render(<FootagePage />);

        const autoPilotBtn = screen.getByRole('button', { name: /auto-pilot/i });
        fireEvent.click(autoPilotBtn);

        await waitFor(() => {
          expect(useWizardStore.getState().error).toContain('Auto-Pilot failed');
        });

        expect(screen.getByText(/auto-pilot failed/i)).toBeInTheDocument();
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
