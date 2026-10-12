"use client"

import { use } from "react"
import { notFound } from "next/navigation"
import { CreationWizard } from "@/components/wizard/CreationWizard"

// Thin CreationWizard wrappers (ai-videos, footage, images, stories) collapsed here.
// Static siblings (auto, avatar, bulk, …) take precedence; this is the fallback.
const WIZARD_TYPES = ["ai-videos", "footage", "images", "stories"] as const

export default function CreateWorkflowPage({
  params,
}: {
  params: Promise<{ workflowType: string }> | { workflowType: string }
}) {
  const unwrappedParams =
    params && typeof (params as Promise<{ workflowType: string }>).then === "function"
      ? use(params as Promise<{ workflowType: string }>)
      : (params as { workflowType: string })
  const workflowType = unwrappedParams.workflowType || ""

  if (!(WIZARD_TYPES as readonly string[]).includes(workflowType)) {
    notFound()
  }

  return (
    <div className="flex flex-1 flex-col h-full">
      <CreationWizard workflowType={workflowType} />
    </div>
  )
}
