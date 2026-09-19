import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';

import AvatarCreatePage from '@/app/(app)/create/avatar/page';
import WhiteboardCreatePage from '@/app/(app)/create/whiteboard/page';

const MOCK_POSES: Record<string, any> = {
  pose_1: { name: 'Neutral Stand', description: 'Facing forward, neutral posture', svgPath: 'M 50 20 L 50 60', bbox: [10, 10, 80, 80] },
  pose_2: { name: 'Pointing Right', description: 'Arm extended pointing right', svgPath: 'M 50 20 L 80 40', bbox: [10, 10, 90, 80] },
  pose_3: { name: 'Thinking / Hand to Chin', description: 'Hand resting on chin', svgPath: 'M 50 20 L 50 40', bbox: [10, 10, 80, 80] },
  pose_4: { name: 'Explaining / Hands Open', description: 'Both hands gesturing outward', svgPath: 'M 30 40 L 70 40', bbox: [10, 10, 90, 80] },
  pose_5: { name: 'Excited / Arms Raised', description: 'Both arms raised in triumph', svgPath: 'M 20 20 L 50 50', bbox: [10, 10, 90, 90] },
  pose_6: { name: 'Writing on Board', description: 'Arm extended drawing on board', svgPath: 'M 50 30 L 70 20', bbox: [10, 10, 80, 80] },
  pose_7: { name: 'Perplexed / Head Scratch', description: 'Hand scratching back of head', svgPath: 'M 50 20 L 40 10', bbox: [10, 10, 80, 80] },
  pose_8: { name: 'Presenting / Holding Item', description: 'Holding diagram forward', svgPath: 'M 50 40 L 70 50', bbox: [10, 10, 80, 80] },
  pose_9: { name: 'Walking / Transition', description: 'Walking toward right side', svgPath: 'M 40 70 L 60 70', bbox: [10, 10, 80, 80] },
};

