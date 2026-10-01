import { complete, parseJson } from '@/lib/engine/llm';

export interface TriviaVideoRequest {
  topic: string;
  questionsCount: number;
}

export const triviaOrchestrator = {
  async generateVideo(req: TriviaVideoRequest) {
    if (!req.topic || typeof req.topic !== 'string') throw new Error("Topic is required");
    const count = req.questionsCount || 3;

    const prompt = `Generate ${count} trivia questions about ${req.topic}. 
Return JSON with { "success": true, "questions": [ { "question": "...", "answer": "..." } ] }.`;

    let questions: Record<string, unknown>[] = [];
    try {
      const content = await complete({ system: 'You are an expert trivia writer.', user: prompt, json: true }, undefined, 'auto');
      if (content) {
        const parsed = parseJson<{ questions?: Array<Record<string, unknown>> }>(content);
        questions = parsed.questions || [];
      }
    } catch (e) {
      console.warn("LLM failed, falling back to mock questions", e);
    }

    if (!questions.length) {
      for (let i = 0; i < count; i++) {
        questions.push({ question: `Question ${i + 1} about ${req.topic}?`, answer: `Answer ${i + 1}` });
      }
    }

    const beats: Record<string, unknown>[] = [];
    let beatIdx = 1;
    
    questions.forEach((q: Record<string, unknown>) => {
      beats.push({
        id: `beat-${beatIdx++}`,
        text: q.question,
        duration: 5,
        clipUrl: 'https://storage.clipped.ai/gaming/gta-parkour-1.mp4'
      });
      beats.push({
        id: `beat-${beatIdx++}`,
        text: 'Thinking...',
        duration: 3,
        clipUrl: 'https://storage.clipped.ai/gaming/minecraft-parkour-1.mp4'
      });
      beats.push({
        id: `beat-${beatIdx++}`,
        text: `The answer is: ${q.answer}`,
        duration: 3,
        clipUrl: 'https://storage.clipped.ai/gaming/subway-surfers-1.mp4'
      });
    });

    return {
      success: true,
      workflow: 'trivia',
      beats
    };
  }
};
