import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

export function KPIGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3", className)}>
      {children}
    </div>
  )
}
