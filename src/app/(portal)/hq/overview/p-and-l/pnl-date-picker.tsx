"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import { Calendar } from "lucide-react"
import type { DatePreset } from "./pnl-utils"

const PRESETS: { label: string; value: DatePreset }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "All Time", value: "all" },
  { label: "Custom", value: "custom" },
]

export function PnlDatePicker() {
  const router = useRouter()
  const sp = useSearchParams()

  const currentPreset = (sp.get("range") as DatePreset) || "today"
  const customFrom = sp.get("from") || ""
  const customTo = sp.get("to") || ""
  const [showCustom, setShowCustom] = useState(currentPreset === "custom")
  const [localFrom, setLocalFrom] = useState(customFrom)
  const [localTo, setLocalTo] = useState(customTo)

  const navigate = useCallback(
    (preset: DatePreset, from?: string, to?: string) => {
      const params = new URLSearchParams()
      params.set("range", preset)
      if (preset === "custom" && from && to) {
        params.set("from", from)
        params.set("to", to)
      }
      router.push(`?${params.toString()}`)
    },
    [router],
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-card p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => {
              if (p.value === "custom") {
                setShowCustom(true)
                return
              }
              setShowCustom(false)
              navigate(p.value)
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              currentPreset === p.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={localFrom}
            onChange={(e) => setLocalFrom(e.target.value)}
            className="rounded-md border border-border/80 bg-card px-2 py-1.5 text-sm"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={localTo}
            onChange={(e) => setLocalTo(e.target.value)}
            className="rounded-md border border-border/80 bg-card px-2 py-1.5 text-sm"
          />
          <button
            onClick={() => {
              if (localFrom && localTo) navigate("custom", localFrom, localTo)
            }}
            disabled={!localFrom || !localTo}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
