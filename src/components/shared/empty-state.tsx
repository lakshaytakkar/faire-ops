import { type ReactNode } from "react"
import { type LucideIcon } from "lucide-react"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-8 md:p-10 flex flex-col items-center justify-center text-center gap-3">
      {Icon && (
        <span className="inline-flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
      )}
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
