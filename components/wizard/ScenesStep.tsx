"use client"
import { useState } from 'react'
import { useWizardStore, Beat } from './wizard-store'
import { Image as ImageIcon, Video, Clock, GripVertical } from 'lucide-react'
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

  const handleSearch = async () => {
    const query = window.prompt("Enter new search keyword for this scene:", beat.keywords.join(" "))
    if (!query) return;

    setLoadingMedia(true)
    try {
      const res = await fetch("/api/v1/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beatId: beat.id, keywords: query.split(" "), workflowType: w.workflowType })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.candidates && data.candidates.length > 0) {
          const updatedBeats = w.beats.map(b => b.id === beat.id ? { ...b, candidates: data.candidates } : b)
          w.set('beats', updatedBeats)
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
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 py-2 px-3 border rounded-lg bg-card group relative overflow-hidden">
      {/* Drag Handle */}
      <button
        type="button"
        className="flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-shrink-0 w-6 h-6 text-xs rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm ml-0">
        {index + 1}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">
          "{beat.text}"
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
          <Clock className="w-3 h-3 hidden sm:block" />
          {beat.duration}s
          <div className="flex flex-wrap gap-1 ml-1 truncate max-w-[200px]">
            {beat.keywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="w-24 h-[54px] shrink-0 flex items-center justify-end">
         <div className="w-[96px] h-[54px] bg-muted rounded border flex items-center justify-center relative overflow-hidden group/thumb shrink-0">
           {loadingMedia ? (
             <div className="flex flex-col items-center justify-center space-y-2 opacity-50">
               <Video className="w-6 h-6 animate-pulse" />
               <span className="text-[10px]">Searching...</span>
             </div>
           ) : beat.candidates && beat.candidates.length > 0 ? (
             beat.candidates[0].url.endsWith('.mp4') ? (
               <video src={beat.candidates[0].url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
             ) : (
               <img src={beat.candidates[0].url} alt="Candidate" className="w-full h-full object-cover" />
             )
           ) : (
             <Video className="w-6 h-6 text-muted-foreground opacity-50" />
           )}
           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
             <button 
               onClick={handleSearch}
               className="text-xs font-medium text-white px-3 py-1 bg-primary rounded hover:bg-primary/90 shadow-md transition-transform active:scale-95"
             >
               Change Asset
             </button>
           </div>
         </div>
         <p className="text-[10px] text-muted-foreground text-center truncate">
           {beat.candidates && beat.candidates.length > 0 ? beat.candidates[0].platform : 'AI Selected Clip'}
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
        <ImageIcon className="w-6 h-6 text-xs mb-2 opacity-50" />
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
      <div className="space-y-2">
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
