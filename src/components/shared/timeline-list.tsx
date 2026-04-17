import Link from "next/link"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { StatusBadge, type StatusTone } from "./status-badge"

export interface TimelineItem {
  id: string
  date: string | Date
  title: ReactNode
  body?: ReactNode
  meta?: ReactNode
  badge?: { label: string; tone?: StatusTone }
  href?: string
}

function toMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function formatMonth(d: Date) {
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
}

function formatDay(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
}

export function TimelineList({
  items,
  emptyMessage = "Nothing here yet.",
}: {
  items: TimelineItem[]
  emptyMessage?: string
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  const groups = new Map<string, { label: string; items: TimelineItem[] }>()
  for (const item of items) {
    const d = typeof item.date === "string" ? new Date(item.date) : item.date
    const key = toMonthKey(d)
    const existing = groups.get(key)
    if (existing) {
      existing.items.push(item)
    } else {
      groups.set(key, { label: formatMonth(d), items: [item] })
    }
  }

  const ordered = Array.from(groups.entries()).sort(([a], [b]) => (a < b ? 1 : -1))

  return (
    <div className="space-y-8">
      {ordered.map(([key, group]) => (
        <section key={key}>
          <h3 className="mb-3 text-sm font-semibold tracking-tight text-foreground">
            {group.label}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {group.items.length}
            </span>
          </h3>
          <ol className="relative space-y-3 border-l border-border pl-6">
            {group.items.map((item) => {
              const d = typeof item.date === "string" ? new Date(item.date) : item.date
              return (
                <li key={item.id} className="relative">
                  <span className="absolute -left-[27px] top-2 size-2 rounded-full bg-primary ring-4 ring-background" />
                  <TimelineCard item={item} dayLabel={formatDay(d)} />
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}

function TimelineCard({ item, dayLabel }: { item: TimelineItem; dayLabel: string }) {
  const inner = (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 transition-colors",
        item.href && "hover:border-foreground/20 hover:bg-muted/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">{dayLabel}</span>
            {item.badge && (
              <StatusBadge tone={item.badge.tone ?? "slate"}>{item.badge.label}</StatusBadge>
            )}
          </div>
          <div className="mt-1 text-[0.9375rem] font-semibold tracking-tight text-foreground">
            {item.title}
          </div>
          {item.body && <div className="mt-1 text-sm text-muted-foreground">{item.body}</div>}
        </div>
        {item.meta && <div className="shrink-0 text-right text-sm text-muted-foreground">{item.meta}</div>}
      </div>
    </div>
  )
  if (item.href) {
    return (
      <Link href={item.href} className="block">
        {inner}
      </Link>
    )
  }
  return inner
}
