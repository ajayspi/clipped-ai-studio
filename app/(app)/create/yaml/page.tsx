'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function YamlWorkflowPage() {
  const [yamlText, setYamlText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/workflows/yaml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ yaml: yamlText }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Assume we route to the job status page like other workflows might
        router.push(`/queue`);
      } else {
        setError(data.error || 'Failed to submit YAML workflow');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-3xl font-bold mb-4">Declarative YAML Workflows</h1>
      <p className="text-gray-500 mb-6">
        Paste your OpenMontage-style YAML workflow definition below to generate a video.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      <textarea
        className="w-full h-96 p-4 font-mono text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700"
        placeholder={`workflow: "yaml"
script: "This is my YAML video"
beats:
  - text: "Scene 1"
    duration: 3
    clipUrl: "https://example.com/video1.mp4"
  - text: "Scene 2"
    duration: 5
    imagePrompt: "A cyberpunk city at night"`}
        value={yamlText}
        onChange={(e) => setYamlText(e.target.value)}
        disabled={isLoading}
      />

      <div className="mt-6 flex justify-end">
        <button
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          onClick={handleSubmit}
          disabled={isLoading || !yamlText.trim()}
        >
          {isLoading ? 'Submitting...' : 'Submit Workflow'}
        </button>
      </div>
    </div>
  );
}
