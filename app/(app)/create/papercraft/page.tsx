"use client";

import React from "react";
import Link from "next/link";
import { PapercraftStudio } from "@/components/2d-studio/PapercraftStudio";
import { Button } from "@/components/ui/button";
import {
  Newspaper,
  ArrowLeft,
  Zap,
} from "lucide-react";

export default function PapercraftStudioPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/create"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2.5 bg-gradient-to-br from-amber-600/20 to-orange-500/10 border border-amber-600/30 rounded-xl text-amber-500">
              <Newspaper className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-200 bg-clip-text text-transparent">
                Vox Papercraft Explainer & 3D Origami Studio
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Physical paper-cutout aesthetics, torn edges, fastener kits, 12 FPS stop-motion jitter, and 3D origami folding scene transitions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            Zero GPU / $0 Compute
          </span>
          <Link href="/create/stick-figure">
            <Button variant="outline" size="sm" className="border-slate-800 text-xs">
              Open 2D Studio
            </Button>
          </Link>
          <Link href="/create/whiteboard">
            <Button variant="outline" size="sm" className="border-slate-800 text-xs">
              Open Whiteboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Studio Interactive Container */}
      <div className="max-w-7xl mx-auto">
        <PapercraftStudio />
      </div>
    </div>
  );
}
