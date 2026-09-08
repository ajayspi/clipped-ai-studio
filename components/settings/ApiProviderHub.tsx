"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Server,
  Wifi,
  WifiOff,
  Clock,
  Shield,
  Sparkles,
  Cpu,
  ArrowUpRight,
  Sliders,
  Check,
  Globe,
} from "lucide-react";

interface OmniGatewayStatus {
  success: boolean;
  endpointUrl: string;
  latencyMs: number;
  models: string[];
  modelCount: number;
  isConfigured: boolean;
  source: string;
  message?: string;
  error?: string;
  checkedAt: string;
}

export function ApiProviderHub() {
  const [status, setStatus] = useState<OmniGatewayStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [checking, setChecking] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const checkHealth = useCallback(async (isManual = false) => {
    if (isManual) setChecking(true);
    try {
      // 1. Fetch current settings keys to resolve stored endpoint
      const keysRes = await fetch("/api/settings/keys");
      const keysData = await keysRes.json().catch(() => ({}));
      const endpoint = keysData.endpointUrl || keysData.omniroute?.endpointUrl || "http://localhost:20128/v1";
      const isConfigured = Boolean(keysData.isConfigured || keysData.omniroute?.isConfigured);
      const source = keysData.source || keysData.omniroute?.source || "default";

      // 2. Perform connection probe via /api/settings/keys/check
      const checkRes = await fetch("/api/settings/keys/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpointUrl: endpoint }),
      });
      const checkData = await checkRes.json().catch(() => ({}));

      setStatus({
        success: Boolean(checkData.success),
        endpointUrl: endpoint,
        latencyMs: typeof checkData.latencyMs === "number" ? checkData.latencyMs : 0,
        models: Array.isArray(checkData.models) ? checkData.models : [],
        modelCount: Array.isArray(checkData.models) ? checkData.models.length : (checkData.modelCount || 0),
        isConfigured,
        source,
        message: checkData.message,
        error: checkData.error,
        checkedAt: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      setStatus({
        success: false,
        endpointUrl: "http://localhost:20128/v1",
        latencyMs: 0,
        models: [],
        modelCount: 0,
        isConfigured: false,
        source: "unknown",
        error: err.message || "Failed to contact OmniRoute health probe",
        checkedAt: new Date().toLocaleTimeString(),
      });
    } finally {
      setLoading(false);
      if (isManual) setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth(false);
  }, [checkHealth]);

  // Polling loop (every 30 seconds if enabled)
  useEffect(() => {
    if (!autoRefresh) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    pollTimerRef.current = setInterval(() => {
      checkHealth(false);
    }, 30000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [autoRefresh, checkHealth]);

  return (
    <div className="space-y-6">
      {/* ── Main Gateway Health Card ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">OmniRoute AI Gateway</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/20">
                  Unified Router
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Centralized upstream gateway routing all LLM chat, vision, and speech requests.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                autoRefresh
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-muted text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{autoRefresh ? "Auto-refresh: 30s" : "Auto-refresh: Off"}</span>
            </button>
            <button
              onClick={() => checkHealth(true)}
              disabled={checking || loading}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
              <span>{checking ? "Checking..." : "Re-test Gateway"}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-3 text-sm text-muted-foreground">Probing OmniRoute Gateway...</span>
            </div>
          ) : (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Connection Status */}
                <div className="p-4 rounded-xl border border-border/50 bg-muted/10 flex flex-col justify-between gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Gateway Health</span>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      {status?.success && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-3 w-3 ${
                          status?.success ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      />
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        status?.success ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {status?.success ? "Online & Healthy" : "Offline / Unreachable"}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {status?.checkedAt ? `Last checked ${status.checkedAt}` : "Not yet tested"}
                  </span>
                </div>

                {/* 2. Latency Measurement */}
                <div className="p-4 rounded-xl border border-border/50 bg-muted/10 flex flex-col justify-between gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Round-Trip Latency</span>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-xl font-bold font-mono text-foreground">
                      {status?.success ? `${status.latencyMs}ms` : "--"}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {status?.latencyMs && status.latencyMs < 100
                      ? "⚡ Ultra-low latency"
                      : status?.latencyMs && status.latencyMs < 300
                      ? "Good response time"
                      : "HTTP /v1/models probe"}
                  </span>
                </div>

                {/* 3. Available Models */}
                <div className="p-4 rounded-xl border border-border/50 bg-muted/10 flex flex-col justify-between gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Available Models</span>
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    <span className="text-xl font-bold font-mono text-foreground">
                      {status?.modelCount ?? 0}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Exposed via gateway endpoint
                  </span>
                </div>

                {/* 4. Configuration State */}
                <div className="p-4 rounded-xl border border-border/50 bg-muted/10 flex flex-col justify-between gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Storage Source</span>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold capitalize text-foreground">
                      {status?.source || "default"}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {status?.isConfigured ? "Custom credentials stored" : "Using system defaults"}
                  </span>
                </div>
              </div>

              {/* Endpoint Address Banner */}
              <div className="p-4 rounded-xl border border-border/50 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <Globe className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground font-medium shrink-0">Gateway Endpoint:</span>
                  <code className="font-mono text-foreground bg-background px-2 py-0.5 rounded border select-all">
                    {status?.endpointUrl}
                  </code>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground">Protocol:</span>
                  <span className="font-mono text-[11px] bg-background px-2 py-0.5 rounded border text-foreground">
                    OpenAI v1 REST API
                  </span>
                </div>
              </div>

              {/* Error Alert if Offline */}
              {!status?.success && (
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold">Gateway Unreachable</div>
                    <p className="text-red-400/90 leading-relaxed">
                      {status?.error || status?.message || "Failed to reach OmniRoute Gateway on the configured endpoint."}
                    </p>
                    <p className="text-muted-foreground text-[11px] mt-1">
                      Tip: If running locally, verify the OmniRoute server is active on port 20128, or update the Endpoint URL in the OmniRoute AI tab.
                    </p>
                  </div>
                </div>
              )}

              {/* Models Catalog Section */}
              {status?.models && status.models.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      Active Gateway Models ({status.models.length})
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      Ready for auto-routing & synthesis
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {status.models.map((model) => (
                      <div
                        key={model}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/50 transition-colors text-xs font-mono text-foreground"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span>{model}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
