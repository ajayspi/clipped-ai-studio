import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { useRouter } from 'next/navigation';

import WhiteboardCreatePage from '@/app/(app)/create/whiteboard/page';
import { CreationWizard } from '@/components/wizard/CreationWizard';
import { useWizardStore, SUBTITLE_PRESETS } from '@/components/wizard/wizard-store';
import { ScenesStep } from '@/components/wizard/ScenesStep';
import { RenderStep } from '@/components/wizard/RenderStep';
import { LivePlayer } from '@/components/wizard/LivePlayer';
import FootagePage from '@/app/(app)/create/footage/page';

describe('Adversarial Stress Harness: Whiteboard & Wizard Systems', () => {
  const baseFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    useWizardStore.getState().reset();
    global.fetch = baseFetch;
  });

  afterEach(() => {
    cleanup();
    global.fetch = baseFetch;
    vi.restoreAllMocks();
    useWizardStore.getState().reset();
  });

  // ==========================================================================
  // SECTION 1: Whiteboard Studio Malformed / Missing Poses Stress
  // ==========================================================================
  describe('Whiteboard Studio: Pose Robustness & Malformed Character Sheets', () => {
    it('CHALLENGE 1A: missing bbox on active pose causes uncaught TypeError on join()', async () => {
      // Adversarial payload: character sheet where pose_1 is present but lacks bbox
      const malformedSheet = {
        success: true,
        archetype: 'stickman',
        style: 'monoline_marker',
        poses: {
          pose_1: {
            name: 'Pose Without BBox',
            description: 'Missing bbox property completely',
            svgPath: 'M 10 10 L 90 90',
            // bbox is deliberately undefined
          },
        },
      };

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/workflows/whiteboard/character-sheet')) {
          return Promise.resolve(
            new Response(JSON.stringify(malformedSheet), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return baseFetch(url);
      });

      // We test whether rendering the component throws or renders safely
      let renderError: any = null;
      try {
        render(<WhiteboardCreatePage />);
        await waitFor(() => {
          expect(screen.getByText('Pose Without BBox')).toBeInTheDocument();
        });
      } catch (err) {
        renderError = err;
      }

      // If bbox.join crashes, renderError will be captured or an unhandled exception thrown.
      // This assertion directly verifies if bbox is safely guarded with optional chaining
      // e.g. characterSheet.poses[activePosePreview].bbox?.join(", ")
      expect(renderError).toBeNull();
    });

    it('CHALLENGE 1B: non-array or null bbox on active pose', async () => {
      const malformedSheet = {
        success: true,
        archetype: 'stickman',
        style: 'monoline_marker',
        poses: {
          pose_1: {
            name: 'Null BBox Pose',
            description: 'bbox is explicitly null',
            bbox: null,
          },
        },
      };

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/workflows/whiteboard/character-sheet')) {
          return Promise.resolve(
            new Response(JSON.stringify(malformedSheet), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return baseFetch(url);
      });

      let renderError: any = null;
      try {
        render(<WhiteboardCreatePage />);
        await waitFor(() => {
          expect(screen.getByText('Null BBox Pose')).toBeInTheDocument();
        });
      } catch (err) {
        renderError = err;
      }

      expect(renderError).toBeNull();
    });

    it('CHALLENGE 1C: completely empty poses object ({}) and null poses', async () => {
      const emptySheet = {
        success: true,
        archetype: 'stickman',
        style: 'monoline_marker',
        poses: {},
      };

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/workflows/whiteboard/character-sheet')) {
          return Promise.resolve(
            new Response(JSON.stringify(emptySheet), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return baseFetch(url);
      });

      render(<WhiteboardCreatePage />);

      await waitFor(() => {
        // Fallback to POSE_NAMES default labels should occur cleanly
        expect(screen.getByText('Neutral Stand')).toBeInTheDocument();
        expect(screen.getByText('Pointing Right')).toBeInTheDocument();
      });

      // Clicking any pose button should not crash even though no pose data exists
      const poseBtn = screen.getByRole('button', { name: /neutral stand/i });
      fireEvent.click(poseBtn);

      // Active detail box should safely omit or show nothing without throwing
      expect(screen.queryByText(/BBox:/i)).not.toBeInTheDocument();
    });

    it('CHALLENGE 1D: rapid archetype switching creates race conditions and state churn', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/workflows/whiteboard/character-sheet')) {
          callCount++;
          const body = JSON.parse((init?.body as string) || '{}');
          // Add artificial variable latency
          const latency = body.archetype === 'stickman' ? 50 : 10;
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(
                new Response(
                  JSON.stringify({
                    success: true,
                    archetype: body.archetype,
                    style: body.style,
                    poses: {
                      pose_1: { name: `${body.archetype} Stand`, description: 'desc', bbox: [0, 0, 100, 100] },
                    },
                  }),
                  { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
              );
            }, latency);
          });
        }
        return baseFetch(url);
      });

      render(<WhiteboardCreatePage />);

      // Rapidly switch between 4 archetypes in quick succession
      const archetypes = ['Ancient Saint', 'Wise Old Man', 'Startup Founder', 'Medical Doctor'];
      for (const arch of archetypes) {
        const btn = screen.getByRole('button', { name: new RegExp(arch, 'i') });
        fireEvent.click(btn);
      }

      await waitFor(() => {
        expect(callCount).toBeGreaterThanOrEqual(4);
      });

      // Verify no uncaught exceptions and UI is still responsive
      expect(screen.getByRole('heading', { level: 1, name: /whiteboard animation studio/i })).toBeInTheDocument();
    });

    it('CHALLENGE 1E: malformed SVG paths do not break canvas rendering', async () => {
      const malformedSvgSheet = {
        success: true,
        archetype: 'stickman',
        style: 'monoline_marker',
        poses: {
          pose_1: {
            name: 'Broken SVG Pose',
            description: 'SVG path is severely malformed',
            bbox: [0, 0, 100, 100],
            svgPath: 'INVALID_SVG_COMMAND_%%%###@@@',
          },
        },
      };

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/workflows/whiteboard/character-sheet')) {
          return Promise.resolve(
            new Response(JSON.stringify(malformedSvgSheet), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return baseFetch(url);
      });

      render(<WhiteboardCreatePage />);

      await waitFor(() => {
        expect(screen.getByText('Broken SVG Pose')).toBeInTheDocument();
      });

      // SVG path element with malformed 'd' attribute should be rendered without React crashing
      const paths = document.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // SECTION 2: Wizard Store Resets & Concurrent Mutation Stress
  // ==========================================================================
  describe('Wizard Store: Rapid Resets & Out-of-Bounds Transitions', () => {
    it('CHALLENGE 2A: 100 rapid concurrent store resets and mutations maintain store consistency', () => {
      const store = useWizardStore.getState();

      for (let i = 0; i < 100; i++) {
        useWizardStore.setState({
          step: i % 5,
          furthestStep: Math.max(i % 5, 2),
          workflowType: i % 2 === 0 ? 'ai-videos' : 'stories',
          subject: `Stress Test Subject ${i}`,
          narration: `Narration line ${i}`,
          beats: [
            {
              id: `beat-${i}`,
              text: `Scene ${i}`,
              keywords: [`kw-${i}`],
              duration: i,
            },
          ],
        });

        if (i % 3 === 0) {
          useWizardStore.getState().reset();
        }
      }

      // After a reset, the store must strictly match initial state
      useWizardStore.getState().reset();
      const state = useWizardStore.getState();
      expect(state.step).toBe(0);
      expect(state.furthestStep).toBe(0);
      expect(state.workflowType).toBe('footage');
      expect(state.subject).toBe('');
      expect(state.narration).toBe('');
      expect(state.beats).toEqual([]);
      expect(state.autoMode).toBe(false);
      expect(state.busy).toBeNull();
      expect(state.error).toBeNull();
    });

    it('CHALLENGE 2B: rapid store reset while CreationWizard is mounted does not throw', async () => {
      const { rerender } = render(<CreationWizard workflowType="footage" />);

      // Populate state mid-lifecycle
      act(() => {
        useWizardStore.setState({
          step: 3,
          furthestStep: 3,
          narration: 'Live narration in progress',
          beats: [{ id: 'b1', text: 'Beat 1', keywords: ['test'], duration: 5 }],
        });
      });

      // Rapidly fire resets interleaved with re-renders
      for (let i = 0; i < 10; i++) {
        act(() => {
          useWizardStore.getState().reset();
        });
        rerender(<CreationWizard workflowType="footage" />);
      }

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /script/i })).toBeInTheDocument();
      });
      expect(useWizardStore.getState().step).toBe(0);
    });

    it('CHALLENGE 2C: out-of-bounds step value (e.g. step=99 or step=-1) in store', () => {
      // In wizard-store.ts: goToStep(step) does not clamp.
      // If someone calls goToStep(99) or goToStep(-1), STEPS[w.step] will be undefined!
      act(() => {
        useWizardStore.getState().goToStep(99);
      });

      // Mounting CreationWizard with an out-of-bounds step
      let renderError: any = null;
      try {
        render(<CreationWizard workflowType="footage" />);
      } catch (err) {
        renderError = err;
      }

      // We document whether out-of-bounds step triggers a crash
      expect(renderError).toBeNull();
    });

    it('CHALLENGE 2D: auto-pilot interrupted by immediate store reset', async () => {
      // Setup fetch mocks for auto mode steps
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/v1/script')) {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(
                new Response(
                  JSON.stringify({
                    narration: 'Script created',
                    keywords: ['tech'],
                  }),
                  { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
              );
            }, 30);
          });
        }
        return baseFetch(url);
      });

      render(<CreationWizard workflowType="footage" />);

      const autoPilotBtn = screen.getByRole('button', { name: /auto-pilot/i });
      fireEvent.click(autoPilotBtn);

      // Verify autoMode is active
      expect(useWizardStore.getState().autoMode).toBe(true);

      // Immediately reset the store while auto-pilot fetch is in-flight
      act(() => {
        useWizardStore.getState().reset();
      });

      expect(useWizardStore.getState().autoMode).toBe(false);
      expect(useWizardStore.getState().step).toBe(0);
    });
  });

  // ==========================================================================
  // SECTION 3: Wizard Sub-Components Under Corrupted Beat Inputs
  // ==========================================================================
  describe('Wizard Sub-Components: Malformed Beat Payloads', () => {
    it('CHALLENGE 3A: ScenesStep handles beats with undefined or null keywords without crashing', () => {
      const corruptedBeats: any = [
        {
          id: 'beat-corrupt-1',
          text: 'Scene without keywords',
          keywords: undefined, // undefined keywords!
          duration: 3,
        },
        {
          id: 'beat-corrupt-2',
          text: 'Scene with null keywords',
          keywords: null, // null keywords!
          duration: 4,
        },
      ];

      useWizardStore.setState({
        beats: corruptedBeats,
      });

      let renderError: any = null;
      try {
        render(<ScenesStep />);
      } catch (err) {
        renderError = err;
      }

      // If ScenesStep calls beat.keywords.map directly without guarding, it will throw!
      expect(renderError).toBeNull();
    });

    it('CHALLENGE 3B: ScenesStep handles candidate with missing url without crashing', () => {
      const corruptedBeats: any = [
        {
          id: 'beat-corrupt-url',
          text: 'Scene with candidate missing url',
          keywords: ['test'],
          duration: 5,
          candidates: [
            {
              id: 'c1',
              url: undefined, // url is undefined!
              platform: 'pexels',
            },
          ],
        },
      ];

      useWizardStore.setState({
        beats: corruptedBeats,
      });

      let renderError: any = null;
      try {
        render(<ScenesStep />);
      } catch (err) {
        renderError = err;
      }

      // If beat.candidates[0].url.endsWith is called directly without check, it throws!
      expect(renderError).toBeNull();
    });

    it('CHALLENGE 3C: RenderStep handles corrupted workflowType and NaN beat durations', () => {
      const corruptedBeats: any = [
        {
          id: 'b1',
          text: 'Beat 1',
          keywords: ['a'],
          duration: NaN,
          candidates: [{ id: 'c1', url: 'https://example.com/1.mp4' }],
        },
      ];

      useWizardStore.setState({
        workflowType: undefined as any,
        beats: corruptedBeats,
        narration: 'Test narration',
      });

      let renderError: any = null;
      try {
        render(<RenderStep />);
      } catch (err) {
        renderError = err;
      }

      // If w.workflowType.replace is called when workflowType is undefined, it crashes!
      expect(renderError).toBeNull();
    });

    it('CHALLENGE 3D: LivePlayer subtitle positioning bounds stress', () => {
      // Subtitle step is step 3
      useWizardStore.setState({
        step: 3,
        burnSubtitles: true,
        subtitleY: 78,
      });

      render(<LivePlayer />);

      // Verify LivePlayer renders interactive bounding box when on step 3
      expect(screen.getByText(/drag to position subtitles/i)).toBeInTheDocument();

      // Stress test applySubtitlePreset with all available presets
      for (const preset of SUBTITLE_PRESETS) {
        act(() => {
          useWizardStore.getState().applySubtitlePreset(preset.name);
        });
        expect(useWizardStore.getState().subtitlePreset).toBe(preset.name);
        expect(useWizardStore.getState().subtitleColor).toBe(preset.color);
      }

      // Stress test unknown preset fallback
      act(() => {
        useWizardStore.getState().applySubtitlePreset('NonExistentPreset_999');
      });
      expect(useWizardStore.getState().subtitlePreset).toBe('NonExistentPreset_999');
    });
  });
});
