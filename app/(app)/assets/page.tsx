"use client";

import React, { useState, useEffect } from 'react';
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/db';

interface AssetJob {
  id: string;
  output_url?: string;
  created_at?: string;
  logs?: string | Record<string, unknown>;
  [key: string]: unknown;
}

interface ParsedAssetJob extends AssetJob {
  logsObj: {
    shotId?: string;
    version?: number;
    prompt?: string;
    model?: string;
    seed?: string | number;
    [key: string]: unknown;
  };
}

export default function GenerativeAssetBoard() {
  const [jobs, setJobs] = useState<AssetJob[]>([]);
  const [filter, setFilter] = useState<'all' | 'video' | 'image' | 'audio'>('all');
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const fetchJobs = React.useCallback(async () => {
    const { data } = await supabase
      .from('render_jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setJobs(data as AssetJob[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void supabase
      .from('render_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active) {
          if (data) setJobs(data as AssetJob[]);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleRegenerate = async (jobId: string) => {
    setRegenerating(jobId);
    try {
      await fetch(`/api/jobs/${jobId}/regenerate`, { method: 'POST' });
      await fetchJobs();
    } catch (e) {
      console.error(e);
    } finally {
      setRegenerating(null);
    }
  };

  // Group jobs by shotId or fallback to id
  const groupedShots: Record<string, ParsedAssetJob[]> = {};
  jobs.forEach(job => {
    let logsObj: ParsedAssetJob['logsObj'] = {};
    if (typeof job.logs === 'string') {
      try { logsObj = JSON.parse(job.logs); } catch { logsObj = {}; }
    } else if (job.logs && typeof job.logs === 'object') {
      logsObj = job.logs as ParsedAssetJob['logsObj'];
    }

    const shotId = logsObj.shotId || job.id;
    if (!groupedShots[shotId]) {
      groupedShots[shotId] = [];
    }
    groupedShots[shotId].push({ ...job, logsObj });
  });

  return (
    <div className="flex-1 space-y-6 p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Version-Stacked Asset Board</h1>
          <p className="text-muted-foreground mt-1">
            Compare shot iterations, inspect prompts and seeds, and re-roll generations seamlessly.
          </p>
        </div>
        <div className="flex bg-muted p-1 rounded-xl gap-1">
          {(['all', 'video', 'image', 'audio'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                filter === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-muted/50 border border-border/50" />
          ))}
        </div>
      ) : Object.keys(groupedShots).length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-2xl border-border/60 text-center">
          <p className="text-sm font-medium text-foreground">No generation assets found</p>
          <p className="text-xs text-muted-foreground mt-1">Run a studio pipeline to populate the asset board.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(groupedShots).map(([shotId, stack]) => (
            <ShotGroup 
              key={shotId} 
              stack={stack} 
              onRegenerate={handleRegenerate}
              regenerating={regenerating}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ShotGroup({ stack, onRegenerate, regenerating }: { stack: ParsedAssetJob[], onRegenerate: (id: string) => void, regenerating: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const sortedStack = [...stack].sort((a, b) => (Number(b.logsObj.version) || 1) - (Number(a.logsObj.version) || 1));
  const activeJob = sortedStack[0];
  const version = activeJob.logsObj.version || 1;
  const prompt = activeJob.logsObj.prompt || 'No prompt';
  const model = activeJob.logsObj.model || 'Unknown';
  const seed = activeJob.logsObj.seed || 'Random';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card hover:border-primary/50 transition-all shadow-sm"
    >
      <div className="relative aspect-video bg-muted overflow-hidden flex items-center justify-center">
        {activeJob.output_url ? (
          <video src={activeJob.output_url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
        ) : (
          <div className="text-muted-foreground">No Preview</div>
        )}
        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-white text-[10px] font-bold tracking-wider uppercase">
          V{version}
        </div>
        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-white text-[10px] font-bold tracking-wider uppercase">
          {model}
        </div>
      </div>

      <div className="p-3 bg-card/80 backdrop-blur-sm border-t border-border/50 flex flex-col gap-2">
        <p className="text-xs text-foreground font-medium line-clamp-2" title={prompt}>
          &quot;{prompt}&quot;
        </p>
        <div className="text-[10px] text-muted-foreground">
          Seed: {seed}
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <button 
            onClick={() => onRegenerate(activeJob.id)}
            disabled={regenerating === activeJob.id}
            className="flex items-center gap-1 text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${regenerating === activeJob.id ? 'animate-spin' : ''}`} />
            Re-roll Shot
          </button>

          {sortedStack.length > 1 && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {sortedStack.length} Versions
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && sortedStack.length > 1 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-3 bg-muted/40 border-t border-border/40 space-y-2 overflow-hidden"
          >
            <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">
              Version History
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sortedStack.slice(1).map(pastJob => (
                <div key={pastJob.id} className="w-20 shrink-0 flex flex-col gap-1">
                  <div className="aspect-video bg-black/40 rounded-lg overflow-hidden border border-border/50 relative">
                    {pastJob.output_url ? (
                      <video src={pastJob.output_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-[8px] text-center p-1 text-muted-foreground">V{pastJob.logsObj.version}</div>
                    )}
                  </div>
                  <div className="text-[9px] text-muted-foreground truncate">
                    V{pastJob.logsObj.version || 1} • {pastJob.logsObj.seed || 'R'}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
