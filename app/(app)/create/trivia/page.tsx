"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function TriviaToVideoPage() {
  const [topic, setTopic] = useState("");
  const [questionsCount, setQuestionsCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workflows/trivia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, questionsCount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      router.push("/mission/" + data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 h-[calc(100vh-4rem)]">
      <div className="w-full max-w-xl mx-auto space-y-8 bg-card border rounded-xl p-6">
        <h1 className="text-3xl font-bold">Trivia Video</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Trivia Topic (e.g. Guess the Flag)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={loading}
            required
            className="flex h-12 w-full rounded-md border px-4"
          />
          <input
            type="number"
            min="1"
            max="10"
            value={questionsCount}
            onChange={(e) => setQuestionsCount(parseInt(e.target.value))}
            disabled={loading}
            required
            className="flex h-12 w-full rounded-md border px-4"
          />
          {error && <div className="text-red-500">{error}</div>}
          <button
            type="submit"
            disabled={!topic || loading}
            className="w-full h-12 rounded-md bg-primary text-primary-foreground flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Generate Video"}
          </button>
        </form>
      </div>
    </div>
  );
}
