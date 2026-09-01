"use client";

import { CreationWizard } from "@/components/wizard/CreationWizard";

export default function WhiteboardWorkflowPage() {
  return (
    <div className="flex flex-1 flex-col h-full">
      <CreationWizard workflowType="whiteboard" />
    </div>
  );
}
