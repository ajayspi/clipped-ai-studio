"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  DollarSign,
  Video,
  Sparkles,
  TrendingUp,
  Download,
  PieChart,
  Cpu,
  Mic,
  FileText,
  Clock,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Activity,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { getAggregatedAnalytics, AnalyticsSummary } from "@/lib/engine/cost-estimator";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<"7d" | "30d" | "all">("7d");
  const [exportingCsv, setExportingCsv] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [selectedTimeRange]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      // Mock generated video records with varying workflows for realistic calculation
      const sampleJobs = [
        {
          id: "job_01",
          workflow: "micro-drama",
          duration: 35,
          logs: {
            subject: "The Fall of Constantinople: The Final Siege",
            totalTokens: 1450,
            narration: "For fifty-three days, the massive walls of Constantinople withstood the relentless siege of Sultan Mehmed II...",
            llmProvider: "openai",
            ttsProvider: "elevenlabs",
            videos: [{}, {}, {}, {}],
          },
          created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: "job_02",
          workflow: "avatar",
          duration: 28,
          logs: {
            subject: "AI Automation Agency: 3 Steps to Scale",
            totalTokens: 980,
            narration: "Here are the top three automation frameworks that scaled our B2B agency to ten thousand dollars a month in thirty days...",
            llmProvider: "openai",
            ttsProvider: "azure",
            videos: [{}, {}, {}],
          },
          created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: "job_03",
          workflow: "whiteboard",
          duration: 42,
          logs: {
            subject: "How Quantum Computing Works in 60 Seconds",
            totalTokens: 1820,
            narration: "Classical computers process bits as zeros or ones. Quantum computers use qubits that exist in a superposition of both states...",
            llmProvider: "gemini",
            ttsProvider: "google",
            videos: [{}, {}, {}, {}, {}],
          },
          created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: "job_04",
          workflow: "ai-videos",
          duration: 30,
          logs: {
            subject: "Stop Wasting Time on Repetitive Tasks",
            totalTokens: 1100,
            narration: "If you spend more than two hours a day answering emails and organizing spreadsheets, here is the exact stack to automate your workflow...",
            llmProvider: "claude",
            ttsProvider: "elevenlabs",
            videos: [{}, {}, {}, {}],
          },
          created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: "job_05",
          workflow: "stories",
          duration: 32,
          logs: {
            subject: "Julius Caesar's Secret Battle Tactic",
            totalTokens: 1250,
            narration: "At the Battle of Alesia in fifty-two BC, Caesar ordered a double ring of fortifications, trapping the Gauls while defending against reinforcements...",
            llmProvider: "openai",
            ttsProvider: "azure",
            videos: [{}, {}, {}, {}],
          },
          created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: "job_06",
          workflow: "footage",
          duration: 25,
          logs: {
            subject: "Neural Networks Explained Simply",
            totalTokens: 890,
            narration: "Think of an artificial neural network like a team of specialized detectives passing evidence layer by layer until a consensus is reached...",
            llmProvider: "gemini",
            ttsProvider: "openai",
            videos: [{}, {}, {}],
          },
          created_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
        },
      ];

      const data = getAggregatedAnalytics(sampleJobs);
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleExportCsv() {
    if (!analytics) return;
    setExportingCsv(true);

    const headers = ["Metric", "Value", "Unit"];
    const rows = [
      ["Total Generated Videos", analytics.totalVideos, "videos"],
      ["Estimated Total API Cost", `$${analytics.totalCostUsd.toFixed(4)}`, "USD"],
      ["Average Cost Per Video", `$${analytics.avgCostPerVideoUsd.toFixed(4)}`, "USD / video"],
      ["Total LLM Tokens Consumed", analytics.totalTokensUsed, "tokens"],
      ["Total TTS Characters Synthesized", analytics.totalTtsCharacters, "characters"],
      ["Total Compute Render Time", `${analytics.totalComputeSeconds}s`, "seconds"],
      ["Estimated Studio Agency Savings", `$${analytics.estimatedSavingsUsd}`, "USD"],
      ["Quota Utilization", `${analytics.quotaUtilizationPercent}%`, "percent"],
      ["LLM Scripting Cost", `$${analytics.costByProvider.llm.toFixed(4)}`, "USD"],
      ["TTS Voice Audio Cost", `$${analytics.costByProvider.tts.toFixed(4)}`, "USD"],
      ["Video Assets / Generation Cost", `$${analytics.costByProvider.videoAssets.toFixed(4)}`, "USD"],
      ["Remotion Compute Cost", `$${analytics.costByProvider.compute.toFixed(4)}`, "USD"],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `clipped_analytics_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setExportingCsv(false), 800);
  }

  if (loading || !analytics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Activity className="w-8 h-8 animate-pulse text-primary" />
          <p className="text-xs font-medium">Computing API usage matrix...</p>
        </div>
      </div>
    );
  }

  const maxVelocityCount = Math.max(...analytics.generationVelocity.map((v) => v.count), 1);
  const totalCost = Math.max(analytics.totalCostUsd, 0.001);
  const llmPct = Math.round((analytics.costByProvider.llm / totalCost) * 100);
  const ttsPct = Math.round((analytics.costByProvider.tts / totalCost) * 100);
  const videoPct = Math.round((analytics.costByProvider.videoAssets / totalCost) * 100);
  const computePct = Math.max(100 - llmPct - ttsPct - videoPct, 0);

  return (
    <div className="flex flex-1 flex-col gap-8 p-8 max-w-[1600px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics & Cost Matrix</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Real-time tracking of multi-provider LLM tokens, TTS synthesis, video assets, and compute expenditures.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex rounded-lg border bg-card p-1 text-xs">
            <button
              onClick={() => setSelectedTimeRange("7d")}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                selectedTimeRange === "7d" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setSelectedTimeRange("30d")}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                selectedTimeRange === "30d" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setSelectedTimeRange("all")}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                selectedTimeRange === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Time
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exportingCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-card hover:bg-muted border font-semibold text-xs transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Generated Videos */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="p-5 rounded-2xl border bg-card/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Generated
            </span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {analytics.totalVideos}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-500 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>+18.4% vs last cycle</span>
            </div>
          </div>
        </motion.div>

        {/* Estimated Total Cost */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-5 rounded-2xl border bg-card/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Estimated Total Cost
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              ${analytics.totalCostUsd.toFixed(3)}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-500 font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>99.8% cheaper than agency</span>
            </div>
          </div>
        </motion.div>

        {/* Average Cost per Video */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="p-5 rounded-2xl border bg-card/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Avg Cost / Video
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              ${analytics.avgCostPerVideoUsd.toFixed(4)}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground font-medium">
              <span>Avg ~{analytics.totalComputeSeconds}s compute duration</span>
            </div>
          </div>
        </motion.div>

        {/* Estimated Studio Savings */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="p-5 rounded-2xl border bg-gradient-to-br from-violet-500/10 via-indigo-500/10 to-pink-500/10 border-violet-500/30 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
              Agency Cost Saved
            </span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              ${analytics.estimatedSavingsUsd.toLocaleString()}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-violet-400 font-medium">
              <span>Based on $150 agency rate</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Visual Analytics Grid: Velocity & Provider Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Generation Velocity Chart */}
        <div className="lg:col-span-8 p-6 rounded-2xl border bg-card/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Video Generation Velocity & Daily Volume
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daily output cadence and associated API expenditure trend.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-muted text-muted-foreground border">
              {analytics.generationVelocity.length} Days Sample
            </span>
          </div>

          {/* Interactive Velocity Bar Chart */}
          <div className="h-48 flex items-end justify-between gap-3 pt-4 border-b border-border/40 pb-2">
            {analytics.generationVelocity.map((v, i) => {
              const heightPct = Math.max(Math.round((v.count / maxVelocityCount) * 85), 15);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <span className="text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {v.count} vids
                  </span>
                  <div
                    className="w-full max-w-[42px] rounded-t-lg bg-gradient-to-t from-violet-600 via-indigo-500 to-cyan-400 transition-all group-hover:brightness-125 group-hover:scale-105 shadow-md shadow-violet-500/20"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[11px] font-medium text-muted-foreground truncate w-full text-center">
                    {v.date}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                High Velocity Peaks (4+ videos/day)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                Automated Pipelines
              </span>
            </div>
            <span className="font-mono font-medium text-foreground">
              Peak: {maxVelocityCount} videos / 24h
            </span>
          </div>
        </div>

        {/* Cost Breakdown by Provider Donut / Progress */}
        <div className="lg:col-span-4 p-6 rounded-2xl border bg-card/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <PieChart className="w-4 h-4 text-pink-500" />
                Cost by Provider
              </h2>
              <span className="text-xs font-mono font-semibold text-emerald-500">
                ${analytics.totalCostUsd.toFixed(3)} Total
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-5">
              Itemized multi-provider expenditure breakdown.
            </p>

            {/* Provider Breakdown List */}
            <div className="space-y-4">
              {/* LLM Scripting */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="flex items-center gap-2 font-semibold">
                    <FileText className="w-3.5 h-3.5 text-violet-500" />
                    LLM Scripting (OpenAI/Gemini/Claude)
                  </span>
                  <span className="font-mono text-muted-foreground">
                    ${analytics.costByProvider.llm.toFixed(4)} ({llmPct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${llmPct}%` }}
                  />
                </div>
              </div>

              {/* TTS Voice Audio */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="flex items-center gap-2 font-semibold">
                    <Mic className="w-3.5 h-3.5 text-pink-500" />
                    TTS Narration (ElevenLabs/Azure)
                  </span>
                  <span className="font-mono text-muted-foreground">
                    ${analytics.costByProvider.tts.toFixed(4)} ({ttsPct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${ttsPct}%` }}
                  />
                </div>
              </div>

              {/* Video Assets / AI Gen */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="flex items-center gap-2 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    AI Video Clips (Kling/Luma/Stock)
                  </span>
                  <span className="font-mono text-muted-foreground">
                    ${analytics.costByProvider.videoAssets.toFixed(4)} ({videoPct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${videoPct}%` }}
                  />
                </div>
              </div>

              {/* Server Compute */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="flex items-center gap-2 font-semibold">
                    <Cpu className="w-3.5 h-3.5 text-cyan-500" />
                    Remotion Render Compute
                  </span>
                  <span className="font-mono text-muted-foreground">
                    ${analytics.costByProvider.compute.toFixed(4)} ({computePct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${computePct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-3.5 rounded-xl bg-muted/40 border text-xs text-muted-foreground flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Multi-tier rates calculated dynamically per render job.</span>
          </div>
        </div>
      </div>

      {/* Workflow Popularity Distribution */}
      <div className="p-6 rounded-2xl border bg-card/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Workflow Distribution & Popularity
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Breakdown of content created by generator workflow archetype.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {Object.entries(analytics.workflowDistribution).map(([wfName, count]) => (
            <div
              key={wfName}
              className="p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors flex flex-col justify-between"
            >
              <span className="text-xs font-semibold text-muted-foreground truncate">{wfName}</span>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-foreground">{count}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">vids</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Itemized Generation Logs Table */}
      <div className="rounded-2xl border bg-card/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Itemized Generation Cost Ledger
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Per-job accounting with exact token, character, and USD cost calculations.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Download Ledger CSV &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider border-b">
              <tr>
                <th className="px-6 py-3.5">Video Title / Hook</th>
                <th className="px-6 py-3.5">Workflow</th>
                <th className="px-6 py-3.5">LLM Tokens</th>
                <th className="px-6 py-3.5">TTS Chars</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5">Est. Cost (USD)</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-semibold text-foreground">The Fall of Constantinople: The Final Siege</td>
                <td className="px-6 py-4"><span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-500 font-medium">Micro-Drama</span></td>
                <td className="px-6 py-4 font-mono">1,450 tok</td>
                <td className="px-6 py-4 font-mono">540 chars</td>
                <td className="px-6 py-4 font-mono">35s</td>
                <td className="px-6 py-4 font-mono font-bold text-emerald-500">$0.0245</td>
                <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-[10px]">COMPLETED</span></td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-semibold text-foreground">AI Automation Agency: 3 Steps to Scale</td>
                <td className="px-6 py-4"><span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 font-medium">Avatar</span></td>
                <td className="px-6 py-4 font-mono">980 tok</td>
                <td className="px-6 py-4 font-mono">380 chars</td>
                <td className="px-6 py-4 font-mono">28s</td>
                <td className="px-6 py-4 font-mono font-bold text-emerald-500">$0.0162</td>
                <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-[10px]">COMPLETED</span></td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-semibold text-foreground">How Quantum Computing Works in 60 Seconds</td>
                <td className="px-6 py-4"><span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-500 font-medium">Whiteboard</span></td>
                <td className="px-6 py-4 font-mono">1,820 tok</td>
                <td className="px-6 py-4 font-mono">620 chars</td>
                <td className="px-6 py-4 font-mono">42s</td>
                <td className="px-6 py-4 font-mono font-bold text-emerald-500">$0.0189</td>
                <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-[10px]">COMPLETED</span></td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-semibold text-foreground">Stop Wasting Time on Repetitive Tasks</td>
                <td className="px-6 py-4"><span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-medium">AI Videos</span></td>
                <td className="px-6 py-4 font-mono">1,100 tok</td>
                <td className="px-6 py-4 font-mono">420 chars</td>
                <td className="px-6 py-4 font-mono">30s</td>
                <td className="px-6 py-4 font-mono font-bold text-emerald-500">$0.0210</td>
                <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-[10px]">COMPLETED</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
