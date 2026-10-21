"use client";

import React, { useState } from 'react';
import { Database, Download, Cloud, Key, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_MODELS = [
  { id: 'piper-en-us', name: 'Piper TTS (en-US-lessac)', type: 'Local TTS Model', size: '25 MB', status: 'installed' },
  { id: 'piper-hi-in', name: 'Piper TTS (hi-IN-swara)', type: 'Local TTS Model', size: '28 MB', status: 'available' },
  { id: 'onnx-face', name: 'ONNX Face Tracking Tracker', type: 'Computer Vision', size: '105 MB', status: 'available' },
  { id: 'whisper-tiny', name: 'Whisper.cpp (Tiny)', type: 'ASR Model', size: '75 MB', status: 'installed' },
];

export default function ModelManagerPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = (id: string) => {
    setDownloading(id);
    setTimeout(() => setDownloading(null), 2000); // Mock download delay
  };

  return (
    <div className="flex flex-col flex-1 p-6 space-y-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Model & Resource Manager</h1>
        <p className="text-muted-foreground max-w-3xl">
          Manage your cloud API connections, circuit breakers, and download local open-source models for completely offline, zero-cost generation (like Piper TTS and Whisper).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Local Models Section */}
        <div className="flex flex-col space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" /> Local Offline Models
          </h2>
          <div className="flex flex-col gap-3">
            {MOCK_MODELS.map((model) => (
              <div key={model.id} className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-colors">
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">{model.name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{model.type}</span>
                    <span>&bull;</span>
                    <span>{model.size}</span>
                  </div>
                </div>
                {model.status === 'installed' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-bold">
                    <CheckCircle className="w-4 h-4" /> Installed
                  </span>
                ) : (
                  <button
                    onClick={() => handleDownload(model.id)}
                    disabled={downloading === model.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-bold shadow-sm disabled:opacity-50"
                  >
                    {downloading === model.id ? 'Downloading...' : <><Download className="w-4 h-4" /> Download</>}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cloud APIs & Circuit Breakers */}
        <div className="flex flex-col space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Cloud className="w-5 h-5 text-indigo-500" /> Cloud API Connections
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col p-4 rounded-xl border border-border/60 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold">OmniRoute Gateway (LLM)</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">HTTP 200 OK</span>
              </div>
              <p className="text-xs text-muted-foreground">Circuit breaker is healthy. Fallback cascade is active.</p>
            </div>

            <div className="flex flex-col p-4 rounded-xl border border-border/60 bg-card space-y-3 border-red-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="font-semibold text-red-500">ElevenLabs TTS</span>
                </div>
                <span className="text-xs font-mono text-red-500">HTTP 402 Payment Required</span>
              </div>
              <p className="text-xs text-muted-foreground">Quota exceeded. Currently falling back to Google Translate TTS.</p>
              <button className="self-start inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <Key className="w-3 h-3" /> Update API Key
              </button>
            </div>

            <div className="flex flex-col p-4 rounded-xl border border-border/60 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-semibold">Fal.ai Video (Flux)</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">HTTP 200 OK</span>
              </div>
              <p className="text-xs text-muted-foreground">Active. Used for high-quality B-roll generation.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
