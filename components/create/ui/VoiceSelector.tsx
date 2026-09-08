interface VoiceSelectorProps {
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
