// KanbanBoard — horizontal column board for swim-lane style task/status views.
// Typical uses: pipeline stages (leads, deals, orders), production workflow,
// release trains. Pure presentational: parent owns ordering and card data.
// Cards are clickable if they carry an `href`; drag-and-drop is out of scope.

import Link from "next/link"
import { type ReactNode, type CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { StatusBadge, type StatusTone } from "./status-badge"

export interface KanbanColumn {
  key: string
  label: string
  tone?: StatusTone
}

export interface KanbanCard {
  id: string
  columnKey: string
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  badge?: { label: string; tone?: StatusTone }
  href?: string
}

const COLUMN_SPAN_CLASS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
}

export function KanbanBoard({
  columns,
  cards,
  emptyColumnMessage = "Nothing here",
}: {
  columns: KanbanColumn[]
  cards: KanbanCard[]
  emptyColumnMessage?: string
}) {
  const count = columns.length
  const useInlineGrid = count > 5
  const gridClass = useInlineGrid
    ? "grid grid-cols-1 md:grid-cols-2 gap-3"
    : cn("grid grid-cols-1 md:grid-cols-2 gap-3", COLUMN_SPAN_CLASS[count] ?? "lg:grid-cols-5")
  const gridStyle: CSSProperties | undefined = useInlineGrid
    ? { gridTemplateColumns: `repeat(${count}, minmax(240px, 1fr))` }
    : undefined

  const byColumn = new Map<string, KanbanCard[]>()
  for (const col of columns) byColumn.set(col.key, [])
  for (const card of cards) {
    const bucket = byColumn.get(card.columnKey)
    if (bucket) bucket.push(card)
  }

  return (
    <div className="overflow-x-auto">
      <div
        className={gridClass}
        style={{
          ...gridStyle,
          minWidth: useInlineGrid ? `min(${count * 260}px, 100%)` : undefined,
        }}
      >
        {columns.map((column) => {
          const columnCards = byColumn.get(column.key) ?? []
          return (
            <div
              key={column.key}
              className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-3 min-w-[240px]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {column.tone ? (
                    <StatusBadge tone={column.tone}>{column.label}</StatusBadge>
                  ) : (
                    <span className="text-sm font-semibold tracking-tight truncate">
                      {column.label}
                    </span>
                  )}
                </div>
                <span className="inline-flex items-center justify-center rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border tabular-nums">
                  {columnCards.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {columnCards.length === 0 ? (
                  <div className="rounded-md border border-dashed bg-background/40 p-4 text-center text-sm text-muted-foreground">
                    {emptyColumnMessage}
                  </div>
                ) : (
                  columnCards.map((card) => <KanbanBoardCard key={card.id} card={card} />)
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KanbanBoardCard({ card }: { card: KanbanCard }) {
  const inner = (
    <div
      className={cn(
        "rounded-md bg-background border p-3 space-y-1 transition-colors",
        card.href && "hover:border-foreground/20 hover:bg-muted/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 text-sm font-semibold tracking-tight text-foreground">
          {card.title}
        </div>
        {card.badge && (
          <StatusBadge tone={card.badge.tone ?? "slate"}>{card.badge.label}</StatusBadge>
        )}
      </div>
      {card.subtitle && (
        <div className="text-sm text-muted-foreground">{card.subtitle}</div>
      )}
      {card.meta && (
        <div className="text-sm text-muted-foreground/80 tabular-nums">{card.meta}</div>
      )}
    </div>
  )
  if (card.href) {
    return (
      <Link href={card.href} className="block">
        {inner}
      </Link>
    )
  }
  return inner
}
