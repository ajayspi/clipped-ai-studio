interface ErrorAlertProps {
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
