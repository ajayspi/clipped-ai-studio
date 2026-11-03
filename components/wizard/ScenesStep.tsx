"use client"
import { useState } from 'react'
import { useWizardStore, Beat } from './wizard-store'
import { Image as ImageIcon, Video, Clock, GripVertical, Check, Edit2, X } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableBeat({ beat, index }: { beat: Beat; index: number }) {
  const w = useWizardStore()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: beat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [loadingMedia, setLoadingMedia] = useState(false)
  const [editingText, setEditingText] = useState(false)
  const [textValue, setTextValue] = useState(beat.text)
  const [durationValue, setDurationValue] = useState(beat.duration)
  const [showCandidates, setShowCandidates] = useState(false)

  const candidates = beat.candidates || []
  const selectedCandidate = candidates.find((c: { id?: string }) => c.id === beat.selectedId) || candidates[0]

  const updateBeat = (updates: Partial<Beat>) => {
    const updatedBeats = w.beats.map(b => b.id === beat.id ? { ...b, ...updates } : b)
    w.set('beats', updatedBeats)
  }

  const selectCandidate = (candidate: { id?: string }) => {
    updateBeat({ selectedId: candidate.id })
    setShowCandidates(false)
  }

  const saveText = () => {
    updateBeat({ text: textValue })
    setEditingText(false)
  }

  const saveDuration = (val: number) => {
    updateBeat({ duration: Math.max(1, val) })
  }

  const handleSearch = async () => {
    setLoadingMedia(true)
    try {
      const res = await fetch("/api/v1/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beatId: beat.id, keywords: beat.keywords, workflowType: w.workflowType })
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.candidates) && data.candidates.length > 0) {
          updateBeat({ candidates: data.candidates, selectedId: data.candidates[0].id })
          setShowCandidates(true)
        } else {
          alert("No media found for that keyword.")
        }
      }
    } catch (err) {
      console.error(err)
      alert("Failed to search media")
    } finally {
      setLoadingMedia(false)
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="flex gap-4 p-4 border rounded-lg bg-card group relative">
      {/* Drag Handle */}
      <button
        type="button"
        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm ml-6">
        {index + 1}
      </div>
      
      <div className="flex-1 space-y-3">
        {editingText ? (
          <div className="flex gap-2">
            <input
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border rounded bg-background"
            />
            <button onClick={saveText} className="p-1 hover:bg-muted rounded"><Check className="w-4 h-4" /></button>
            <button onClick={() => { setTextValue(beat.text); setEditingText(false) }} className="p-1 hover:bg-muted rounded"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex items-start gap-2 group/text">
            <div className="text-sm font-medium leading-relaxed flex-1">
              &ldquo;{beat.text}&rdquo;
            </div>
            <button onClick={() => setEditingText(true)} className="opacity-0 group-hover/text:opacity-100 p-1 hover:bg-muted rounded transition-opacity">
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <input
            type="number"
            value={durationValue}
            onChange={(e) => setDurationValue(parseFloat(e.target.value) || 1)}
            onBlur={() => saveDuration(durationValue)}
            className="w-12 px-1 py-0.5 border rounded bg-background"
            min="1"
            step="0.5"
          />s
          <div className="flex flex-wrap gap-1 ml-2">
            {(beat.keywords || []).map((kw, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="w-48 shrink-0 flex flex-col gap-2">
         <div className="aspect-video bg-muted rounded-md border flex items-center justify-center relative overflow-hidden group/thumb">
            {loadingMedia ? (
              <div className="flex flex-col items-center justify-center space-y-2 opacity-50">
                <Video className="w-6 h-6 animate-pulse" />
                <span className="text-[10px]">Searching...</span>
              </div>
            ) : selectedCandidate ? (
              selectedCandidate.url?.endsWith('.mp4') ? (
                <video src={selectedCandidate.url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- Pollinations media candidate URL (arbitrary host)
                <img src={selectedCandidate.url} alt="Candidate" className="w-full h-full object-cover" />
              )
            ) : (
              <Video className="w-6 h-6 text-muted-foreground opacity-50" />
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                onClick={() => candidates.length > 1 ? setShowCandidates(!showCandidates) : handleSearch()}
                className="text-xs font-medium text-white px-3 py-1 bg-primary rounded hover:bg-primary/90 shadow-md transition-transform active:scale-95"
              >
                {candidates.length > 1 ? 'Pick Asset' : 'Change Asset'}
              </button>
            </div>
          </div>
          {showCandidates && candidates.length > 0 && (
            <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
              {candidates.map((c: { id?: string; url?: string }) => (
                <button
                  key={c.id}
                  onClick={() => selectCandidate(c)}
                  className={`aspect-video rounded overflow-hidden border-2 ${selectedCandidate?.id === c.id ? 'border-primary' : 'border-transparent'} hover:border-primary/50`}
                >
                  {c.url?.endsWith('.mp4') ? (
                    <video src={c.url} className="w-full h-full object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.url} alt="" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground text-center truncate">
            {selectedCandidate?.platform || 'AI Selected Clip'}
          </p>
      </div>
    </div>
  );
}

export function ScenesStep() {
  const w = useWizardStore()
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = w.beats.findIndex(b => b.id === active.id);
      const newIndex = w.beats.findIndex(b => b.id === over.id);
      
      const newBeats = arrayMove(w.beats, oldIndex, newIndex);
      w.set('beats', newBeats);
    }
  }

  if (w.beats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-lg">
        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
        <p>No scenes generated yet.</p>
        <p className="text-sm">Go back to step 1 and break down the script, or use Auto-pilot.</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <SortableContext
          items={w.beats.map(b => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {w.beats.map((beat, index) => (
            <SortableBeat key={beat.id} beat={beat} index={index} />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  )
}
