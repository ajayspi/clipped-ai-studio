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
  ChevronRight,
  Globe,
  Cpu,
  Mic,
  Image as ImageIcon,
  Music,
  Video,
  Lock,
  Unlock,
  ArrowUpDown,
  Star,
  StarOff,
  Wifi,
  WifiOff,
  Clock,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Shield,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Provider {
  id: string;
  name: string;
  category: string;
  isFree: boolean;
  isConfigured: boolean;
  isActive: boolean;
  priority: number;
  defaultPriority: number;
  models: string[];
  isHealthy: boolean;
  latencyMs: number;
  checkedAt: string;
  error: string | null;
}

interface Summary {
  total: number;
  healthy: number;
  offline: number;
  byCategory: Record<string, { healthy: number; total: number; active?: string }>;
}

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  llm:   { label: "AI Models",    icon: <Cpu className="w-3.5 h-3.5" />,       color: "text-purple-400" },
  image: { label: "Stock Images", icon: <ImageIcon className="w-3.5 h-3.5" />, color: "text-blue-400"   },
  voice: { label: "Voice & TTS",  icon: <Mic className="w-3.5 h-3.5" />,       color: "text-green-400"  },
  music: { label: "Music",        icon: <Music className="w-3.5 h-3.5" />,     color: "text-yellow-400" },
  video: { label: "AI Video",     icon: <Video className="w-3.5 h-3.5" />,     color: "text-pink-400"   },
  media: { label: "Media",        icon: <Globe className="w-3.5 h-3.5" />,     color: "text-cyan-400"   },
};

// ─── Status Dot ───────────────────────────────────────────────────────────────

function StatusDot({ healthy, checking }: { healthy: boolean; checking?: boolean }) {
  if (checking) return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400" />
    </span>
  );
  return (
    <span className="relative flex h-2.5 w-2.5">
      {healthy && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-40" />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${healthy ? "bg-green-400" : "bg-red-500"}`} />
    </span>
  );
}

// ─── Latency Badge ────────────────────────────────────────────────────────────

