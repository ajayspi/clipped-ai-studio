import { NextResponse } from 'next/server'
import { complete, parseJson } from '@/lib/ai/llm'

export async function POST(req: Request) {
  try {
    const { 
      subject, 
      tone = 'Documentary', 
      language = 'Auto Detect', 
      targetDuration = 30, 
      paragraphCount = 4, 
      workflowType = 'footage',
      provider, 
      model 
    } = await req.json()
    
    if (!subject) return NextResponse.json({ error: 'Missing subject' }, { status: 400 })

    const WORDS_PER_MINUTE = 150
    const words = Math.round((targetDuration / 60) * WORDS_PER_MINUTE)
    const systemPrompt = 'You are a short-form video scriptwriter. Return narration only — no headings, no stage directions.'

    // Stories Workflow: Requires chunked/long-form generation if it exceeds ~700 words (usually stories are longer).
    // For this implementation, we will mock the multi-part story generation to be safe from token limits.
    if (workflowType === 'stories') {
      const outlineRaw = await complete({
        system: systemPrompt,
        user: `Plan a ${Math.round(words / WORDS_PER_MINUTE)}-minute multi-part story about: ${subject}. Tone: ${tone}. Return ONLY valid JSON: {"sections":[{"title":"...","covers":"..."}], "keywords":["..."]}`,
        json: true,
        maxTokens: 2000
      }, provider, model)
      
      const outline = parseJson<any>(outlineRaw)
      const sections = outline.sections || []
      const keywords = outline.keywords || []
      
      // We would normally loop through sections here, but to avoid massive latency/API costs in a single request,
      // we'll simulate the assembly of the story here.
      let narration = ""
      for (const [index, section] of sections.entries()) {
        const raw = await complete({
          system: systemPrompt,
          user: `Write section ${index + 1} of ${sections.length} about: ${subject}. This section covers: ${section.covers}. Tone: ${tone}. Return ONLY valid JSON: {"narration":"..."}`,
          json: true
        }, provider, model)
        const parsed = parseJson<any>(raw)
        narration += (parsed.narration || "") + "\n\n"
      }
      
      return NextResponse.json({ narration: narration.trim(), keywords })
    }

    // Default short-form script generation
    const raw = await complete({
      system: systemPrompt,
      user: `Write narration for a short video.
      Subject: ${subject}
      Tone: ${tone}
      Length: about ${words} words.
      Structure: exactly ${paragraphCount} paragraphs.
      
      Return ONLY valid JSON, no markdown fences:
      {"narration": "...", "keywords": ["...", "..."]}`,
      json: true,
      maxTokens: 1000
    }, provider, model)

    const parsed = parseJson<any>(raw)
    return NextResponse.json({
      narration: parsed.narration || "",
      keywords: parsed.keywords || []
    })
  } catch (error: any) {
    console.error('Script API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
