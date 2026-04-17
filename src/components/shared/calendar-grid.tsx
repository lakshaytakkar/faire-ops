// CalendarGrid — pure presentational month-view calendar (7 columns).
// Typical uses: production schedule, content calendar, ETA boards, attendance.
// Parent owns navigation between months — this primitive only renders one
// month at a time. Cells outside the active month are dimmed; today gets a ring.

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface CalendarGridProps {
  year: number
  month: number
  render: (date: Date) => ReactNode
  onCellClick?: (date: Date) => void
  weekStartsOn?: 0 | 1
}

const DAY_NAMES_MON_FIRST = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const DAY_NAMES_SUN_FIRST = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function CalendarGrid({
  year,
  month,
  render,
  onCellClick,
  weekStartsOn = 1,
}: CalendarGridProps) {
  const dayNames = weekStartsOn === 1 ? DAY_NAMES_MON_FIRST : DAY_NAMES_SUN_FIRST

  const firstOfMonth = new Date(year, month, 1)
  const firstWeekday = firstOfMonth.getDay() // 0=Sun..6=Sat
  // Number of leading days from previous month
  const lead = (firstWeekday - weekStartsOn + 7) % 7

  // Build a 6x7 grid (42 cells) starting from the first visible date
  const start = new Date(year, month, 1 - lead)
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }

  // Trim trailing weeks that are entirely in the next month, keep at least 5 rows
  const rowsNeeded = Math.max(5, Math.ceil((lead + new Date(year, month + 1, 0).getDate()) / 7))
  const visibleCells = cells.slice(0, rowsNeeded * 7)

  const today = new Date()

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b">
        <div className="text-sm font-semibold tracking-tight text-foreground tabular-nums">
          {MONTH_NAMES[month]} {year}
        </div>
      </div>

      <div className="grid grid-cols-7 border-b bg-muted/30">
        {dayNames.map((name) => (
          <div
            key={name}
            className="px-2 py-2 text-sm font-medium text-muted-foreground text-center"
          >
            {name}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {visibleCells.map((date, idx) => {
          const inMonth = date.getMonth() === month
          const isToday = isSameDay(date, today)
          const clickable = !!onCellClick

          const cellInner = (
            <div className="flex h-full min-h-[80px] flex-col gap-1 p-2">
              <div
                className={cn(
                  "text-sm font-semibold tabular-nums leading-none",
                  inMonth ? "text-foreground" : "text-muted-foreground/50",
                )}
              >
                {date.getDate()}
              </div>
              <div className={cn("flex-1 text-sm", !inMonth && "opacity-50")}>
                {render(date)}
              </div>
            </div>
          )

          const baseClass = cn(
            "border-r border-b last:border-r-0 transition-colors",
            !inMonth && "bg-muted/20",
            isToday && "ring-2 ring-inset ring-primary",
            clickable && "cursor-pointer hover:bg-muted/40",
            // Drop right border on every 7th cell
            (idx + 1) % 7 === 0 && "border-r-0",
          )

          if (clickable) {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onCellClick?.(date)}
                className={cn(baseClass, "text-left")}
              >
                {cellInner}
              </button>
            )
          }
          return (
            <div key={idx} className={baseClass}>
              {cellInner}
            </div>
          )
        })}
      </div>
    </div>
  )
}
