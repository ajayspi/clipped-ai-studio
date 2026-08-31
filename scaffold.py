import os

workflows = [
    ('images', 'AI Images Workflow', 'Generate consistent AI images and animate them into a video.'),
    ('ai-videos', 'AI Videos Workflow', 'Use Kling or Veo to generate 100% synthetic video scenes.'),
    ('stories', 'Stories Generator', 'Turn a topic into a multi-part shorts series automatically.'),
    ('bulk', 'Bulk Planner', 'Generate 30 days of content in a specific niche at once.'),
    ('shorts', 'Extract Shorts', 'Find viral hooks in long-form video and extract them into shorts.'),
    ('drama', 'Micro-Drama Workflow', 'Generate a cinematic mini-series with consistent characters.'),
    ('auto', 'Auto Pilot', 'Fully hands-off generation and scheduling pipeline.')
]

base_path = r'C:\Users\vigilare\.gemini\antigravity\scratch\clipped\app\(app)\create'

for wf_id, title, desc in workflows:
    dir_path = os.path.join(base_path, wf_id)
    os.makedirs(dir_path, exist_ok=True)
    file_path = os.path.join(dir_path, 'page.tsx')
    comp_name = wf_id.replace('-', '').capitalize() + 'Page'
    
    content = f"""export default function {comp_name}() {{
  return (
    <div className=\"flex flex-1 flex-col gap-6 p-6 max-w-4xl mx-auto w-full\">
      <div>
        <h1 className=\"text-2xl font-bold tracking-tight\">{title}</h1>
        <p className=\"text-sm text-muted-foreground mt-1\">{desc}</p>
      </div>
      <div className=\"flex h-64 items-center justify-center rounded-xl border border-dashed text-muted-foreground\">
        UI Dashboard for {title} (Week 3 Implementation)
      </div>
    </div>
  )
}}"""
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Scaffolded!")
