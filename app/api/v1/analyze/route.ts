import { NextResponse } from 'next/server'
import { complete, parseJson } from '@/lib/ai/llm'

export async function POST(req: Request) {
  try {
    const { narration, provider, model, workflowType = 'footage' } = await req.json()
    if (!narration) return NextResponse.json({ error: 'Missing narration' }, { status: 400 })

    let instruction = "3-5 search keywords for stock footage";
    if (workflowType === 'images') {
      instruction = "a highly detailed Midjourney/Flux style image generation prompt (describing subject, lighting, style, and composition)";
    } else if (workflowType === 'ai-videos') {
      instruction = "a cinematic video generation prompt for Kling/Luma (specifying camera movement, lighting, subject motion, and setting)";
    }

    const raw = await complete({
      system: "You are a video scene analyst. Break down the provided narration into scenes.",
      user: `Analyze this narration and break it down into shot-length scenes (beats).
      Each beat should have: text (the narration for this beat), duration (estimated time in seconds to say it), and keywords (${instruction}).
      
      Return ONLY valid JSON:
      {"scenes": [{"text": "...", "duration": 4.5, "keywords": ["...", "..."]}]}
      
      Narration:
      ${narration}
      `,
      json: true
    }, provider, model)

    const parsed = parseJson<any>(raw)
    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('Analyze API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
