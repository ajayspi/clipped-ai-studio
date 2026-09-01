"use client";

import React, { useState, useRef, useEffect } from "react";
import { Terminal, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { MissionStepStatus } from "@/lib/engine/types";

interface MissionLogConsoleProps {
  steps: MissionStepStatus[];
  error?: string;
}

interface LogEntry {
  id: string;
  time: string;
  level: "INFO" | "SUCCESS" | "WARN" | "ERROR";
  stage: string;
  message: string;
}

export function MissionLogConsole({ steps, error }: MissionLogConsoleProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Compile logs from steps and errors
  const logEntries: LogEntry[] = [];

  steps.forEach((step, idx) => {
    if (step.startedAt) {
      logEntries.push({
        id: `start-${idx}`,
        time: new Date(step.startedAt).toLocaleTimeString(),
        level: "INFO",
        stage: step.stage,
        message: `Initiating ${step.label}...`,
      });
    }

    if (step.log) {
      logEntries.push({
        id: `log-${idx}`,
        time: step.completedAt ? new Date(step.completedAt).toLocaleTimeString() : new Date().toLocaleTimeString(),
        level: step.status === "completed" ? "SUCCESS" : step.status === "failed" ? "ERROR" : "INFO",
        stage: step.stage,
        message: step.log,
      });
    }
  });

  if (error) {
    logEntries.push({
      id: "err-final",
      time: new Date().toLocaleTimeString(),
      level: "ERROR",
      stage: "pipeline",
      message: `Fatal error encountered: ${error}`,
    });
  }

  // Auto-scroll to bottom as new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logEntries.length]);

  const handleCopy = () => {
    const text = logEntries
      .map((e) => `[${e.time}] [${e.level}] [${e.stage}] ${e.message}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-violet-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Streaming Execution Console
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
            {logEntries.length} logs
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={logEntries.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-40"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Logs</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-muted/40 text-muted-foreground transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Log Output Area */}
      {isExpanded && (
        <div
          ref={scrollRef}
          className="p-4 bg-zinc-950 text-zinc-200 font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto space-y-1.5"
        >
          {logEntries.length === 0 ? (
            <div className="text-zinc-500 italic">Waiting for orchestrator logs...</div>
          ) : (
            logEntries.map((log) => (
              <div key={log.id} className="flex items-start gap-2 break-all">
                <span className="text-zinc-500 shrink-0 select-none">[{log.time}]</span>
                <span
                  className={`shrink-0 font-bold ${
                    log.level === "SUCCESS"
                      ? "text-emerald-400"
                      : log.level === "ERROR"
                      ? "text-rose-400"
                      : log.level === "WARN"
                      ? "text-amber-400"
                      : "text-sky-400"
                  }`}
                >
                  [{log.level}]
                </span>
                <span className="text-zinc-400">[{log.stage}]</span>
                <span className="text-zinc-100">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
