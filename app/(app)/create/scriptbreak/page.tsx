"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function ScriptBreakPage() {
  const [script, setScript] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleBreakdown = async () => {
    if (!script.trim()) return

    setIsLoading(true)
    try {
      const res = await fetch("/api/workflows/scriptbreak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
      })
      const data = await res.json()

      if (data.success && data.jobId) {
        router.push(`/editor/${data.jobId}`)
      } else {
        console.error("Failed to breakdown script", data)
      }
    } catch (err) {
      console.error("Error breaking down script", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ScriptBreak</h1>
        <p className="text-muted-foreground">Paste a long script to break it down into shots and generate an Emotional Tension Curve.</p>
      </div>

      <div className="space-y-4">
        <textarea
          placeholder="Paste your script here..."
          value={script}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScript(e.target.value)}
          className="w-full min-h-[400px] font-mono p-4 rounded-md border border-input bg-background text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button 
          onClick={handleBreakdown} 
          disabled={!script.trim() || isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? "Breaking down..." : "Breakdown Script"}
        </Button>
      </div>
    </div>
  )
}
