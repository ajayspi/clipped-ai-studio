/**
 * Native View Transitions & Smooth Studio Navigation
 * Inspired by React Router v7 native viewTransition API.
 * Provides smooth, morphing browser transitions between Dashboard video cards
 * and the Studio Editor timeline player without visual snapping or jank.
 */

"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export interface ViewTransitionOptions {
  /** Optional custom CSS view-transition-name to apply during navigation */
  viewTransitionName?: string;
  /** Whether to skip transition if user prefers reduced motion */
  respectReducedMotion?: boolean;
}

/**
 * Checks if the Document View Transitions API is available and enabled
 */
export function isViewTransitionSupported(): boolean {
  if (typeof document === "undefined") return false;
  return "startViewTransition" in document;
}

/**
 * Navigates to a target URL using document.startViewTransition if supported.
 * Falls back seamlessly to standard Next.js client-side navigation.
 */
export function transitionNavigate(
  router: { push: (href: string) => void },
  href: string,
  options: ViewTransitionOptions = {}
): Promise<void> {
  const { respectReducedMotion = true } = options;

  if (typeof window !== "undefined" && respectReducedMotion) {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      router.push(href);
      return Promise.resolve();
    }
  }

  if (isViewTransitionSupported()) {
    return new Promise((resolve) => {
      const transition = document.startViewTransition(() => {
        router.push(href);
      });

      if (transition?.finished) {
        transition.finished.then(() => resolve()).catch(() => resolve());
      } else {
        resolve();
      }
    });
  }

  router.push(href);
  return Promise.resolve();
}

/**
 * React Hook for executing seamless View Transitions between video studio views.
 */
export function useViewTransitionNavigate() {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const navigate = useCallback(
    async (href: string, options?: ViewTransitionOptions) => {
      setIsTransitioning(true);
      try {
        await transitionNavigate(router, href, options);
      } finally {
        setIsTransitioning(false);
      }
    },
    [router]
  );

  return {
    navigate,
    isTransitioning,
    isSupported: isViewTransitionSupported(),
  };
}

/**
 * Helper to build inline styles for matching view-transition-name between
 * thumbnail cards and target editor canvases.
 */
export function getViewTransitionStyle(name?: string): React.CSSProperties {
  if (!name) return {};
  return {
    viewTransitionName: name,
  };
}
