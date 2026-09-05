import re

with open(r'app\(app)\create\bulk\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Imports
import_add = """import { WorkflowHeader } from "@/components/create/ui/WorkflowHeader"
import { VoiceSelector } from "@/components/create/ui/VoiceSelector"
import { AspectRatioSelector } from "@/components/create/ui/AspectRatioSelector"
import { MockModeToggle } from "@/components/create/ui/MockModeToggle"
import { GenerateButton } from "@/components/create/ui/GenerateButton"
import { ErrorAlert } from "@/components/create/ui/ErrorAlert"
import { SettingsCard } from "@/components/create/ui/SettingsCard"\n"""
content = content.replace('import { useRouter } from "next/navigation"', 'import { useRouter } from "next/navigation"\n' + import_add)

# Error Alert
error_regex = r'\{error && \(\s*<div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">\s*\{error\}\s*<\/div>\s*\)\}'
content = re.sub(error_regex, '{error && <ErrorAlert message={error} />}', content)

# Header
header_regex = r'<div>\s*<h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">\s*<Calendar className="h-6 w-6 text-emerald-500" \/>\s*Bulk Content Planner\s*<\/h1>\s*<p className="text-sm text-muted-foreground mt-1">\s*Generate 7 to 30 days of high-retention video content, hooks, scripts, and schedules in a single batch.\s*<\/p>\s*<\/div>'
content = re.sub(header_regex, '<WorkflowHeader icon={Calendar} title="Bulk Content Planner" description="Generate 7 to 30 days of high-retention video content, hooks, scripts, and schedules in a single batch." />', content)

# Generate Button
btn_regex = r'<button\s*type="submit"\s*disabled=\{loading \|\| !niche\.trim\(\)\}\s*className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 px-4 py-3 text-sm font-medium text-white shadow transition-colors disabled:opacity-50"\s*>\s*\{loading \? \(\s*<>\s*<Loader2 className="h-4 w-4 animate-spin" \/>\s*Generating Content Plan\.\.\.\s*<\/>\s*\) : \(\s*<>\s*<Sparkles className="h-4 w-4" \/>\s*Generate \{contentCount\}-Day Bulk Content Plan\s*<\/>\s*\)\}\s*<\/button>'
content = re.sub(btn_regex, '<GenerateButton loading={loading} disabled={!niche.trim()} text={Generate -Day Bulk Content Plan} loadingText="Generating Content Plan..." />', content)

# Settings Card
settings_regex = r'<div className="rounded-xl border bg-card p-5 shadow-sm">\s*<h3 className="font-semibold mb-4 text-sm flex items-center gap-2">\s*<Settings2 className="h-4 w-4 text-emerald-500" \/>\s*Calendar Settings\s*<\/h3>'
content = re.sub(settings_regex, '<SettingsCard icon={Settings2} title="Calendar Settings">', content)
content = content.replace('</div>\n\n          {/* Omnichannel Batch Card */}', '</SettingsCard>\n\n          {/* Omnichannel Batch Card */}')

# Aspect Ratio
aspect_regex = r'<div className="grid grid-cols-3 gap-2">\s*<button[\s\S]*?1:1 \(Insta\)\s*<\/button>\s*<\/div>'
content = re.sub(aspect_regex, '<AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />', content)

# Voice
voice_regex = r'<select\s*value=\{voice\}\s*onChange=\{\(e\) => setVoice\(e\.target\.value\)\}\s*className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"\s*>\s*<option value="alloy">Alloy \(Authoritative Neutral\)<\/option>\s*<option value="echo">Echo \(Warm Conversational\)<\/option>\s*<option value="fable">Fable \(Expressive Storyteller\)<\/option>\s*<option value="onyx">Onyx \(Deep Professional\)<\/option>\s*<option value="nova">Nova \(High-Energy Dynamic\)<\/option>\s*<option value="shimmer">Shimmer \(Clear & Polished\)<\/option>\s*<\/select>'
content = re.sub(voice_regex, '<VoiceSelector value={voice} onChange={setVoice} />', content)

# Mock Mode
mock_regex = r'<div className="pt-2 border-t flex items-center justify-between">\s*<div>\s*<div className="text-xs font-medium">Dry Run / Test Mode<\/div>\s*<div className="text-\[11px\] text-muted-foreground">Generate full batch plan without API fees<\/div>\s*<\/div>\s*<input\s*type="checkbox"\s*checked=\{mock\}\s*onChange=\{\(e\) => setMock\(e\.target\.checked\)\}\s*className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"\s*\/>\s*<\/div>'
content = re.sub(mock_regex, '<MockModeToggle checked={mock} onChange={setMock} />', content)

with open(r'app\(app)\create\bulk\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced successfully!")
