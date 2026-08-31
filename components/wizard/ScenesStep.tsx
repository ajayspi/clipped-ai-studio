"use client"

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
        <div className="text-sm font-medium leading-relaxed">
          "{beat.text}"
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {beat.duration}s
          <div className="flex flex-wrap gap-1 ml-2">
            {beat.keywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="w-48 shrink-0 flex flex-col gap-2">
         <div className="aspect-video bg-muted rounded-md border flex items-center justify-center relative overflow-hidden group/thumb">
           {beat.candidates && beat.candidates.length > 0 ? (
             beat.candidates[0].url.endsWith('.mp4') ? (
               <video src={beat.candidates[0].url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
             ) : (
               <img src={beat.candidates[0].url} alt="Candidate" className="w-full h-full object-cover" />
             )
           ) : (
             <Video className="w-6 h-6 text-muted-foreground opacity-50" />
           )}
           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
             <button className="text-xs font-medium text-white px-3 py-1 bg-primary rounded hover:bg-primary/90 shadow-md">
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
