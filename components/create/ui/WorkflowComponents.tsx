"use client";

import { LucideIcon, Loader2, CheckCircle2 } from "lucide-react";

interface WorkflowLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function WorkflowLayout({ children, className = "" }: WorkflowLayoutProps) {
  return (
    <div className={`flex flex-1 flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full ${className}`}>
      {children}
    </div>
  );
}

export function WorkflowHeader({
  icon: Icon,
  title,
  description,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
              <Icon className="h-6 w-6 text-primary" />
              {title}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  icon: Icon,
  children,
  className = "",
  iconClassName = "h-5 w-5 text-primary",
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div className={`rounded-xl border bg-card p-5 shadow-sm space-y-4 ${className}`}>
      <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
        <Icon className={iconClassName} />
        {title}
      </h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

export function ResponsiveGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-6 lg:grid-cols-[1fr_350px] ${className}`}>
      {children}
    </div>
  );
}

export function FormSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="font-semibold text-sm text-foreground mb-2">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function FormField({
  label,
  children,
  description,
  error,
  className = "",
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  description?: string;
  error?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function SelectTrigger({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
  className?: string;
}) {
  const baseClass = "px-2 py-1.5 text-xs rounded border transition-colors font-medium";

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`${value === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground hover:bg-muted"} ${baseClass}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function PlatformSelector({
  platforms,
  value,
  onChange,
  className = "",
}: {
  platforms: { id: string; label: string }[];
  value: string[];
  onChange: (platforms: string[]) => void;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${className}`}>
      {platforms.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => {
            const newPlatforms = value.includes(p.id)
              ? value.filter((id) => id !== p.id)
              : [...value, p.id];
            onChange(newPlatforms);
          }}
          className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-colors ${
            value.includes(p.id)
              ? "border-primary bg-primary/10 font-medium text-primary"
              : "hover:bg-muted/50 text-muted-foreground opacity-60"
          }`}
        >
          <span>{p.label}</span>
          {value.includes(p.id) && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
        </button>
      ))}
    </div>
  );
}

export function InputField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  className = "",
  disabled = false,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        type={type}
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={`w-full rounded-lg border border-input bg-background/50 px-4 py-2.5 text-sm shadow-inner placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      />
    </div>
  );
}

export function TextareaField({
  label,
  placeholder,
  value,
  onChange,
  rows = 4,
  className = "",
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  rows?: number;
  className?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <textarea
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-[120px] w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm shadow-inner placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      />
    </div>
  );
}

export function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  className = "",
}: {
  label: React.ReactNode;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        <label className="relative inline-flex items-center cursor-pointer group">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          <span className="ml-3 text-sm font-medium flex items-center gap-1.5">{label}</span>
        </label>
      </div>
      {description && <p className="text-xs text-muted-foreground ml-14 mt-1">{description}</p>}
    </div>
  );
}

export function CardGrid({
  items,
  columns = 4,
  className = "",
  renderItem,
}: {
  items: Array<Record<string, unknown>>;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  renderItem: (item: Record<string, unknown>) => React.ReactNode;
}) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns} gap-3 ${className}`}>
      {items.map((item, index) => (
        <div key={`${item.id || index}`}>{renderItem(item)}</div>
      ))}
    </div>
  );
}

export function ButtonPrimary({
  children,
  loading = false,
  disabled = false,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2 rounded-md bg-primary hover:bg-primary/90 px-4 py-3 text-sm font-medium text-primary-foreground shadow transition-colors disabled:opacity-50 ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function ButtonSecondary({
  children,
  loading = false,
  disabled = false,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={loading || disabled}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-md border bg-transparent hover:bg-muted px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  onClick,
  className = "",
  disabled = false,
  "aria-label": ariaLabel,
}: {
  icon: LucideIcon;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-lg border border-transparent hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50 ${className}`}
      aria-label={ariaLabel}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function ErrorAlert({ message, className = "" }: { message: string; className?: string }) {
  return (
    <div className={`rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive ${className}`}>
      {message}
    </div>
  );
}

export function SuccessAlert({ message, className = "" }: { message: string; className?: string }) {
  return (
    <div className={`rounded-md border border-emerald-500 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 ${className}`}>
      {message}
    </div>
  );
}

export function LoadingState({ message = "Loading...", className = "" }: { message?: string; className?: string }) {
  return (
    <div className={`py-20 flex flex-col items-center justify-center text-muted-foreground gap-4 ${className}`}>
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`aspect-video rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-center overflow-hidden ${className}`}>
      <div className="text-center p-8 text-zinc-400">
        <p className="text-lg font-medium mb-2">{title}</p>
        <p className="text-sm text-zinc-500">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

export function Skeleton({
  className = "",
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  const widths = Array.from({ length: lines }, (_, i) => 70 + ((i * 37) % 31));
  return (
    <div className={`space-y-3 ${className}`}>
      {widths.map((width, i) => (
        <div key={i} className="h-4 bg-muted animate-pulse rounded" style={{ width: `${width}%` }} />
      ))}
    </div>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <div className={`border-t border-border ${className}`} />;
}