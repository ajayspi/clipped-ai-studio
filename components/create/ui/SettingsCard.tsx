import { LucideIcon } from "lucide-react"

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
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}
