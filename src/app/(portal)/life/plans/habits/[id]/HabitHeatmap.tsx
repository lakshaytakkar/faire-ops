"use client"

/**
 * Simple calendar heatmap: 90 days grouped by week, newest on right. Green
 * filled for "done", amber for "partial", neutral for missing/skipped. No
 * extra packages; pure Tailwind squares.
 */
export function HabitHeatmap({
  logMap,
  days = 90,
}: {
  logMap: Array<[string, string]>
  days?: number
}) {
  const map = new Map(logMap)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const grid: Array<{ date: string; status: string }> = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000)
    const key = d.toISOString().slice(0, 10)
    grid.push({ date: key, status: map.get(key) ?? "" })
  }

  return (
    <div className="space-y-3">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
      >
        {grid.map((cell) => {
          const className =
            cell.status === "done"
              ? "bg-emerald-500"
              : cell.status === "partial"
                ? "bg-amber-400"
                : cell.status === "skipped"
                  ? "bg-slate-300"
                  : "bg-muted"
          return (
            <div
              key={cell.date}
              title={`${cell.date} — ${cell.status || "no log"}`}
              className={`aspect-square rounded-sm ${className}`}
            />
          )
        })}
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-emerald-500" /> Done
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-amber-400" /> Partial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-slate-300" /> Skipped
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-muted" /> No log
        </span>
      </div>
    </div>
  )
}
