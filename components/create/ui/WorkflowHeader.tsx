import { LucideIcon } from "lucide-react"

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
        <Icon className="h-6 w-6" />
        {title}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        {description}
      </p>
    </div>
  )
}
