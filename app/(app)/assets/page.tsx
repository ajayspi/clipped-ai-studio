"use client";

import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Video, Mic, Download, Plus, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xbneetfubybzleuwhbnx.supabase.co';
const defaultSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhibmVldGZ1YnliemxldXdoYm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNDk0NzAsImV4cCI6MjEwMjkyNTQ3MH0.ecQ1lDbSkxJDUOZoAgS3kPSf5Qw6tidesSJ4HmirYGg';
const supabase = createClient(defaultSupabaseUrl, defaultSupabaseAnonKey);

export default function GenerativeAssetBoard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'video' | 'image' | 'audio'>('all');
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('render_jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setJobs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleRegenerate = async (jobId: string) => {
    setRegenerating(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/regenerate`, { method: 'POST' });
      if (res.ok) {
        await fetchJobs();
      }
    } catch (e) {
      console.error(e);
    }
    setRegenerating(null);
  };

  // Group by shotId
  const groups: Record<string, any[]> = {};
  jobs.forEach(job => {
    let logsObj: any = {};
    if (job.logs) {
      try {
        logsObj = typeof job.logs === 'string' ? JSON.parse(job.logs) : job.logs;
      } catch (e) {}
    }
    const shotId = logsObj.shotId || job.id;
    if (!groups[shotId]) groups[shotId] = [];
    groups[shotId].push({ ...job, logsObj });
  });

  const filteredGroups = Object.entries(groups).filter(([shotId, stack]) => {
    // Assuming video for all right now or checking logs
    if (filter === 'all') return true;
    return false; // Implement type filtering if types are stored
  });

  return (
    <div className="flex flex-col flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Shot Manager</h1>
          <p className="text-muted-foreground max-w-2xl">
            A centralized gallery of every shot, grouped by version stacks.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading assets...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map(([shotId, stack]) => (
            <ShotGroup 
              key={shotId} 
              shotId={shotId} 
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

function ShotGroup({ shotId, stack, onRegenerate, regenerating }: { shotId: string, stack: any[], onRegenerate: (id: string) => void, regenerating: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const sortedStack = [...stack].sort((a, b) => (b.logsObj.version || 1) - (a.logsObj.version || 1));
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
          "{prompt}"
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
            Regenerate (V{version + 1})
          </button>
          
          {sortedStack.length > 1 && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {sortedStack.length - 1} earlier versions
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-col border-t border-border/50 bg-muted/30"
          >
            {sortedStack.slice(1).map(oldJob => (
              <div key={oldJob.id} className="p-2 border-b border-border/50 last:border-0 text-xs flex justify-between items-center">
                <span>V{oldJob.logsObj.version || 1}</span>
                <span className="text-muted-foreground truncate max-w-[150px]">{oldJob.output_url || 'No URL'}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
