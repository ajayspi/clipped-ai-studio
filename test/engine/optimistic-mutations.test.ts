import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isViewTransitionSupported,
  transitionNavigate,
  getViewTransitionStyle,
} from '@/lib/utils/view-transitions';
import { DebouncedSyncQueue } from '@/lib/engine/optimistic-mutations';

describe('View Transitions & Smooth Studio Navigation', () => {
  it('detects view transition support correctly', () => {
    // In jsdom environment, startViewTransition may not exist by default
    const supported = isViewTransitionSupported();
    expect(typeof supported).toBe('boolean');
  });

  it('generates standard view-transition-name style objects', () => {
    const style1 = getViewTransitionStyle('video-player-123');
    expect(style1).toEqual({ viewTransitionName: 'video-player-123' });

    const styleEmpty = getViewTransitionStyle(undefined);
    expect(styleEmpty).toEqual({});
  });

  it('transitionNavigate falls back cleanly when startViewTransition is absent', async () => {
    const router = { push: vi.fn() };
    await transitionNavigate(router, '/editor/test-job');
    expect(router.push).toHaveBeenCalledWith('/editor/test-job');
  });

  it('transitionNavigate invokes startViewTransition when available', async () => {
    const router = { push: vi.fn() };
    const mockStartViewTransition = vi.fn((cb) => {
      cb();
      return { finished: Promise.resolve() };
    });

    // Mock document.startViewTransition
    (document as unknown as { startViewTransition: typeof mockStartViewTransition }).startViewTransition = mockStartViewTransition;

    await transitionNavigate(router, '/editor/job-456', { respectReducedMotion: false });
    expect(mockStartViewTransition).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/editor/job-456');

    // Clean up
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  });
});

describe('DebouncedSyncQueue & Optimistic State Sync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('enqueues mutations and flushes after specified delay', async () => {
    const flushSpy = vi.fn().mockResolvedValue(undefined);
    const queue = new DebouncedSyncQueue<string>(flushSpy, 300);

    queue.enqueue('mutation-1');
    expect(queue.getPending()).toBe('mutation-1');
    expect(flushSpy).not.toHaveBeenCalled();

    // Fast forward less than delay
    vi.advanceTimersByTime(200);
    expect(flushSpy).not.toHaveBeenCalled();

    // Fast forward to complete debounce
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    expect(flushSpy).toHaveBeenCalledWith('mutation-1');
    expect(queue.getPending()).toBe(null);
  });

  it('collapses rapid successive mutations into the single latest state', async () => {
    const flushSpy = vi.fn().mockResolvedValue(undefined);
    const queue = new DebouncedSyncQueue<number>(flushSpy, 250);

    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);
    queue.enqueue(4);

    expect(queue.getPending()).toBe(4);
    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();

    expect(flushSpy).toHaveBeenCalledTimes(1);
    expect(flushSpy).toHaveBeenCalledWith(4);
  });

  it('cancels pending sync when explicitly aborted', () => {
    const flushSpy = vi.fn().mockResolvedValue(undefined);
    const queue = new DebouncedSyncQueue<string>(flushSpy, 200);

    queue.enqueue('do-not-save');
    expect(queue.getPending()).toBe('do-not-save');

    queue.cancel();
    expect(queue.getPending()).toBe(null);

    vi.advanceTimersByTime(300);
    expect(flushSpy).not.toHaveBeenCalled();
  });

  it('manual flush dispatches immediately without waiting for timer', async () => {
    const flushSpy = vi.fn().mockResolvedValue(undefined);
    const queue = new DebouncedSyncQueue<string>(flushSpy, 500);

    queue.enqueue('instant-save');
    await queue.flush();

    expect(flushSpy).toHaveBeenCalledWith('instant-save');
    expect(queue.getPending()).toBe(null);
  });
});
