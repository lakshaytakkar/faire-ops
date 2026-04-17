"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PerformanceDot, type PerformanceTag } from "@/components/shared/performance-dot"
import { cn } from "@/lib/utils"

type Status =
  | "active"
  | "probation"
  | "onboarding"
  | "on_leave"
  | "notice_period"
  | "resigned"
  | "terminated"
  | "offboarded"

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "probation", label: "Probation" },
  { value: "onboarding", label: "Onboarding" },
  { value: "on_leave", label: "On leave" },
  { value: "notice_period", label: "Notice period" },
  { value: "resigned", label: "Resigned" },
  { value: "terminated", label: "Terminated" },
  { value: "offboarded", label: "Offboarded" },
]

const TAG_OPTIONS: { value: PerformanceTag | null; label: string }[] = [
  { value: null, label: "No tag" },
  { value: "dark_green", label: "Standout" },
  { value: "green", label: "On track" },
  { value: "yellow", label: "Watch" },
  { value: "red", label: "Non-performance" },
]

export function EmployeeStatusEditor({
  employeeId,
  initialStatus,
  initialTag,
}: {
  employeeId: string
  initialStatus: string | null
  initialTag: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>((initialStatus as Status) ?? "active")
  const [tag, setTag] = useState<PerformanceTag | null>(
    (initialTag as PerformanceTag | null) ?? null,
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setError(null)
    const res = await fetch(`/api/hq/employees/${employeeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, performance_tag: tag }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setError(data.error ?? "Failed to save")
      return
    }
    setOpen(false)
    startTransition(() => router.refresh())
  }

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        className="gap-2"
      >
        <PerformanceDot tag={tag} size="sm" showRing={false} />
        Edit status
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-md border border-border bg-popover p-3 shadow-lg space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Employment status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Performance tag
            </label>
            <div className="grid grid-cols-5 gap-1">
              {TAG_OPTIONS.map((o) => {
                const active = tag === o.value
                return (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => setTag(o.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md border px-1.5 py-1.5 text-[0.6875rem] transition-colors",
                      active
                        ? "border-foreground/40 bg-muted"
                        : "border-border hover:bg-muted/50",
                    )}
                    title={o.label}
                  >
                    {o.value ? (
                      <PerformanceDot tag={o.value} size="md" showRing={false} />
                    ) : (
                      <span className="size-2.5 rounded-full border border-dashed border-muted-foreground/50" />
                    )}
                    <span className="text-[0.6875rem] leading-none text-muted-foreground">
                      {o.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
