import os

components = {
    "WorkflowHeader.tsx": """import { LucideIcon } from "lucide-react"

interface WorkflowHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconClassName?: string;
}

export function WorkflowHeader({ icon: Icon, title, description, iconClassName = "text-emerald-500" }: WorkflowHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <Icon className={h-6 w-6 } />
        {title}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        {description}
      </p>
    </div>
  )
}
""",
    "VoiceSelector.tsx": """interface VoiceSelectorProps {
  value: string;
  onChange: (val: string) => void;
}

export function VoiceSelector({ value, onChange }: VoiceSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <option value="alloy">Alloy (Authoritative Neutral)</option>
      <option value="echo">Echo (Warm Conversational)</option>
      <option value="fable">Fable (Expressive Storyteller)</option>
      <option value="onyx">Onyx (Deep Professional)</option>
      <option value="nova">Nova (High-Energy Dynamic)</option>
      <option value="shimmer">Shimmer (Clear & Polished)</option>
    </select>
  )
}
""",
    "AspectRatioSelector.tsx": """interface AspectRatioSelectorProps {
  value: string;
  onChange: (val: string) => void;
}

export function AspectRatioSelector({ value, onChange }: AspectRatioSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        type="button"
        onClick={() => onChange("9:16")}
        className={px-2 py-1.5 text-xs rounded border transition-colors }
      >
        9:16 (Shorts)
      </button>
      <button
        type="button"
        onClick={() => onChange("16:9")}
        className={px-2 py-1.5 text-xs rounded border transition-colors }
      >
        16:9 (YT)
      </button>
      <button
        type="button"
        onClick={() => onChange("1:1")}
        className={px-2 py-1.5 text-xs rounded border transition-colors }
      >
        1:1 (Insta)
      </button>
    </div>
  )
}
""",
    "MockModeToggle.tsx": """interface MockModeToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function MockModeToggle({ checked, onChange }: MockModeToggleProps) {
  return (
    <div className="pt-2 border-t flex items-center justify-between">
      <div>
        <div className="text-xs font-medium">Dry Run / Test Mode</div>
        <div className="text-[11px] text-muted-foreground">Generate full batch plan without API fees</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
      />
    </div>
  )
}
""",
    "GenerateButton.tsx": """import { Loader2, Sparkles } from "lucide-react"

interface GenerateButtonProps {
  loading: boolean;
  disabled: boolean;
  text: string;
  loadingText?: string;
  className?: string;
}

export function GenerateButton({ 
  loading, 
  disabled, 
  text, 
  loadingText = "Generating...", 
  className = "bg-emerald-600 hover:bg-emerald-700 text-white" 
}: GenerateButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={lex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-medium shadow transition-colors disabled:opacity-50 }
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          {text}
        </>
      )}
    </button>
  )
}
""",
    "ErrorAlert.tsx": """interface ErrorAlertProps {
  message: string;
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  if (!message) return null;
  return (
    <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
      {message}
    </div>
  )
}
""",
    "SettingsCard.tsx": """import { LucideIcon } from "lucide-react"

interface SettingsCardProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  iconClassName?: string;
}

export function SettingsCard({ icon: Icon, title, children, iconClassName = "text-emerald-500" }: SettingsCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
        <Icon className={h-4 w-4 } />
        {title}
      </h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}
"""
}

os.makedirs("components/create/ui", exist_ok=True)
for filename, content in components.items():
    with open(f"components/create/ui/{filename}", "w", encoding="utf-8") as f:
        f.write(content)
print("Created components!")
