'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

export const DynamicWorkflowBuilder = dynamic(
  () => import('@/components/workflow-builder/WorkflowBuilder').then((mod) => mod.WorkflowBuilder),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center p-16 text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading Visual Pipeline Builder (@xyflow/react)...</p>
      </div>
    ),
  }
);
