interface MockModeToggleProps {
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
