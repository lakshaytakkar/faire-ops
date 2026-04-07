"use client"

import { useState } from "react"
import {
  CheckCircle2,
  Circle,
  ShoppingCart,
  Layers,
  MessageSquare,
  FileText,
  Lock,
  Clock,
} from "lucide-react"

const today = new Date()
const todayLabel = today.toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
})

interface ChecklistSection {
  title: string
  icon: React.ElementType
  items: string[]
}

const SECTIONS: ChecklistSection[] = [
  {
    title: "Orders",
    icon: ShoppingCart,
    items: [
      "All pending orders accepted",
      "All tracking numbers added",
      "Returns reviewed",
      "Late ship % checked",
    ],
  },
  {
    title: "Catalog",
    icon: Layers,
    items: [
      "Listings added today",
      "Publishing queue reviewed",
      "Image studio cleared",
    ],
  },
  {
    title: "Outreach",
    icon: MessageSquare,
    items: [
      "WhatsApp log submitted",
      "Follow-ups sent",
      "Email results logged",
    ],
  },
  {
    title: "Reporting",
    icon: FileText,
    items: [
      "Daily report submitted",
      "Issues flagged",
    ],
  },
]

const TOTAL_ITEMS = SECTIONS.reduce((s, sec) => s + sec.items.length, 0)

// Calendar history mock: 1 = closed, 0 = missed, -1 = future
function getDayStatuses(): number[] {
  const currentDay = today.getDate()
  const statuses: number[] = []
  for (let d = 1; d <= 30; d++) {
    if (d > currentDay) {
      statuses.push(-1) // future
    } else if (d === currentDay) {
      statuses.push(-1) // today (not yet closed)
    } else {
      // Simulate: weekdays mostly closed, some missed
      const dayOfWeek = new Date(2026, 3, d).getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        statuses.push(-1) // weekend = not applicable, treat as future/gray
      } else if (d === 7 || d === 15) {
        statuses.push(0) // missed
      } else {
        statuses.push(1) // closed
      }
    }
  }
  return statuses
}

function StatusBadge({
  label,
  variant,
}: {
  label: string
  variant: "success" | "warning"
}) {
  const styles: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
  }
  return (
    <span className={`inline-flex items-center border-0 text-xs font-medium px-2 py-0.5 rounded-full ${styles[variant]}`}>
      {label}
    </span>
  )
}

export default function DayClosePage() {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [closed, setClosed] = useState(false)
  const [closedTime, setClosedTime] = useState("")

  const checkedCount = checked.size
  const canClose = checkedCount >= Math.ceil(TOTAL_ITEMS * 0.8)

  function toggleItem(key: string) {
    if (closed) return
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleClose() {
    const now = new Date()
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()
    setClosedTime(timeStr)
    setClosed(true)
  }

  const dayStatuses = getDayStatuses()

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Day Close</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{todayLabel}</p>
        </div>
        {closed ? (
          <StatusBadge label={`Closed at ${closedTime}`} variant="success" />
        ) : (
          <StatusBadge label="Open" variant="warning" />
        )}
      </div>

      {/* Progress bar */}
      <div className="rounded-md border bg-card p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Checklist progress: {checkedCount} of {TOTAL_ITEMS} items
          </span>
          <span className="text-sm font-medium">{Math.round((checkedCount / TOTAL_ITEMS) * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${checkedCount / TOTAL_ITEMS >= 0.8 ? "bg-emerald-500" : "bg-amber-500"}`}
            style={{ width: `${(checkedCount / TOTAL_ITEMS) * 100}%` }}
          />
        </div>
      </div>

      {/* Checklist Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {SECTIONS.map((section) => {
          const Icon = section.icon
          const sectionChecked = section.items.filter((item) => checked.has(`${section.title}-${item}`)).length
          return (
            <div key={section.title} className="rounded-md border bg-card overflow-hidden">
              <div className="flex items-center justify-between border-b px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">{section.title}</h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  {sectionChecked}/{section.items.length}
                </span>
              </div>
              <div>
                {section.items.map((item, idx) => {
                  const key = `${section.title}-${item}`
                  const isChecked = checked.has(key)
                  const isLast = idx === section.items.length - 1
                  return (
                    <button
                      key={key}
                      onClick={() => toggleItem(key)}
                      disabled={closed}
                      className={`flex items-center gap-3 px-5 py-3 w-full text-left hover:bg-muted/20 transition-colors disabled:cursor-not-allowed ${!isLast ? "border-b" : ""}`}
                    >
                      {isChecked ? (
                        <div className="h-5 w-5 rounded-md bg-primary flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-md border-2 border-muted-foreground/30 shrink-0" />
                      )}
                      <span className={`text-sm ${isChecked ? "line-through text-muted-foreground" : ""}`}>
                        {item}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mark Day as Closed Button */}
      <button
        onClick={handleClose}
        disabled={!canClose || closed}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {closed ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Day Closed at {closedTime}
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Mark Day as Closed
          </>
        )}
      </button>
      {!canClose && !closed && (
        <p className="text-xs text-muted-foreground text-center -mt-3">
          Complete at least {Math.ceil(TOTAL_ITEMS * 0.8)} of {TOTAL_ITEMS} items to close the day
        </p>
      )}

      {/* Calendar History */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            April History
          </h2>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Closed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-red-500" /> Missed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-muted" /> Future
            </span>
          </div>
        </div>
        <div className="p-5">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="text-xs text-center text-muted-foreground font-medium">{d}</div>
            ))}
          </div>
          {/* Calendar grid - April 2026 starts on Wednesday (index 2, with Mon=0) */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty slots for Mon, Tue before April 1 (Wed) */}
            {[0, 1].map((i) => (
              <div key={`empty-${i}`} className="h-9" />
            ))}
            {dayStatuses.map((status, idx) => {
              const day = idx + 1
              const isToday = day === today.getDate()
              return (
                <div
                  key={day}
                  className={`h-9 rounded-md flex items-center justify-center text-xs font-medium transition-colors ${
                    status === 1
                      ? "bg-emerald-500 text-white"
                      : status === 0
                        ? "bg-red-500 text-white"
                        : "bg-muted text-muted-foreground"
                  } ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}`}
                >
                  {day}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