function LatencyBadge({ ms }: { ms: number }) {
  const color = ms < 300 ? "text-green-400 bg-green-500/10" :
                ms < 800 ? "text-yellow-400 bg-yellow-500/10" :
                           "text-red-400 bg-red-500/10";
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${color}`}>
      {ms}ms
    </span>
  );
}

// ─── Provider Card ────────────────────────────────────────────────────────────

function ProviderCard({
  provider,
  isChecking,
  onToggle,
  onCheck,
  onPriorityChange,
  isActiveRouter,
}: {
  provider: Provider;
  isChecking: boolean;
  onToggle: (id: string, active: boolean) => void;
  onCheck: (id: string) => void;
  onPriorityChange: (id: string, delta: number) => void;
  isActiveRouter: boolean;
}) {
  const canUse = provider.isConfigured || provider.isFree;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative rounded-2xl border transition-all duration-300 overflow-hidden ${
        isActiveRouter
          ? "border-purple-500/60 bg-gradient-to-br from-purple-500/10 to-blue-500/5 shadow-lg shadow-purple-500/10"
          : provider.isActive && provider.isHealthy
            ? "border-green-500/30 bg-card/60"
            : provider.isActive && !provider.isHealthy
              ? "border-red-500/30 bg-red-950/10"
              : "border-border/40 bg-card/30 opacity-70"
      }`}
    >
      {/* Active Router Banner */}
      {isActiveRouter && (
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500" />
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <StatusDot healthy={provider.isHealthy} checking={isChecking} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold truncate">{provider.name}</span>
                {provider.isFree && (
                  <span className="px-1.5 py-0.5 rounded-md bg-green-500/15 text-green-400 text-[9px] font-bold tracking-wide">
                    FREE
                  </span>
                )}
                {isActiveRouter && (
                  <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[9px] font-bold">
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {provider.isHealthy
                  ? <span className="text-[10px] text-green-400 flex items-center gap-1"><Wifi className="w-3 h-3" /> Online</span>
                  : <span className="text-[10px] text-red-400 flex items-center gap-1"><WifiOff className="w-3 h-3" /> {provider.error || "Offline"}</span>
                }
                {provider.isHealthy && <LatencyBadge ms={provider.latencyMs} />}
              </div>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => onToggle(provider.id, !provider.isActive)}
            disabled={!canUse}
            className={`shrink-0 transition-colors ${!canUse ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
            title={provider.isActive ? "Disable" : "Enable"}
          >
            {provider.isActive
              ? <ToggleRight className="w-6 h-6 text-green-400" />
              : <ToggleLeft className="w-6 h-6 text-muted-foreground" />
            }
          </button>
        </div>

        {/* Models */}
        {provider.models && provider.models.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {provider.models.slice(0, 3).map((m) => (
              <span key={m} className="px-1.5 py-0.5 rounded-md bg-muted/50 text-muted-foreground text-[9px] font-mono truncate max-w-[120px]">
                {m.split('/').pop()}
              </span>
            ))}
            {provider.models.length > 3 && (
              <span className="px-1.5 py-0.5 text-[9px] text-muted-foreground">+{provider.models.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
          {/* Priority Adjuster */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Priority:</span>
            <button
              onClick={() => onPriorityChange(provider.id, -10)}
              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted text-xs"
            >−</button>
            <span className="text-[10px] font-bold w-6 text-center">{provider.priority}</span>
            <button
              onClick={() => onPriorityChange(provider.id, +10)}
              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted text-xs"
            >+</button>
          </div>

          {/* Re-check */}
          <button
            onClick={() => onCheck(provider.id)}
            disabled={isChecking}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? "animate-spin" : ""}`} />
            {isChecking ? "Checking..." : "Re-check"}
          </button>
        </div>

        {/* Not configured warning */}
        {!canUse && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-yellow-500/80 bg-yellow-500/5 rounded-lg px-2 py-1.5">
            <Lock className="w-3 h-3 shrink-0" />
            <span>Add API key in Settings → AI Models to enable</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ApiProviderHub() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/health");
      const data = await res.json();
      if (data.success) {
        setProviders(data.providers);
        setSummary(data.summary);
        setLastRefresh(new Date());
      }
    } catch (e) {
      console.error("Health check failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (autoRefresh) {
      pollRef.current = setInterval(load, 2 * 60 * 1000); // re-check every 2 minutes
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [autoRefresh, load]);

  async function handleToggle(id: string, active: boolean) {
    setProviders((prev) => prev.map((p) => p.id === id ? { ...p, isActive: active } : p));
    await fetch("/api/settings/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", providerId: id, isActive: active }),
    });
  }

  async function handleCheck(id: string) {
    setCheckingIds((prev) => new Set([...prev, id]));
    const res = await fetch("/api/settings/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check", providerId: id }),
    });
    const data = await res.json();
    if (data.success && data.checks?.[0]) {
      const ch = data.checks[0];
      setProviders((prev) => prev.map((p) =>
        p.id === id ? { ...p, isHealthy: ch.isHealthy, latencyMs: ch.latencyMs, error: ch.error } : p
      ));
    }
    setCheckingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }

  async function handlePriorityChange(id: string, delta: number) {
    const newPriority = Math.max(0, Math.min(100, (providers.find((p) => p.id === id)?.priority ?? 50) + delta));
    setProviders((prev) => prev.map((p) => p.id === id ? { ...p, priority: newPriority } : p));
    await fetch("/api/settings/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", providerId: id, priority: newPriority }),
    });
  }

  async function handleCheckAll() {
    setLoading(true);
    await fetch("/api/settings/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check_all" }),
    });
    await load();
  }

  const categories = ["all", "llm", "image", "voice", "music", "video", "media"];
  const filtered = providers.filter((p) => activeCategory === "all" || p.category === activeCategory);

  // Determine active router per category
  const activeRouterByCategory: Record<string, string> = {};
  for (const cat of categories.slice(1)) {
    const best = providers
      .filter((p) => p.category === cat && p.isActive && p.isHealthy && (p.isConfigured || p.isFree))
      .sort((a, b) => (b.priority + b.defaultPriority) - (a.priority + a.defaultPriority))[0];
    if (best) activeRouterByCategory[cat] = best.id;
  }

  const healthyCount = providers.filter((p) => p.isHealthy).length;
  const onlineRate = providers.length > 0 ? Math.round((healthyCount / providers.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total APIs", value: providers.length, color: "text-foreground", icon: <Globe className="w-4 h-4" /> },
          { label: "Online", value: healthyCount, color: "text-green-400", icon: <CheckCircle2 className="w-4 h-4" /> },
          { label: "Offline", value: providers.length - healthyCount, color: "text-red-400", icon: <XCircle className="w-4 h-4" /> },
          { label: "Uptime Rate", value: `${onlineRate}%`, color: onlineRate > 70 ? "text-green-400" : "text-yellow-400", icon: <Activity className="w-4 h-4" /> },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border/50 bg-card/50 p-4 flex items-center gap-3">
            <span className={stat.color}>{stat.icon}</span>
            <div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active Router Status */}
      {summary && (
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-blue-500/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold">Active Auto-Router</span>
              <span className="text-[10px] text-muted-foreground">— currently routing to these providers</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${autoRefresh ? "border-green-500/40 text-green-400 bg-green-500/10" : "border-border text-muted-foreground"}`}
              >
                {autoRefresh ? "Auto ✓" : "Auto Off"}
              </button>
              <button
                onClick={handleCheckAll}
                disabled={loading}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                Check All
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {Object.entries(summary.byCategory).map(([cat, info]) => {
              const meta = CATEGORY_META[cat];
              return (
                <div key={cat} className="rounded-xl bg-black/20 border border-white/5 p-2.5">
                  <div className={`flex items-center gap-1.5 mb-1 ${meta?.color || "text-muted-foreground"}`}>
                    {meta?.icon}
                    <span className="text-[9px] font-bold uppercase tracking-wider">{meta?.label || cat}</span>
                  </div>
                  <p className="text-xs font-semibold truncate">{info.active || "—"}</p>
                  <p className="text-[9px] text-muted-foreground">{info.healthy}/{info.total} online</p>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last checked: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat];
          const isAll = cat === "all";
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
              }`}
            >
              {isAll ? <Globe className="w-3 h-3" /> : meta?.icon}
              {isAll ? "All" : meta?.label || cat}
            </button>
          );
        })}
      </div>

      {/* Provider Grid */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="text-center">
            <Activity className="w-8 h-8 animate-pulse text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Pinging all APIs…</p>
          </div>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filtered.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                isChecking={checkingIds.has(provider.id)}
                onToggle={handleToggle}
                onCheck={handleCheck}
                onPriorityChange={handlePriorityChange}
                isActiveRouter={activeRouterByCategory[provider.category] === provider.id}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
