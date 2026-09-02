"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createClient,
  CUSTOM_CONFIG_STORAGE_KEY,
  CUSTOM_URL_COOKIE_KEY,
  CUSTOM_ANON_KEY_COOKIE_KEY,
  CustomSupabaseStorageConfig,
} from './client';

export type SupabaseConnectionStatus = 'connected' | 'default' | 'unreachable' | 'testing';

export interface TableStatus {
  exists: boolean;
  error?: string | null;
}

export interface SchemaStatus {
  isHealthy: boolean;
  tables: Record<string, TableStatus>;
  missingTables: string[];
}

export interface TestConnectionResult {
  success: boolean;
  reachable: boolean;
  latencyMs: number | null;
  url?: string;
  schema?: SchemaStatus;
  message: string;
  error?: string;
}

export interface SupabaseContextValue {
  supabase: SupabaseClient;
  url: string;
  anonKey: string;
  isCustom: boolean;
  status: SupabaseConnectionStatus;
  latencyMs: number | null;
  schemaStatus: SchemaStatus | null;
  setCustomConfig: (url: string, anonKey: string) => Promise<TestConnectionResult>;
  resetToDefault: () => void;
  testConnection: (url?: string, anonKey?: string) => Promise<TestConnectionResult>;
  refreshStatus: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextValue | null>(null);

function setCookies(url: string, anonKey: string) {
  if (typeof document === 'undefined') return;
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';
  document.cookie = `${CUSTOM_URL_COOKIE_KEY}=${encodeURIComponent(url)}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
  document.cookie = `${CUSTOM_ANON_KEY_COOKIE_KEY}=${encodeURIComponent(anonKey)}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
}

function clearCookies() {
  if (typeof document === 'undefined') return;
  document.cookie = `${CUSTOM_URL_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
  document.cookie = `${CUSTOM_ANON_KEY_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const defaultUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://agafustlankeieewtvck.supabase.co').trim();
  const defaultAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  const [url, setUrl] = useState<string>(defaultUrl);
  const [anonKey, setAnonKey] = useState<string>(defaultAnonKey);
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [status, setStatus] = useState<SupabaseConnectionStatus>('default');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [schemaStatus, setSchemaStatus] = useState<SchemaStatus | null>(null);

  // Dynamic client memoized on url and anonKey
  const supabase = useMemo(() => {
    return createClient(url, anonKey);
  }, [url, anonKey]);

  // Test connection to any endpoint or current endpoint
  const testConnection = useCallback(
    async (testUrl?: string, testKey?: string): Promise<TestConnectionResult> => {
      const targetUrl = (testUrl || url || defaultUrl).trim();
      const targetKey = (testKey || anonKey || defaultAnonKey).trim();

      try {
        const res = await fetch('/api/settings/supabase/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl, anonKey: targetKey }),
        });

        const data: TestConnectionResult = await res.json();
        return data;
      } catch (err: any) {
        return {
          success: false,
          reachable: false,
          latencyMs: null,
          url: targetUrl,
          schema: { isHealthy: false, tables: {}, missingTables: ['videos', 'render_jobs', 'settings', 'api_credits', 'scheduled_posts', 'users'] },
          message: err.message || 'Network error while testing connection.',
        };
      }
    },
    [url, anonKey, defaultUrl, defaultAnonKey]
  );

  // Set and persist custom configuration
  const setCustomConfig = useCallback(
    async (newUrl: string, newAnonKey: string): Promise<TestConnectionResult> => {
      const cleanUrl = newUrl.trim().replace(/\/+$/, '');
      const cleanKey = newAnonKey.trim();

      setStatus('testing');

      const testResult = await testConnection(cleanUrl, cleanKey);

      if (testResult.reachable) {
        const storageData: CustomSupabaseStorageConfig = {
          url: cleanUrl,
          anonKey: cleanKey,
          customConfigured: true,
          status: 'connected',
          lastTested: new Date().toISOString(),
          latencyMs: testResult.latencyMs,
        };

        try {
          localStorage.setItem(CUSTOM_CONFIG_STORAGE_KEY, JSON.stringify(storageData));
        } catch (err) {
          console.warn('Failed to save custom Supabase config in localStorage:', err);
        }

        setCookies(cleanUrl, cleanKey);

        setUrl(cleanUrl);
        setAnonKey(cleanKey);
        setIsCustom(true);
        setStatus('connected');
        setLatencyMs(testResult.latencyMs);
        if (testResult.schema) {
          setSchemaStatus(testResult.schema);
        }
      } else {
        setStatus('unreachable');
        setLatencyMs(testResult.latencyMs);
        if (testResult.schema) {
          setSchemaStatus(testResult.schema);
        }
      }

      return testResult;
    },
    [testConnection]
  );

  // Reset to default environment variables
  const resetToDefault = useCallback(() => {
    try {
      localStorage.removeItem(CUSTOM_CONFIG_STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to remove custom Supabase config from localStorage:', err);
    }

    clearCookies();

    setUrl(defaultUrl);
    setAnonKey(defaultAnonKey);
    setIsCustom(false);
    setStatus('default');
    setLatencyMs(null);
    setSchemaStatus(null);
  }, [defaultUrl, defaultAnonKey]);

  // Refresh status on demand
  const refreshStatus = useCallback(async () => {
    const result = await testConnection(url, anonKey);
    if (result.reachable) {
      setStatus(isCustom ? 'connected' : 'default');
      setLatencyMs(result.latencyMs);
      if (result.schema) {
        setSchemaStatus(result.schema);
      }
    } else {
      setStatus('unreachable');
      setLatencyMs(null);
      if (result.schema) {
        setSchemaStatus(result.schema);
      }
    }
  }, [testConnection, url, anonKey, isCustom]);

  // Hydrate custom config on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem(CUSTOM_CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed: CustomSupabaseStorageConfig = JSON.parse(raw);
        if (parsed.customConfigured && parsed.url && parsed.anonKey) {
          const cleanUrl = parsed.url.trim().replace(/\/+$/, '');
          const cleanKey = parsed.anonKey.trim();
          setUrl(cleanUrl);
          setAnonKey(cleanKey);
          setIsCustom(true);
          setStatus(parsed.status || 'connected');
          setLatencyMs(parsed.latencyMs || null);

          // Synchronize cookies to ensure SSR components work seamlessly
          setCookies(cleanUrl, cleanKey);
          return;
        }
      }
    } catch (err) {
      console.warn('Hydration error reading custom Supabase config:', err);
    }

    // Default fallback
    setUrl(defaultUrl);
    setAnonKey(defaultAnonKey);
    setIsCustom(false);
    setStatus('default');
  }, [defaultUrl, defaultAnonKey]);

  const value: SupabaseContextValue = useMemo(
    () => ({
      supabase,
      url,
      anonKey,
      isCustom,
      status,
      latencyMs,
      schemaStatus,
      setCustomConfig,
      resetToDefault,
      testConnection,
      refreshStatus,
    }),
    [
      supabase,
      url,
      anonKey,
      isCustom,
      status,
      latencyMs,
      schemaStatus,
      setCustomConfig,
      resetToDefault,
      testConnection,
      refreshStatus,
    ]
  );

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

export function useSupabase(): SupabaseContextValue {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}
