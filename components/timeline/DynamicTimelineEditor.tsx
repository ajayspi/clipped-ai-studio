'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { TimelineEditor } from '@/components/timeline/TimelineEditor';
import type { ComponentProps } from 'react';

type TimelineEditorProps = ComponentProps<typeof TimelineEditor>;

export const DynamicTimelineEditor = dynamic<TimelineEditorProps>(
  () => import('@/components/timeline/TimelineEditor').then((mod) => mod.TimelineEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center p-16 text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading NLE Multi-Track Timeline Editor...</p>
      </div>
    ),
  }
);
