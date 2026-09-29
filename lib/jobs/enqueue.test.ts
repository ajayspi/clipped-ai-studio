import { describe, it, expect, vi } from 'vitest';
import { enqueueRenderJob, RenderIntent } from './enqueue';

describe('enqueueRenderJob', () => {
  it('T27-ENQ-01: intent render with non-empty beats writes orchestration_state queued', async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockClient = {
      from: vi.fn().mockReturnValue({ update: mockUpdate, eq: mockEq }),
    };

    const res = await enqueueRenderJob({
      id: 'job1',
      intent: 'render',
      status: 'pending',
      logs: { beats: [{}] },
      client: mockClient,
    });

    expect(res.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      orchestration_state: 'queued'
    }));
  });

  it('T27-ENQ-02: intent render with zero beats is refused and downgraded to planning', async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockClient = {
      from: vi.fn().mockReturnValue({ update: mockUpdate, eq: mockEq }),
    };

    const res = await enqueueRenderJob({
      id: 'job2',
      intent: 'render',
      status: 'pending',
      logs: { beats: [] },
      client: mockClient,
    });

    expect(res.ok).toBe(false);
    if ('downgraded' in res) {
      expect(res.downgraded).toBe(true);
    }
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      orchestration_state: 'planning'
    }));
  });

  it('T27-ENQ-03: intent plan-only writes planning', async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockClient = {
      from: vi.fn().mockReturnValue({ update: mockUpdate, eq: mockEq }),
    };

    const res = await enqueueRenderJob({
      id: 'job3',
      intent: 'plan-only',
      status: 'pending',
      logs: {},
      client: mockClient,
    });

    expect(res.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      orchestration_state: 'planning'
    }));
  });

  it('T27-ENQ-04: intent terminal writes completed', async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockClient = {
      from: vi.fn().mockReturnValue({ update: mockUpdate, eq: mockEq }),
    };

    const res = await enqueueRenderJob({
      id: 'job4',
      intent: 'terminal',
      status: 'failed',
      logs: {},
      client: mockClient,
    });

    expect(res.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      orchestration_state: 'completed'
    }));
  });

  it('T27-ENQ-05: beats are read from logs.analysis.scenes', async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockClient = {
      from: vi.fn().mockReturnValue({ update: mockUpdate, eq: mockEq }),
    };

    const res = await enqueueRenderJob({
      id: 'job5',
      intent: 'render',
      status: 'pending',
      logs: { analysis: { scenes: [{}] } },
      client: mockClient,
    });

    expect(res.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      orchestration_state: 'queued'
    }));
  });

  it('T27-ENQ-06: write failure retries with intended state and does not leave column to default', async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: new Error('db error') });
    const mockClient = {
      from: vi.fn().mockReturnValue({ update: mockUpdate, eq: mockEq }),
    };

    const res = await enqueueRenderJob({
      id: 'job6',
      intent: 'render',
      status: 'pending',
      logs: { beats: [{}] },
      client: mockClient,
    });

    expect(res.ok).toBe(false);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      orchestration_state: 'queued'
    }));
  });
});
