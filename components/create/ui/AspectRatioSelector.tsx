interface AspectRatioSelectorProps {
  value: string;
  onChange: (val: string) => void;
}

export function AspectRatioSelector({ value, onChange }: AspectRatioSelectorProps) {
  const baseClass = "px-2 py-1.5 text-xs rounded border transition-colors";
  const activeClass = "bg-emerald-600 text-white border-emerald-600";
  const inactiveClass = "bg-transparent text-muted-foreground";

  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        type="button"
        onClick={() => onChange("9:16")}
        className={`${baseClass} ${value === "9:16" ? activeClass : inactiveClass}`}
      >
        9:16 (Shorts)
      </button>
      <button
        type="button"
        onClick={() => onChange("16:9")}
        className={`${baseClass} ${value === "16:9" ? activeClass : inactiveClass}`}
      >
        16:9 (YT)
      </button>
      <button
        type="button"
        onClick={() => onChange("1:1")}
        className={`${baseClass} ${value === "1:1" ? activeClass : inactiveClass}`}
      >
        1:1 (Insta)
      </button>
    </div>
  )
}
