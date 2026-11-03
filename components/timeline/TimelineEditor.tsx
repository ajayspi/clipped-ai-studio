'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Save,
  Film,
  Sparkles,
  FileCode,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Replace,
  Plus,
  Minus,
  HelpCircle,
  X,
  Keyboard,
  Clock,
  Volume2,
} from 'lucide-react';
import { Scene } from '@/lib/engine/types';
import { useTimelineStore } from '@/lib/store/timeline-store';
import { renderClientSideMp4, triggerBlobDownload } from '@/lib/media/client-export';
import { DebouncedSyncQueue } from '@/lib/engine/optimistic-mutations';
import { motion, AnimatePresence } from 'framer-motion';
import { TimelineScrubberCanvas } from './TimelineScrubberCanvas';

interface Beat extends Scene {
  id: string;
  imageUrl?: string;
  text: string;
  duration: number;
}

interface TimelineEditorProps {
  initialBeats: Beat[];
  jobId: string;
}

interface SortableBeatProps {
  beat: Beat;
  onUpdateDuration: (beatId: string, delta: number) => void;
  onOpenSwapModal: (beat: Beat) => void;
}

function SortableBeat({ beat, onUpdateDuration, onOpenSwapModal }: SortableBeatProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: beat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      id={`beat-${beat.id}`}
      style={style}
      {...attributes}
      {...listeners}
      className="flex-shrink-0 w-72 border border-border/60 rounded-xl overflow-hidden bg-card/90 text-card-foreground shadow-md cursor-grab active:cursor-grabbing flex flex-col group hover:border-primary/50 transition-all select-none"
    >
      {/* Thumbnail & Quick Actions */}
      <div className="relative aspect-video bg-muted/60 overflow-hidden">
        {beat.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={beat.imageUrl} alt={beat.text} className="object-cover w-full h-full pointer-events-none" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No Visual Asset
          </div>
        )}

        {/* Swap Asset Trigger */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpenSwapModal(beat);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white/80 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-sm"
          title="Swap Visual Asset"
          aria-label="Swap Visual Asset"
        >
          <Replace className="w-3.5 h-3.5" />
        </button>

        {/* Duration Adjuster Steppers */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/80 backdrop-blur-sm text-white text-[11px] font-mono px-2 py-0.5 rounded-lg border border-white/10 shadow-sm"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateDuration(beat.id, -0.5);
            }}
            className="hover:text-amber-400 p-0.5 cursor-pointer"
            title="Reduce 0.5s"
            aria-label="Reduce duration 0.5s"
          >
            <Minus className="w-2.5 h-2.5" />
          </button>
          <span className="font-semibold px-1">{beat.duration.toFixed(1)}s</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateDuration(beat.id, 0.5);
            }}
            className="hover:text-emerald-400 p-0.5 cursor-pointer"
            title="Increase 0.5s"
            aria-label="Increase duration 0.5s"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Script Text */}
      <div className="p-3 text-xs flex-1 overflow-hidden space-y-1">
        <p className="line-clamp-2 text-foreground font-medium">{beat.text}</p>
        {beat.keywords && beat.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {beat.keywords.slice(0, 3).map((kw, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground border border-border/40">
                #{kw}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TimelineEditor({ initialBeats, jobId }: TimelineEditorProps) {
  const beats = useTimelineStore((state) => state.beats);
  const setBeats = useTimelineStore((state) => state.setBeats);
  const [isSaving, setIsSaving] = useState(false);
  const [isReRendering, setIsReRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [swappingBeat, setSwappingBeat] = useState<Beat | null>(null);
  const [newAssetUrl, setNewAssetUrl] = useState('');

  // Client-Side WebCodecs Export states
  const [isClientExporting, setIsClientExporting] = useState(false);
  const [clientExportProgress, setClientExportProgress] = useState(0);
  const [clientExportStage, setClientExportStage] = useState('');

  // NLE Export states (OTIO / FCPXML)
  const [isNleExporting, setIsNleExporting] = useState<'otio' | 'fcpxml' | null>(null);

  // Debounced auto-sync queue for optimistic drag & reorder
  const syncQueue = useMemo(() => {
    return new DebouncedSyncQueue<Beat[]>(async (updatedBeats: Beat[]) => {
      setAutoSaveStatus('saving');
      try {
        const res = await fetch(`/api/jobs/${jobId}/beats`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ beats: updatedBeats }),
        });
        if (!res.ok) throw new Error('Auto-save failed');
        setAutoSaveStatus('saved');
      } catch {
        setAutoSaveStatus('error');
      }
    }, 600);
  }, [jobId]);

  useEffect(() => {
    return () => syncQueue.cancel();
  }, [syncQueue]);

  useEffect(() => {
    if (initialBeats && initialBeats.length > 0) {
      setBeats(initialBeats);
    }
  }, [initialBeats, setBeats]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          useTimelineStore.getState().redo();
        } else {
          useTimelineStore.getState().undo();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const eventSource = new EventSource(`/api/jobs/${jobId}/stream`);
    
    const handleData = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (typeof data.progress === 'number') {
          setProgress(data.progress);
        }
      } catch {
        // Handle stream errors silently
      }
    };

    eventSource.addEventListener('init', handleData);
    eventSource.addEventListener('update', handleData);
    
    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBeats((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        syncQueue.enqueue(reordered);
        return reordered;
      });
    }
  };

  const handleUpdateDuration = (beatId: string, delta: number) => {
    setBeats((items) => {
      const updated = items.map((b) => {
        if (b.id === beatId) {
          const newDur = Math.max(1, parseFloat((b.duration + delta).toFixed(1)));
          return { ...b, duration: newDur };
        }
        return b;
      });
      syncQueue.enqueue(updated);
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/beats`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beats }),
      });
      if (!res.ok) {
        throw new Error('Failed to save changes');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReRender = async () => {
    setIsReRendering(true);
    setError(null);
    try {
      // 1. Save beats first
      await handleSave();
      // 2. Trigger worker retry RPC
      const res = await fetch(`/api/jobs/${jobId}/retry`, { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to dispatch re-render job');
      }
      alert('Render job dispatched to worker cluster! Track progress in Render Queue.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to re-render.');
    } finally {
      setIsReRendering(false);
    }
  };

  const handleApplyAssetSwap = () => {
    if (!swappingBeat || !newAssetUrl.trim()) return;
    setBeats((items) => {
      const updated = items.map((b) => {
        if (b.id === swappingBeat.id) {
          return { ...b, imageUrl: newAssetUrl.trim() };
        }
        return b;
      });
      syncQueue.enqueue(updated);
      return updated;
    });
    setSwappingBeat(null);
    setNewAssetUrl('');
  };

  const handleClientExport = async () => {
    setIsClientExporting(true);
    setClientExportProgress(0);
    setClientExportStage('Preloading media...');
    setError(null);
    try {
      const blob = await renderClientSideMp4({
        beats,
        fps: 30,
        width: 1080,
        height: 1920,
        onProgress: (p, stage) => {
          setClientExportProgress(p);
          setClientExportStage(stage);
        }
      });
      triggerBlobDownload(blob, `timeline_${jobId.slice(0, 8)}_webcodecs.mp4`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Client export failed');
    } finally {
      setIsClientExporting(false);
    }
  };

  const handleNleExport = async (format: 'otio' | 'fcpxml') => {
    setIsNleExporting(format);
    setError(null);
    try {
      const res = await fetch('/api/export/nle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          format,
          timelineName: `Clipped_${jobId.slice(0, 8)}`
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'NLE Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timeline_${jobId.slice(0, 8)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'NLE export failed');
    } finally {
      setIsNleExporting(null);
    }
  };

  const totalDuration = useMemo(() => {
    return beats.reduce((acc, b) => acc + (b.duration || 0), 0);
  }, [beats]);

  if (!beats || beats.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No beats found for this job.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/50 rounded-2xl p-4 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" />
              NLE Timeline Sequencer
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold font-mono">
              {beats.length} beats • {totalDuration.toFixed(1)}s
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reorder scenes, trim durations, swap visual assets, or compile with Remotion & FFmpeg.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {progress !== null && (
            <div className="w-24 h-2 bg-muted rounded overflow-hidden mr-1">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Shortcuts Help */}
          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="p-2 rounded-xl border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Keyboard Shortcuts"
            aria-label="Keyboard Shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Fast Browser MP4 */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleClientExport}
            disabled={isClientExporting || beats.length === 0}
            className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-xl text-xs"
          >
            {isClientExporting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            )}
            {isClientExporting ? `${clientExportProgress}%` : 'Fast Browser MP4'}
          </Button>

          {/* OTIO Export */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleNleExport('otio')}
            disabled={isNleExporting !== null}
            title="Export to DaVinci Resolve & OpenTimelineIO"
            className="rounded-xl text-xs"
          >
            {isNleExporting === 'otio' ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Film className="w-3.5 h-3.5 mr-1.5" />
            )}
            OTIO
          </Button>

          {/* FCPXML Export */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleNleExport('fcpxml')}
            disabled={isNleExporting !== null}
            title="Export to Premiere Pro & Final Cut Pro"
            className="rounded-xl text-xs"
          >
            {isNleExporting === 'fcpxml' ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <FileCode className="w-3.5 h-3.5 mr-1.5" />
            )}
            FCPXML
          </Button>

          {/* Sync status */}
          {autoSaveStatus === 'saving' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 mr-1 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              Syncing...
            </span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="text-xs text-emerald-500 flex items-center gap-1.5 mr-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
          {autoSaveStatus === 'error' && (
            <button
              type="button"
              onClick={handleSave}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 mr-1 underline cursor-pointer"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Sync error (Retry)
            </button>
          )}

          {/* Save Button */}
          <Button size="sm" onClick={handleSave} disabled={isSaving} variant="outline" className="rounded-xl text-xs">
            {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Save
          </Button>

          {/* Primary Re-Render with Worker Button */}
          <button
            type="button"
            onClick={handleReRender}
            disabled={isReRendering}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-indigo-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isReRendering ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>Re-Render Video</span>
          </button>
        </div>
      </div>

      {/* Progress & Error banners */}
      {isClientExporting && (
        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            <span>WebCodecs hardware rendering: <strong>{clientExportStage}</strong></span>
          </div>
          <span className="font-bold">{clientExportProgress}%</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs">
          {error}
        </div>
      )}

      {/* Hardware-Accelerated 60fps Scrubber Track */}
      <TimelineScrubberCanvas
        beats={beats}
        onSelectBeat={(idx) => {
          const el = document.getElementById(`beat-${beats[idx]?.id}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }}
      />

      {/* Horizontal Drag & Drop Timeline Tracks */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max p-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={beats.map(b => b.id)}
              strategy={horizontalListSortingStrategy}
            >
              {beats.map((beat) => (
                <SortableBeat
                  key={beat.id}
                  beat={beat}
                  onUpdateDuration={handleUpdateDuration}
                  onOpenSwapModal={(b) => {
                    setSwappingBeat(b);
                    setNewAssetUrl(b.imageUrl || '');
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Asset Swap Modal */}
      <AnimatePresence>
        {swappingBeat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSwappingBeat(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-5 border-b border-border/40 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <Replace className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-bold text-foreground">Swap Scene Visual Asset</h3>
                </div>
                <button
                  onClick={() => setSwappingBeat(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  aria-label="Close swap modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Image or Video URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or media path"
                    value={newAssetUrl}
                    onChange={(e) => setNewAssetUrl(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>

                {newAssetUrl && (
                  <div className="aspect-video w-full rounded-xl border border-border/60 overflow-hidden bg-black/40 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={newAssetUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => setSwappingBeat(null)}
                    className="px-4 py-2 border border-border/60 rounded-xl hover:bg-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyAssetSwap}
                    disabled={!newAssetUrl.trim()}
                    className="px-5 py-2 bg-primary text-primary-foreground rounded-xl font-semibold shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Apply Asset Swap
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Help Modal */}
      <AnimatePresence>
        {showShortcutsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShortcutsModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-4 border-b border-border/40 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Timeline Shortcuts</h3>
                </div>
                <button
                  onClick={() => setShowShortcutsModal(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  aria-label="Close shortcuts modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Undo action</span>
                  <kbd className="px-2 py-0.5 rounded bg-muted font-mono font-bold text-[10px] border border-border">Cmd/Ctrl + Z</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Redo action</span>
                  <kbd className="px-2 py-0.5 rounded bg-muted font-mono font-bold text-[10px] border border-border">Shift + Cmd + Z</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Reorder beats</span>
                  <span className="font-medium text-foreground">Drag & Drop card</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Fine-tune duration</span>
                  <span className="font-medium text-foreground">Click +/- 0.5s buttons</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
