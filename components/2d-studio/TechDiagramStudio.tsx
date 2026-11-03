"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Network,
  Cpu,
  Workflow,
  Code2,
  BarChart3,
  Volume2,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  Send,
  Sparkles,
  Mic,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VisoTalkStudio } from './VisoTalkStudio';
import {
  WAVEDROM_PRESETS,
  WaveDromOverlay,
  generateWaveDromHtml,
  type WaveJson,
} from '@/lib/engine/wavedrom-renderer';
import {
  INFRASTRUCTURE_PRESETS,
  getInfraNodeVisuals,
  generateInfrastructureDiagramHtml,
  type InfraDiagramSpec,
} from '@/lib/engine/infrastructure-diagrams';
import {
  generateLanshuDiagramHtml,
  type LanshuDiagramSpec,
} from '@/lib/engine/hyperframe-orchestrator';
import {
  CODE_MORPH_PRESETS,
  CodeMorphViewer,
  generateCodeMorphHtml,
  type CodeMorphSpec,
} from '@/lib/engine/code-morph-engine';
import {
  BAR_CHART_PRESETS,
  BarChartRaceViewer,
  generateBarChartRaceHtml,
  type BarChartRaceSpec,
} from '@/lib/engine/bar-chart-race';
import {
  playBrowserProceduralSfx,
  getFoleyFilterDefinition,
  type FoleyType,
} from '@/lib/engine/procedural-foley';

// ============================================================================
// Curated Lanshu Architecture Presets
// ============================================================================

const LANSHU_PRESETS: Record<string, { title: string; spec: LanshuDiagramSpec }> = {
  llm_orchestrator: {
    title: "LLM Agent Swarm & Vector RAG Pipeline",
    spec: {
      title: { prefix: "AUTONOMOUS", highlight: "AI AGENT SWARM", subtitle: "Zero-GPU Distributed Event Loop" },
      inputs: [{ icon: "prompt", label: "User Prompt" }, { icon: "docs", label: "Knowledge Base" }],
      core: {
        cards: [
          { title: "Query Classifier & Router", description: "Evaluates intent and selects subagent archetype" },
          { title: "Semantic Vector Search", description: "pgvector similarity matching across embeddings" },
          { title: "Parallel Swarm Execution", description: "Independent workers refine code and write diffs" },
        ],
        decision: { label: "Passes 100% E2E Contract Tests?" },
      },
    },
  },
  microservices_gateway: {
    title: "Edge API Gateway & Microservices",
    spec: {
      title: { prefix: "DISTRIBUTED", highlight: "EDGE GATEWAY", subtitle: "Fastify + Redis + PostgreSQL" },
      inputs: [{ icon: "http", label: "HTTPS / API Request" }],
      core: {
        cards: [
          { title: "Cloudflare Edge Worker", description: "DDoS mitigation and JWT token verification" },
          { title: "Fastify Gateway Service", description: "Rate limiting and service mesh routing" },
          { title: "Redis BullMQ Queue", description: "Background job buffering and worker dispatch" },
        ],
        decision: { label: "Rate Limit Exceeded?" },
      },
    },
  },
};

const FOLEY_ITEMS: Array<{ type: FoleyType; name: string; description: string }> = [
  { type: 'whoosh', name: 'Cinematic Whoosh', description: 'Dynamic brown noise sweep with bandpass filter' },
  { type: 'pop', name: 'Word Pop', description: 'Instantaneous sine pitch drop (650Hz -> 70Hz)' },
  { type: 'click', name: 'Mechanical Click', description: 'White noise burst for UI toggles' },
  { type: 'riser', name: 'Dramatic Riser', description: 'Rising pitch ramp building narrative suspense' },
  { type: 'ding', name: 'Victory Ding', description: 'High frequency pure bell chime with exponential decay' },
];

export type StudioTab = 'signals' | 'code_morph' | 'chart_race' | 'foley' | 'network' | 'architecture' | 'visotalk';

