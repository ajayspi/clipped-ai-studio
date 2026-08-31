"use client";

import { useState, useEffect } from "react";
import { Plus, X, Loader2, Calendar, Clock } from "lucide-react";
import { supabase } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";

export function ScheduleModal({ jobs }: { jobs?: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [selectedJob, setSelectedJob] = useState("");
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(['youtube']);

  useEffect(() => {
    if (isOpen) {
      fetchJobs();
      // Set default date to today
      const today = new Date();
      setDate(today.toISOString().split('T')[0]);
      setTime("12:00");
    }
  }, [isOpen]);

  async function fetchJobs() {
    const { data } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    
    if (data) setAvailableJobs(data);
  }

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedJob || !date || !time || platforms.length === 0) return;
    
    setLoading(true);
    try {
      const scheduledFor = new Date(${date}T:00).toISOString();
      
      await supabase.from('scheduled_posts').insert({
        job_id: selectedJob,
        caption,
        platforms,
        scheduled_for: scheduledFor,
        status: 'pending'
      });
      
      setIsOpen(false);
      window.location.reload(); // Quick refresh to update server component calendar
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" /> Schedule Post
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card w-full max-w-lg rounded-xl shadow-xl border overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" /> Schedule Video
                </h3>
                <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <form onSubmit={handleSchedule} className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Video</label>
                  <select 
                    required
                    value={selectedJob}
                    onChange={(e) => setSelectedJob(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="">-- Choose a completed render --</option>
                    {availableJobs.map(job => {
                      let title = job.id;
                      try {
                        const logs = typeof job.logs === 'string' ? JSON.parse(job.logs) : job.logs;
                        title = logs.subject || title;
                      } catch(e) {}
                      return (
                        <option key={job.id} value={job.id}>{title}</option>
                      )
                    })}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Caption & Hashtags</label>
                  <textarea 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    placeholder="Write an engaging caption..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <div className="relative">
                      <input 
                        required
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time</label>
                    <div className="relative">
                      <input 
                        required
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Platforms</label>
                  <div className="flex gap-2">
                    {['youtube', 'tiktok', 'instagram'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={px-3 py-1.5 rounded-md text-xs font-medium capitalize border transition-colors }
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4 border-t flex justify-end gap-2">
                  <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md">
                    Cancel
                  </button>
                  <button 
                    disabled={loading || !selectedJob}
                    type="submit" 
                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Schedule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
