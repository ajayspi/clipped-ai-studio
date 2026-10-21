"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function CodeVideoPage() {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    if (!prompt.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/workflows/code-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      if (data.jobId) {
        router.push(`/queue`)
      } else {
        alert(data.error || "Something went wrong")
      }
    } catch (err) {
      alert("Failed to submit job")
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-1 flex-col h-full p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Code Video (Hyperframes)</h1>
      <p className="mb-4 text-muted-foreground">
        Describe the motion graphics video you want to generate.
      </p>
      <textarea
        value={prompt}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
        placeholder="A neon tech intro..."
        className="w-full min-h-[150px] mb-4 p-4 rounded-md border border-input bg-background text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button onClick={handleSubmit} disabled={loading || !prompt.trim()}>
        {loading ? "Generating..." : "Generate Video"}
      </Button>
    </div>
  )
}
