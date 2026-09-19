import re

with open(r'app\(app)\create\auto\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_add = """import { WorkflowHeader } from "@/components/create/ui/WorkflowHeader"
import { VoiceSelector } from "@/components/create/ui/VoiceSelector"
import { AspectRatioSelector } from "@/components/create/ui/AspectRatioSelector"
import { MockModeToggle } from "@/components/create/ui/MockModeToggle"
import { GenerateButton } from "@/components/create/ui/GenerateButton"
import { ErrorAlert } from "@/components/create/ui/ErrorAlert"
import { SettingsCard } from "@/components/create/ui/SettingsCard"\n"""
if "import { WorkflowHeader }" not in content:
    content = content.replace('import { useRouter } from "next/navigation"', 'import { useRouter } from "next/navigation"\n' + import_add)

aspect_regex = r'<div className="grid grid-cols-3 gap-2">\s*<button[\s\S]*?1:1 \(Insta\)\s*<\/button>\s*<\/div>'
content = re.sub(aspect_regex, '<AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />', content)

voice_regex = r'<select\s*value=\{voice\}\s*onChange=\{\(e\) => setVoice\(e\.target\.value\)\}\s*className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"\s*>\s*<option value="alloy">Alloy \(Authoritative Neutral\)<\/option>\s*<option value="echo">Echo \(Warm Conversational\)<\/option>\s*<option value="fable">Fable \(Expressive Storyteller\)<\/option>\s*<option value="onyx">Onyx \(Deep Professional\)<\/option>\s*<option value="nova">Nova \(High-Energy Dynamic\)<\/option>\s*<option value="shimmer">Shimmer \(Clear & Polished\)<\/option>\s*<\/select>'
content = re.sub(voice_regex, '<VoiceSelector value={voice} onChange={setVoice} />', content)

with open(r'app\(app)\create\auto\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced auto successfully!")
