/** Shared date-range utilities for P&L — importable from both server and client. */

export type DatePreset = "today" | "week" | "month" | "all" | "custom"

export function getPresetDates(preset: DatePreset): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().slice(0, 10)
  switch (preset) {
    case "today":
      return { from: to, to }
    case "week": {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      const monday = new Date(now)
      monday.setDate(now.getDate() - diff)
      return { from: monday.toISOString().slice(0, 10), to }
    }
    case "month":
      return {
        from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
        to,
      }
    case "all":
      return { from: "", to: "" }
    case "custom":
      return { from: "", to: "" }
  }
}

export function resolveDateRange(searchParams: Record<string, string | string[] | undefined>): {
  from: string | null
  to: string | null
  label: string
} {
  const range = (typeof searchParams.range === "string" ? searchParams.range : "today") as DatePreset

  if (range === "custom") {
    const from = typeof searchParams.from === "string" ? searchParams.from : null
    const to = typeof searchParams.to === "string" ? searchParams.to : null
    if (from && to) return { from, to, label: `${from} — ${to}` }
    return { from: null, to: null, label: "All Time" }
  }

  if (range === "all") return { from: null, to: null, label: "All Time" }

  const { from, to } = getPresetDates(range)
  const labelMap: Record<string, string> = {
    today: "Today",
    week: "This Week",
    month: "This Month",
  }
  return { from: from || null, to: to || null, label: labelMap[range] || range }
}
