"use client";

import { useState, useEffect, useCallback } from "react";
import { ApiKeysMap, WorkflowStatusResult } from "@/lib/engine/types";
import {
  WORKFLOW_DEFINITIONS,
  ExtendedWorkflowDefinition,
  isProviderConfigured,
  evaluateWorkflowStatus,
} from "./workflow-definitions";

const CACHE_KEY = "clipped_api_keys_cache_v1";
let memoryCache: ApiKeysMap | null = null;
let inflightPromise: Promise<ApiKeysMap> | null = null;

async function fetchKeysFromApi(): Promise<ApiKeysMap> {
  if (inflightPromise) return inflightPromise;

  inflightPromise = (async () => {
    try {
      const res = await fetch("/api/settings/keys", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const keysMap: ApiKeysMap = data.keys || {};

      memoryCache = keysMap;
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ keys: keysMap, timestamp: Date.now() })
          );
        }
      } catch {
        // Ignore localStorage quota or private browsing errors
      }

      return keysMap;
    } catch (err) {
      console.warn("[useApiKeys] Could not fetch keys from API:", err);
      return memoryCache || {};
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKeysMap>(() => {
    if (memoryCache) return memoryCache;
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.keys && typeof parsed.keys === "object") {
            memoryCache = parsed.keys;
            return parsed.keys;
          }
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
    return {};
  });

  const [loading, setLoading] = useState<boolean>(() => Object.keys(keys).length === 0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchKeysFromApi();
      setKeys(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const checkProvider = useCallback(
    (provider: string): boolean => {
      return isProviderConfigured(provider, keys);
    },
    [keys]
  );

  const evaluate = useCallback(
    (workflow: string | ExtendedWorkflowDefinition): WorkflowStatusResult => {
      const wfDef =
        typeof workflow === "string" ? WORKFLOW_DEFINITIONS[workflow] : workflow;
      if (!wfDef) {
        return {
          status: "ready",
          costTier: "$",
          label: "Ready",
          requiredProviders: [],
          missingProviders: [],
          configuredProviders: [],
          fallbackAvailable: true,
          message: "Ready to generate",
        };
      }
      return evaluateWorkflowStatus(wfDef, keys);
    },
    [keys]
  );

  return {
    keys,
    loading,
    error,
    refresh,
    isProviderConfigured: checkProvider,
    evaluateWorkflow: evaluate,
  };
}
