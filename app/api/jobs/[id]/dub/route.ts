import { NextResponse } from "next/server"
import { supabaseAdmin as supabase } from "@/lib/db"
import { complete, parseJson } from "@/lib/ai/llm"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { languages } = body

    if (!Array.isArray(languages) || languages.length === 0) {
      return NextResponse.json({ error: "Languages array is required" }, { status: 400 })
    }

    const { data: job, error: jobErr } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (jobErr || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    let logs: any = {}
    try {
      logs = typeof job.logs === 'string' ? JSON.parse(job.logs) : job.logs || {}
    } catch (e) {
      logs = {}
    }

    const originalScript = logs.script || ""
    const originalBeats = Array.isArray(logs.beats) ? logs.beats : []
    const originalTitle = job.title || ""

    const newJobs = []

    for (const lang of languages) {
      // Build LLM translation prompt
      const prompt = `Translate the following video script, title, and scene descriptions into ${lang}.
Return ONLY valid JSON with no markdown wrapping, strictly adhering to this schema:
{
  "title": "Translated title",
  "script": "Translated script",
  "beats": [
    { "id": "beat-id", "text": "Translated scene text" }
  ]
}

Input Title: ${originalTitle}
Input Script: ${originalScript}
Input Beats:
${JSON.stringify(originalBeats.map((b: any) => ({ id: b.id, text: b.text })), null, 2)}
`

      const completion = await complete({
        system: "You are a professional translator.",
        user: prompt,
        json: true
      }, 'anthropic', 'claude-3-5-sonnet-20241022')
      const translated = parseJson<{ title?: string, script?: string, beats?: any[] }>(completion, {})

      const translatedTitle = translated?.title || originalTitle
      const translatedScript = translated?.script || originalScript
      const translatedBeatsMap = new Map((translated?.beats || []).map((b: any) => [b.id, b.text]))

      const newBeats = originalBeats.map((b: any) => ({
        ...b,
        text: translatedBeatsMap.get(b.id) || b.text
      }))

      const newLogs = {
        ...logs,
        script: translatedScript,
        beats: newBeats,
        language: lang,
        originalJobId: id
      }

      const newJobId = crypto.randomUUID()
      const insertPayload = {
        id: newJobId,
        title: translatedTitle,
        status: 'pending',
        progress: 0,
        orchestration_state: 'queued',
        logs: JSON.stringify(newLogs)
      }

      const { error: insertErr } = await supabase.from('render_jobs').insert(insertPayload)
      if (insertErr) {
        console.error(`Failed to insert translated job for ${lang}:`, insertErr)
      } else {
        newJobs.push(newJobId)
      }
    }

    return NextResponse.json({ success: true, jobs: newJobs })

  } catch (error) {
    console.error("Dubbing error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to dub job" },
      { status: 500 }
    )
  }
}
