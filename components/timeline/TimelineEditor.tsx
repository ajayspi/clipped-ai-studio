'use client';

import React, { useState } from 'react';
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
import { Loader2, Save } from 'lucide-react';
import { Scene } from '@/lib/engine/types';

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

function SortableBeat({ beat }: { beat: Beat }) {
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
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex-shrink-0 w-64 border rounded-lg overflow-hidden bg-card text-card-foreground shadow-sm cursor-grab active:cursor-grabbing flex flex-col"
    >
      <div className="relative aspect-video bg-muted">
        {beat.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={beat.imageUrl} alt={beat.text} className="object-cover w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No Image
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
          {beat.duration}s
        </div>
      </div>
      <div className="p-3 text-sm flex-1 overflow-hidden">
        <p className="line-clamp-3 text-muted-foreground">{beat.text}</p>
      </div>
    </div>
  );
}

export function TimelineEditor({ initialBeats, jobId }: TimelineEditorProps) {
  const [beats, setBeats] = useState<Beat[]>(initialBeats);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        return arrayMove(items, oldIndex, newIndex);
      });
    }
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

  if (!beats || beats.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No beats found for this job.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Timeline Editor</h2>
        <div className="flex items-center gap-4">
          {error && <span className="text-destructive text-sm">{error}</span>}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
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
                <SortableBeat key={beat.id} beat={beat} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
