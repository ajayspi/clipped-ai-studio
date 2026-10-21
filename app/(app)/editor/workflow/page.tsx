import React from 'react';
import { WorkflowBuilder } from '@/components/workflow-builder/WorkflowBuilder';

export default function WorkflowEditorPage() {
  return (
    <div className="flex flex-col flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Visual Pipeline Builder</h1>
        <p className="text-muted-foreground">
          Design custom video generation pipelines using a node-based architecture. Connect LLMs, TTS providers, and Video generation APIs to build powerful workflows.
        </p>
      </div>

      <div className="flex-1 w-full bg-slate-900/50 rounded-xl overflow-hidden shadow-2xl p-4">
        <WorkflowBuilder />
      </div>
    </div>
  );
}
