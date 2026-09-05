import { Loader2, Sparkles } from "lucide-react"

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
