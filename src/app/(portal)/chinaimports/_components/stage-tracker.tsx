import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { STAGE_ORDER, STAGE_LABELS, type StageKey } from "./stage-labels"
import { formatDate } from "@/lib/format"

export interface StageRow {
  stage_key: string
  stage_index: number
  status: string
  completed_at: string | null
}

/**
 * 9-stage horizontal tracker for chinaimports orders/RFQs. Completed nodes
 * render navy filled with a checkmark; the active node is outlined in navy
 * with the index; pending nodes are muted. Connector bars between nodes are
 * navy when the left node is complete.
 */
export function StageTracker({ stages }: { stages: StageRow[] }) {
  const byKey = new Map(stages.map((s) => [s.stage_key, s]))

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
      <div className="flex items-start gap-2 overflow-x-auto">
        {STAGE_ORDER.map((key, i) => {
          const stage = byKey.get(key)
          const status = stage?.status ?? "pending"
          const prev = i > 0 ? byKey.get(STAGE_ORDER[i - 1] as StageKey) : null
          const connectorDone = prev?.status === "completed"
          return (
            <div key={key} className="flex items-start gap-2 shrink-0 first:pl-0">
              {i > 0 && (
                <span
                  className={cn(
                    "mt-4 h-0.5 w-6 rounded-full shrink-0",
                    connectorDone ? "bg-[#1E3A5F]" : "bg-border",
                  )}
                />
              )}
              <div className="flex flex-col items-center gap-1.5 min-w-[90px]">
                <StageNode index={i + 1} status={status} />
                <div className="text-center">
                  <p className="text-xs font-semibold tracking-tight">{STAGE_LABELS[key]}</p>
                  <p className="text-xs text-muted-foreground tabular-nums h-4">
                    {stage?.completed_at ? formatDate(stage.completed_at) : status === "active" ? "Active" : ""}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StageNode({ index, status }: { index: number; status: string }) {
  if (status === "completed") {
    return (
      <span className="h-8 w-8 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center shrink-0">
        <Check className="size-4" strokeWidth={3} />
      </span>
    )
  }
  if (status === "active") {
    return (
      <span className="h-8 w-8 rounded-full border-2 border-[#1E3A5F] text-[#1E3A5F] bg-white flex items-center justify-center shrink-0 text-sm font-bold tabular-nums">
        {index}
      </span>
    )
  }
  if (status === "blocked") {
    return (
      <span className="h-8 w-8 rounded-full bg-red-100 text-red-700 border-2 border-red-500 flex items-center justify-center shrink-0 text-sm font-bold tabular-nums">
        {index}
      </span>
    )
  }
  return (
    <span className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0 text-sm font-medium tabular-nums">
      {index}
    </span>
  )
}