export function TechDiagramStudio() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<StudioTab>('signals');
  
  // WaveDrom State
  const [selectedWaveKey, setSelectedWaveKey] = useState<string>('spi_transaction');
  const [waveJson, setWaveJson] = useState<WaveJson>(WAVEDROM_PRESETS.spi_transaction.waveJson);
  const [waveProgress, setWaveProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Code Morph State
  const [selectedCodeKey, setSelectedCodeKey] = useState<string>('rsc_streaming');
  const [codeSpec, setCodeSpec] = useState<CodeMorphSpec>(CODE_MORPH_PRESETS.rsc_streaming.spec);
  const [codeProgress, setCodeProgress] = useState<number>(0);

  // Bar Chart Race State
  const [selectedChartKey, setSelectedChartKey] = useState<string>('ai_frontier_mmlu');
  const [chartSpec, setChartSpec] = useState<BarChartRaceSpec>(BAR_CHART_PRESETS.ai_frontier_mmlu.spec);
  const [chartProgress, setChartProgress] = useState<number>(0);

  // Foley State
  const [selectedFoleyType, setSelectedFoleyType] = useState<FoleyType>('whoosh');

  // Network State
  const [selectedInfraKey, setSelectedInfraKey] = useState<string>('pfsense_ha_truenas');
  const [infraSpec, setInfraSpec] = useState<InfraDiagramSpec>(INFRASTRUCTURE_PRESETS.pfsense_ha_truenas.spec);

  // Lanshu State
  const [selectedLanshuKey, setSelectedLanshuKey] = useState<string>('llm_orchestrator');
  const [lanshuSpec, setLanshuSpec] = useState<LanshuDiagramSpec>(LANSHU_PRESETS.llm_orchestrator.spec);

  // General Controls
  const [copied, setCopied] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Master Animation Loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (activeTab === 'signals') {
        setWaveProgress((prev) => (prev >= 1 ? 0 : prev + 0.015));
      } else if (activeTab === 'code_morph') {
        setCodeProgress((prev) => (prev >= 1 ? 0 : prev + 0.012));
      } else if (activeTab === 'chart_race') {
        setChartProgress((prev) => (prev >= 1 ? 0 : prev + 0.008));
      }
    }, 40);
    return () => clearInterval(interval);
  }, [isPlaying, activeTab]);

  const handleCopySpec = () => {
    let payload = '';
    if (activeTab === 'signals') payload = JSON.stringify(waveJson, null, 2);
    else if (activeTab === 'network') payload = JSON.stringify(infraSpec, null, 2);
    else if (activeTab === 'architecture') payload = JSON.stringify(lanshuSpec, null, 2);
    else if (activeTab === 'code_morph') payload = JSON.stringify(codeSpec, null, 2);
    else if (activeTab === 'chart_race') payload = JSON.stringify(chartSpec, null, 2);
    else if (activeTab === 'foley') payload = JSON.stringify(getFoleyFilterDefinition(selectedFoleyType), null, 2);

    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadHtml = () => {
    let htmlContent = '';
    let filename = 'diagram.html';

    if (activeTab === 'signals') {
      htmlContent = generateWaveDromHtml(waveJson);
      filename = `${selectedWaveKey}_wavedrom.html`;
    } else if (activeTab === 'network') {
      htmlContent = generateInfrastructureDiagramHtml(infraSpec);
      filename = `${selectedInfraKey}_network.html`;
    } else if (activeTab === 'architecture') {
      htmlContent = generateLanshuDiagramHtml(lanshuSpec);
      filename = `${selectedLanshuKey}_architecture.html`;
    } else if (activeTab === 'code_morph') {
      htmlContent = generateCodeMorphHtml(codeSpec);
      filename = `${selectedCodeKey}_code_morph.html`;
    } else if (activeTab === 'chart_race') {
      htmlContent = generateBarChartRaceHtml(chartSpec);
      filename = `${selectedChartKey}_bar_chart_race.html`;
    } else if (activeTab === 'foley') {
      const def = getFoleyFilterDefinition(selectedFoleyType);
      htmlContent = `<!-- Procedural Foley Definition -->\n<!-- Input: ${def.inputSource} -->\n<!-- Filter: ${def.filterChain} -->\n<!-- Duration: ${def.duration}s -->`;
      filename = `${selectedFoleyType}_foley.txt`;
    }

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendToQueue = async () => {
    setSubmitting(true);
    try {
      const promptDescription = 
        activeTab === 'signals' ? `WaveDrom Timing: ${waveJson.head?.text || selectedWaveKey}` :
        activeTab === 'network' ? `Infrastructure: ${infraSpec.title}` :
        activeTab === 'code_morph' ? `Code Morph: ${codeSpec.title || selectedCodeKey}` :
        activeTab === 'chart_race' ? `Bar Chart Race: ${chartSpec.title}` :
        activeTab === 'foley' ? `Procedural Foley: ${selectedFoleyType}` :
        `Architecture: ${lanshuSpec.title.prefix} ${lanshuSpec.title.highlight}`;

      const res = await fetch('/api/workflows/code-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptDescription }),
      });
      const data = await res.json();
      if (data.jobId) {
        router.push('/queue');
      } else {
        alert(data.error || 'Failed to enqueue render job');
      }
    } catch {
      alert('Network error while enqueueing job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col h-full bg-background text-foreground">
      {/* Top Studio Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Technical Architecture & Motion Studio</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                SOTA High-Retention Engines
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Create animated code morphs, racing bar charts, zero-asset procedural foley, digital waveforms, and system diagrams at $0 GPU cost.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySpec}
            className="text-xs gap-1.5"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy Spec'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadHtml}
            className="text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export Spec/HTML
          </Button>
          <Button
            size="sm"
            onClick={handleSendToQueue}
            disabled={submitting}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs gap-1.5 shadow-sm"
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? 'Enqueueing...' : 'Send to Queue'}
          </Button>
        </div>
      </header>

      {/* Mode Navigation Tabs */}
      <div className="border-b border-border bg-muted/30 px-6 py-2 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('signals')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
            activeTab === 'signals'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Cpu className="h-3.5 w-3.5" />
          Digital Waveforms (WaveDrom)
        </button>
        <button
          onClick={() => setActiveTab('code_morph')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
            activeTab === 'code_morph'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Code2 className="h-3.5 w-3.5" />
          Code Token Morph (Fireship)
        </button>
        <button
          onClick={() => setActiveTab('chart_race')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
            activeTab === 'chart_race'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Bar Chart Race (Sigmoid)
        </button>
        <button
          onClick={() => setActiveTab('foley')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
            activeTab === 'foley'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Volume2 className="h-3.5 w-3.5" />
          Procedural Foley ($0 SFX)
        </button>
        <button
          onClick={() => setActiveTab('network')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
            activeTab === 'network'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Network className="h-3.5 w-3.5" />
          Enterprise Network (Lawrence Systems)
        </button>
        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
            activeTab === 'architecture'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Workflow className="h-3.5 w-3.5" />
          System Architecture (Lanshu Style)
        </button>
        <button
          onClick={() => setActiveTab('visotalk')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
            activeTab === 'visotalk'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mic className="h-3.5 w-3.5" />
          Word-Anchored (VisoTalk)
        </button>
      </div>

      {activeTab === 'visotalk' ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          <VisoTalkStudio />
        </div>
      ) : (
      /* Main Studio Workspace */
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-y-auto">
        {/* Left Controls & Preset Shelf */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="p-4 rounded-xl border border-border bg-card/50 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                Curated Presets & Models
              </span>
            </div>

            {/* Mode 1: WaveDrom Presets */}
            {activeTab === 'signals' && (
              <div className="flex flex-col gap-2">
                {Object.entries(WAVEDROM_PRESETS).map(([key, item]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedWaveKey(key);
                      setWaveJson(item.waveJson);
                    }}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      selectedWaveKey === key
                        ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300 font-semibold'
                        : 'border-border bg-background/50 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <div className="font-semibold text-foreground">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{item.description}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Mode 2: Code Morph Presets */}
            {activeTab === 'code_morph' && (
              <div className="flex flex-col gap-2">
                {Object.entries(CODE_MORPH_PRESETS).map(([key, item]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedCodeKey(key);
                      setCodeSpec(item.spec);
                    }}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      selectedCodeKey === key
                        ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300 font-semibold'
                        : 'border-border bg-background/50 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <div className="font-semibold text-foreground">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{item.description}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Mode 3: Bar Chart Race Presets */}
            {activeTab === 'chart_race' && (
              <div className="flex flex-col gap-2">
                {Object.entries(BAR_CHART_PRESETS).map(([key, item]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedChartKey(key);
                      setChartSpec(item.spec);
                    }}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      selectedChartKey === key
                        ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300 font-semibold'
                        : 'border-border bg-background/50 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <div className="font-semibold text-foreground">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{item.description}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Mode 4: Procedural Foley Presets */}
            {activeTab === 'foley' && (
              <div className="flex flex-col gap-2">
                {FOLEY_ITEMS.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => {
                      setSelectedFoleyType(item.type);
                      playBrowserProceduralSfx(item.type);
                    }}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between ${
                      selectedFoleyType === item.type
                        ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300 font-semibold'
                        : 'border-border bg-background/50 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-foreground">{item.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{item.description}</div>
                    </div>
                    <Volume2 className="h-4 w-4 shrink-0 text-cyan-400 ml-2" />
                  </button>
                ))}
              </div>
            )}

            {/* Mode 5: Network Topology Presets */}
            {activeTab === 'network' && (
              <div className="flex flex-col gap-2">
                {Object.entries(INFRASTRUCTURE_PRESETS).map(([key, item]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedInfraKey(key);
                      setInfraSpec(item.spec);
                    }}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      selectedInfraKey === key
                        ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300 font-semibold'
                        : 'border-border bg-background/50 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <div className="font-semibold text-foreground">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{item.description}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Mode 6: Lanshu Presets */}
            {activeTab === 'architecture' && (
              <div className="flex flex-col gap-2">
                {Object.entries(LANSHU_PRESETS).map(([key, item]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedLanshuKey(key);
                      setLanshuSpec(item.spec);
                    }}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      selectedLanshuKey === key
                        ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300 font-semibold'
                        : 'border-border bg-background/50 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <div className="font-semibold text-foreground">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {item.spec.title.prefix} {item.spec.title.highlight}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timeline Animation Scrubbers */}
          {(activeTab === 'signals' || activeTab === 'code_morph' || activeTab === 'chart_race') && (
            <div className="p-4 rounded-xl border border-border bg-card/50 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Playhead Progress</span>
                <span className="font-mono text-cyan-400">
                  {Math.round(
                    (activeTab === 'signals' ? waveProgress : activeTab === 'code_morph' ? codeProgress : chartProgress) * 100
                  )}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={activeTab === 'signals' ? waveProgress : activeTab === 'code_morph' ? codeProgress : chartProgress}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (activeTab === 'signals') setWaveProgress(val);
                  else if (activeTab === 'code_morph') setCodeProgress(val);
                  else setChartProgress(val);
                  setIsPlaying(false);
                }}
                className="w-full accent-cyan-500"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-xs gap-1.5 w-full mt-1"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {isPlaying ? 'Pause Motion' : 'Play Timeline'}
              </Button>
            </div>
          )}
        </div>

        {/* Right Live Stage Canvas */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex-1 min-h-[520px] rounded-2xl border border-border bg-zinc-950 p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
            {/* Background Grid Accent */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(56, 189, 248, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.1) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />

            {/* Active Stage Renderer */}
            <div className="z-10 w-full flex flex-col items-center justify-center">
              {activeTab === 'signals' && (
                <WaveDromOverlay
                  waveJson={waveJson}
                  progress={waveProgress}
                  width={840}
                  showCursor={true}
                />
              )}

              {activeTab === 'code_morph' && (
                <CodeMorphViewer
                  spec={codeSpec}
                  progress={codeProgress}
                  width={840}
                />
              )}

              {activeTab === 'chart_race' && (
                <BarChartRaceViewer
                  spec={chartSpec}
                  progress={chartProgress}
                  width={840}
                />
              )}

              {activeTab === 'foley' && (() => {
                const def = getFoleyFilterDefinition(selectedFoleyType);
                return (
                  <div className="w-full max-w-[840px] bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
                    <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                          <Volume2 className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white capitalize">{selectedFoleyType} Sound Generator</h3>
                          <p className="text-xs text-slate-400">Zero-Asset Mathematical Audio Synthesis (FFmpeg + Web Audio API)</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                        <Zap className="h-3 w-3" /> $0 Compute • Offline Safe
                      </span>
                    </div>

                    {/* Interactive Play Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {FOLEY_ITEMS.map((item) => (
                        <button
                          key={item.type}
                          onClick={() => {
                            setSelectedFoleyType(item.type);
                            playBrowserProceduralSfx(item.type);
                          }}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 text-xs transition-all ${
                            selectedFoleyType === item.type
                              ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300 font-bold scale-105 shadow-md'
                              : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <Volume2 className="h-4 w-4 text-cyan-400" />
                          <span>{item.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Live FFmpeg Filter Definition */}
                    <div className="flex flex-col gap-2 bg-black/60 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                      <div className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">FFmpeg lavfi Audio Filtergraph</div>
                      <div className="text-emerald-400"># Source Generator:</div>
                      <div className="text-slate-300 pl-4">{def.inputSource}</div>
                      <div className="text-cyan-400 mt-1"># Audio Filter Complex:</div>
                      <div className="text-slate-300 pl-4 break-all">{def.filterChain}</div>
                      <div className="text-amber-400 mt-1"># Synthesis Duration:</div>
                      <div className="text-slate-300 pl-4">{def.duration} seconds</div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                      <span>Pure procedural math — zero MP3 downloads, zero missing assets, zero license conflicts.</span>
                      <Button
                        size="sm"
                        onClick={() => playBrowserProceduralSfx(selectedFoleyType)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs gap-1.5 shadow-sm"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        Play {selectedFoleyType} Now
                      </Button>
                    </div>
                  </div>
                );
              })()}

              {activeTab === 'network' && (
                <div className="w-full max-w-[840px] bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl relative min-h-[440px]">
                  <div className="border-b border-slate-800 pb-3 mb-6 flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-bold text-white">{infraSpec.title}</h3>
                      <p className="text-xs text-slate-400">{infraSpec.subtitle} • {infraSpec.subnetRange}</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      LIVE NETWORK
                    </span>
                  </div>

                  {/* Network Topology Visual Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {infraSpec.nodes.map((node) => {
                      const visuals = getInfraNodeVisuals(node.role);
                      return (
                        <div
                          key={node.id}
                          className="p-3 rounded-lg border flex flex-col gap-1.5 transition-all hover:scale-[1.02]"
                          style={{
                            borderColor: visuals.border,
                            backgroundColor: visuals.bg,
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{visuals.icon}</span>
                            <span className="text-xs font-bold text-white truncate">{node.name}</span>
                          </div>
                          {node.ip && <span className="font-mono text-[11px] text-cyan-400">{node.ip}</span>}
                          {node.specs && <span className="text-[10px] text-slate-400">{node.specs}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'architecture' && (
                <div className="w-full max-w-[840px] bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-xl">
                  <div className="border-b border-dashed border-neutral-700 pb-4 mb-6">
                    <h3 className="text-lg font-bold text-white">
                      {lanshuSpec.title.prefix}{' '}
                      <span className="text-amber-400 underline decoration-wavy decoration-amber-500">
                        {lanshuSpec.title.highlight}
                      </span>
                    </h3>
                    {lanshuSpec.title.subtitle && (
                      <p className="text-xs text-neutral-400 mt-1">{lanshuSpec.title.subtitle}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-4">
                    {lanshuSpec.core.cards.map((c, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div className="w-full p-4 rounded-xl border-2 border-blue-500 bg-neutral-900 shadow-[4px_4px_0px_rgba(59,130,246,0.3)]">
                          <h4 className="text-sm font-bold text-blue-400">{c.title}</h4>
                          <p className="text-xs text-neutral-300 mt-1">{c.description}</p>
                        </div>
                        {i < lanshuSpec.core.cards.length - 1 && (
                          <div className="h-6 w-1 bg-neutral-700 relative my-1">
                            <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] -left-0.5 absolute animate-bounce" />
                          </div>
                        )}
                      </div>
                    ))}

                    {lanshuSpec.core.decision && (
                      <div className="p-3 rounded-lg border-2 border-pink-500 bg-pink-950/30 text-pink-300 text-xs text-center font-bold mt-2">
                        💎 {lanshuSpec.core.decision.label}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