describe('Interactive Studio Routes (app/(app)/create/{avatar,whiteboard}/page.tsx)', () => {
  let router: ReturnType<typeof useRouter>;
  const baseFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    router = useRouter();
    global.fetch = baseFetch;
  });

  afterEach(() => {
    global.fetch = baseFetch;
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Suite 1: Avatar to Video Studio (app/(app)/create/avatar/page.tsx)
  // ==========================================================================
  describe('Avatar Studio Route (/create/avatar)', () => {
    it('mounts cleanly and renders framing preview, voice controls, and presets', () => {
      render(<AvatarCreatePage />);

      expect(screen.getByRole('heading', { level: 1, name: /avatar to video studio/i })).toBeInTheDocument();
      expect(screen.getByText('Sarah (Presenter)')).toBeInTheDocument();
      expect(screen.getByText('Marcus (Tech Anchor)')).toBeInTheDocument();
      expect(screen.getByText(/compositing layout/i)).toBeInTheDocument();
      expect(screen.getByText('PiP Bottom-Right')).toBeInTheDocument();
      expect(screen.getByText('Fullscreen Presenter')).toBeInTheDocument();
      expect(screen.getByText(/live framing canvas preview/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate talking head avatar video/i })).toBeInTheDocument();
    });

    it('switches compositing layout, avatar presets, and voice parameters', () => {
      render(<AvatarCreatePage />);

      // Switch layout to Fullscreen Presenter
      const fullscreenLayoutBtn = screen.getByRole('button', { name: /fullscreen presenter/i });
      fireEvent.click(fullscreenLayoutBtn);

      // Switch avatar preset to Marcus
      const marcusPresetBtn = screen.getByRole('button', { name: /marcus \(tech anchor\)/i });
      fireEvent.click(marcusPresetBtn);

      // Change voice to Onyx
      const voiceSelect = screen.getByRole('combobox');
      fireEvent.change(voiceSelect, { target: { value: 'onyx' } });

      // Change speed
      const speedSlider = screen.getByRole('slider');
      fireEvent.change(speedSlider, { target: { value: '1.25' } });

      expect(screen.getByText(/1\.25x/i)).toBeInTheDocument();
    });

    it('switches to Custom Photo tab and accepts image URL', () => {
      render(<AvatarCreatePage />);

      // Switch to Custom Photo tab
      const customTabBtn = screen.getByRole('button', { name: /custom photo/i });
      fireEvent.click(customTabBtn);

      expect(screen.getByPlaceholderText(/https:\/\/example\.com\/portrait\.jpg/i)).toBeInTheDocument();

      const urlInput = screen.getByPlaceholderText(/https:\/\/example\.com\/portrait\.jpg/i);
      fireEvent.change(urlInput, { target: { value: 'https://images.unsplash.com/photo-my-portrait.jpg' } });
      expect((urlInput as HTMLInputElement).value).toBe('https://images.unsplash.com/photo-my-portrait.jpg');
    });

    it('submits generation request to /api/workflows/avatar and navigates to mission page', async () => {
      const originalFetch = global.fetch;
      try {
        const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
          if (url.includes('/api/workflows/avatar') && init?.method === 'POST') {
            return Promise.resolve(
              new Response(JSON.stringify({ success: true, jobId: 'avatar-mission-123' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              })
            );
          }
          return originalFetch(url, init);
        });
        global.fetch = fetchSpy;

        render(<AvatarCreatePage />);

        const genBtn = screen.getByRole('button', { name: /generate talking head avatar video/i });
        fireEvent.click(genBtn);

        await waitFor(() => {
          expect(fetchSpy).toHaveBeenCalledWith(
            '/api/workflows/avatar',
            expect.objectContaining({
              method: 'POST',
              body: expect.stringContaining('sarah_presenter'),
            })
          );
          expect(router.push).toHaveBeenCalledWith('/create/mission/avatar-mission-123');
        });
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('handles API error response gracefully', async () => {
      const originalFetch = global.fetch;
      try {
        const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
          if (url.includes('/api/workflows/avatar')) {
            return Promise.resolve(
              new Response(JSON.stringify({ success: false, error: 'Avatar model service unavailable' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              })
            );
          }
          return originalFetch(url, init);
        });
        global.fetch = fetchSpy;

        render(<AvatarCreatePage />);

        const genBtn = screen.getByRole('button', { name: /generate talking head avatar video/i });
        fireEvent.click(genBtn);

        await waitFor(() => {
          expect(screen.getByText(/generation failed/i)).toBeInTheDocument();
        });
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  // ==========================================================================
  // Suite 2: Whiteboard Studio (app/(app)/create/whiteboard/page.tsx)
  // ==========================================================================
  describe('Whiteboard Studio Route (/create/whiteboard)', () => {
    it('mounts cleanly with mocked character sheet, renders 9 poses and controls', async () => {
      const originalFetch = global.fetch;
      try {
        const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
          if (url.includes('/api/workflows/whiteboard/character-sheet')) {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  archetype: 'stickman',
                  style: 'monoline_marker',
                  characterSheetSvg: '<svg></svg>',
                  poses: MOCK_POSES,
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            );
          }
          return originalFetch(url, init);
        });
        global.fetch = fetchSpy;

        render(<WhiteboardCreatePage />);

        expect(screen.getByRole('heading', { level: 1, name: /whiteboard animation studio/i })).toBeInTheDocument();
        expect(screen.getByText('Stickman')).toBeInTheDocument();
        expect(screen.getByText('Ancient Saint')).toBeInTheDocument();
        expect(screen.getByText('Wise Old Man')).toBeInTheDocument();
        expect(screen.getByText('Monoline Marker')).toBeInTheDocument();
        expect(screen.getByText('Classic Chalkboard')).toBeInTheDocument();

        // Verify character sheet 9-pose grid loads
        await waitFor(() => {
          expect(screen.getByText('Neutral Stand')).toBeInTheDocument();
          expect(screen.getByText('Pointing Right')).toBeInTheDocument();
        });

        // Click pose 2 to preview
        const pose2Btn = screen.getByRole('button', { name: /pointing right/i });
        fireEvent.click(pose2Btn);

        // Verify active pose detail box shows name, description, and bbox
        expect(screen.getByText(/POSE_2: Pointing Right/i)).toBeInTheDocument();
        expect(screen.getByText(/Arm extended pointing right/i)).toBeInTheDocument();
        expect(screen.getByText(/BBox: \[10, 10, 90, 80\]/i)).toBeInTheDocument();
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('safeguards against missing poses in character sheet API response (defensive check)', async () => {
      const originalFetch = global.fetch;
      try {
        const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
          if (url.includes('/api/workflows/whiteboard/character-sheet')) {
            // Returns character sheet without poses property
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  archetype: 'stickman',
                  style: 'monoline_marker',
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            );
          }
          return originalFetch(url, init);
        });
        global.fetch = fetchSpy;

        // Must mount without throwing TypeError: Cannot read properties of undefined (reading 'pose_1')
        expect(() => render(<WhiteboardCreatePage />)).not.toThrow();

        await waitFor(() => {
          expect(screen.getByText('Stickman')).toBeInTheDocument();
        });
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('submits whiteboard generation to /api/workflows/whiteboard and navigates to mission page', async () => {
      const originalFetch = global.fetch;
      try {
        const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
          if (url.includes('/api/workflows/whiteboard/character-sheet')) {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  archetype: 'stickman',
                  style: 'monoline_marker',
                  poses: MOCK_POSES,
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            );
          }
          if (url.includes('/api/workflows/whiteboard') && init?.method === 'POST') {
            return Promise.resolve(
              new Response(JSON.stringify({ success: true, jobId: 'wb-mission-456' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              })
            );
          }
          return originalFetch(url, init);
        });
        global.fetch = fetchSpy;

        render(<WhiteboardCreatePage />);

        const genBtn = screen.getByRole('button', { name: /generate whiteboard explainer video/i });
        fireEvent.click(genBtn);

        await waitFor(() => {
          expect(fetchSpy).toHaveBeenCalledWith(
            '/api/workflows/whiteboard',
            expect.objectContaining({
              method: 'POST',
              body: expect.stringContaining('stickman'),
            })
          );
          expect(router.push).toHaveBeenCalledWith('/create/mission/wb-mission-456');
        });
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
