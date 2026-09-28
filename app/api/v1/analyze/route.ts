import { NextResponse } from 'next/server'
import { complete, parseJson } from '@/lib/ai/llm'
import { CAMERA_MOVES, SHOT_TYPES, shotFromScene } from '@/lib/engine/shot-planner'

interface AnalyzeScene {
  text: string
  duration: number
  keywords: string[]
  shotType?: unknown
  cameraMove?: unknown
  /** What is shown on screen. Preferred over `text` for image prompts. */
  description?: string
}

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
      system: "You are a video scene analyst. Break down the provided narration into scenes and direct each shot.",
      user: `Analyze this narration and break it down into shot-length scenes (beats).
      Each beat should have:
      - text (the narration for this beat)
      - duration (estimated time in seconds to say it)
      - keywords (${instruction})
      - description (what is shown on screen, NOT the narration text)
      - shotType (framing, from exactly one of: ${SHOT_TYPES.join(', ')})
      - cameraMove (how the camera moves, from exactly one of: ${CAMERA_MOVES.join(', ')})

      Shot direction rules:
      - Both shot fields are closed lists. Use those exact spellings; nothing else is renderable.
      - VARIETY IS THE POINT. Do not repeat one cameraMove across consecutive beats.
        Identical motion on every shot is what makes a cut look like a slideshow.
      - Open on "wide". Use "close-up" where the narration lands an emphasis or a
        specific detail. "static" is legitimate but rare.
      - description must describe the picture. Never repeat the narration there:
        the text field is what gets spoken, and feeding spoken words to an image
        model produces captions baked into the frame.

      Return ONLY valid JSON:
      {"scenes": [{"text": "...", "duration": 4.5, "keywords": ["...", "..."], "description": "...", "shotType": "wide", "cameraMove": "push-in"}]}

      Narration:
      ${narration}
      `,
      json: true
    }, provider, model)

    const parsed = parseJson<{ scenes: AnalyzeScene[] }>(raw)

    // The model proposes the shot fields; the planner decides. Normalising here
    // means every consumer of this endpoint (the wizard store, the queue route)
    // receives vocabulary it can render, and a scene the model left incomplete
    // still gets a valid shot instead of dropping the direction entirely.
    const scenes = (parsed.scenes ?? []).map((scene, index) => {
      const shot = shotFromScene({
        text: scene.text,
        description: scene.description,
        keywords: Array.isArray(scene.keywords) ? scene.keywords.map(String) : [],
        shotType: scene.shotType,
        cameraMove: scene.cameraMove,
      }, index)
      return { ...scene, ...shot }
    })

    return NextResponse.json({ ...parsed, scenes })
  } catch (error) {
    console.error('Analyze API Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 })
  }
}
