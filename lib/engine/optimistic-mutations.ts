/**
 * Optimistic Studio Mutations & Auto-Sync Engine
 * Inspired by React Router v7 / Remix useFetcher & fetcher.formData pattern.
 * Enables zero-latency (0ms) timeline manipulation, workspace reassignment,
 * and beat reordering with automated debounced background persistence and rollback.
 */

"use client";

import { useState, useCallback } from "react";

export interface OptimisticMutationOptions<TState, TPayload> {
  /** Debounce delay in milliseconds before dispatching server persistence (default: 0) */
  debounceMs?: number;
  /** Callback invoked when server persistence fails */
  onError?: (err: Error, rollbackState: TState, payload: TPayload) => void;
  /** Callback invoked when server persistence succeeds */
  onSuccess?: (resultState: TState, payload: TPayload) => void;
}

export interface OptimisticMutationResult<TState, TPayload> {
  /** The current optimistic state reflecting latest user interaction immediately */
  state: TState;
  /** Whether a network persistence request is currently in-flight */
  isPending: boolean;
  /** Most recent error, if server persistence failed */
  error: Error | null;
  /** Execute an optimistic update: applies immediately to state, then syncs to server */
  mutate: (payload: TPayload) => Promise<void>;
  /** Explicitly revert state back to the last confirmed server state */
  rollback: () => void;
  /** Manually update the confirmed server state */
  setServerState: (state: TState) => void;
}

/**
 * Headless Debounced Sync Queue for rapid timeline edits (clip dragging, trimming, slider scrubbing).
 * Bundles rapid successive mutations into a single network payload after debounce delay.
 */
export class DebouncedSyncQueue<T> {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingPayload: T | null = null;
  private isProcessing = false;
  private onFlush: (payload: T) => Promise<void>;
  private delayMs: number;

  constructor(onFlush: (payload: T) => Promise<void>, delayMs = 400) {
    this.onFlush = onFlush;
    this.delayMs = delayMs;
  }

  enqueue(payload: T): void {
    this.pendingPayload = payload;
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.flush();
    }, this.delayMs);
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pendingPayload === null || this.isProcessing) return;

    const payloadToProcess = this.pendingPayload;
    this.pendingPayload = null;
    this.isProcessing = true;

    try {
      await this.onFlush(payloadToProcess);
    } finally {
      this.isProcessing = false;
      // If new payload arrived while processing, flush again
      if (this.pendingPayload !== null) {
        this.enqueue(this.pendingPayload);
      }
    }
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pendingPayload = null;
  }

  getPending(): T | null {
    return this.pendingPayload;
  }

  isFlushing(): boolean {
    return this.isProcessing;
  }
}

/**
 * React Hook for executing Optimistic Mutations with immediate UI state reflection
 * and safe background persistence.
 */
export function useOptimisticMutation<TState, TPayload>(
  initialState: TState,
  applyOptimistic: (current: TState, payload: TPayload) => TState,
  performMutation: (payload: TPayload, current: TState) => Promise<TState | void>,
  options: OptimisticMutationOptions<TState, TPayload> = {}
): OptimisticMutationResult<TState, TPayload> {
  const [state, setState] = useState<TState>(initialState);
  const [serverState, setServerState] = useState<TState>(initialState);
  const [prevInitialState, setPrevInitialState] = useState<TState>(initialState);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Adjust state during render if initialState changes externally (React recommended pattern)
  if (initialState !== prevInitialState) {
    setPrevInitialState(initialState);
    setState(initialState);
    setServerState(initialState);
  }

  const rollback = useCallback(() => {
    setState(serverState);
    setError(null);
  }, [serverState]);

  const mutate = useCallback(
    async (payload: TPayload) => {
      const rollbackState = serverState;
      // 1. Immediately apply optimistic state to UI (0ms latency)
      setState((prev) => applyOptimistic(prev, payload));
      setIsPending(true);
      setError(null);

      try {
        // 2. Perform background server action
        const result = await performMutation(payload, rollbackState);
        const nextConfirmed = result !== undefined ? result : applyOptimistic(rollbackState, payload);
        setServerState(nextConfirmed);
        options.onSuccess?.(nextConfirmed, payload);
      } catch (err: unknown) {
        const mutationError = err instanceof Error ? err : new Error(String(err));
        setError(mutationError);
        // 3. Rollback immediately on server rejection
        setState(rollbackState);
        options.onError?.(mutationError, rollbackState, payload);
      } finally {
        setIsPending(false);
      }
    },
    [applyOptimistic, performMutation, serverState, options]
  );

  return {
    state,
    isPending,
    error,
    mutate,
    rollback,
    setServerState,
  };
}
