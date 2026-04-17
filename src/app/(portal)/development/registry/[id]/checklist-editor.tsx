"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { CheckCircle2, Circle, Clock, AlertOctagon } from "lucide-react"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { formatDateTime } from "@/lib/format"

export type ChecklistItemStatus = "pending" | "in_progress" | "done" | "blocked"

export interface ChecklistItem {
  key: string
  label: string
  status: ChecklistItemStatus
  notes: string | null
  description?: string | null
  required?: boolean
  updated_at?: string | null
  updated_by?: string | null
}

const ITEM_TONE: Record<ChecklistItemStatus, StatusTone> = {
  pending: "slate",
  in_progress: "amber",
  done: "emerald",
  blocked: "red",
}

const STATUS_OPTIONS: Array<{ value: ChecklistItemStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
]

function StatusIcon({ status }: { status: ChecklistItemStatus }) {
  if (status === "done") return <CheckCircle2 className="size-4 text-emerald-600" />
  if (status === "in_progress") return <Clock className="size-4 text-amber-600" />
  if (status === "blocked") return <AlertOctagon className="size-4 text-red-600" />
  return <Circle className="size-4 text-slate-400" />
}

export function ChecklistEditor({
  checklistId,
  items: initialItems,
}: {
  checklistId: string
  items: ChecklistItem[]
  updateableItems: ChecklistItem[]
}) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems)
  const [, startTransition] = useTransition()

  async function persist(next: ChecklistItem[]) {
    const { error } = await supabase
      .from("project_checklists")
      .update({ items: next, updated_at: new Date().toISOString() })
      .eq("id", checklistId)
    if (error) {
      toast.error("Failed to save", { description: error.message })
      return false
    }
    return true
  }

  function updateItem(key: string, patch: Partial<ChecklistItem>) {
    const prev = items
    const next = items.map((it) =>
      it.key === key
        ? { ...it, ...patch, updated_at: new Date().toISOString() }
        : it,
    )
    setItems(next)
    startTransition(async () => {
      const ok = await persist(next)
      if (!ok) {
        setItems(prev)
      } else if (patch.status) {
        toast.success("Checklist updated")
      }
    })
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No checklist items yet.</p>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-md border border-border/80 bg-background p-3 space-y-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <StatusIcon status={item.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">
                    {item.label}
                  </span>
                  {item.required && (
                    <StatusBadge tone="blue">required</StatusBadge>
                  )}
                  <StatusBadge tone={ITEM_TONE[item.status]}>
                    {item.status.replace(/_/g, " ")}
                  </StatusBadge>
                </div>
                {item.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                )}
                {item.updated_at && (
                  <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                    Updated {formatDateTime(item.updated_at)}
                  </p>
                )}
              </div>
            </div>
            <div className="shrink-0 w-40">
              <Select
                value={item.status}
                onValueChange={(v) =>
                  updateItem(item.key, { status: v as ChecklistItemStatus })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <textarea
            defaultValue={item.notes ?? ""}
            placeholder="Add notes…"
            onBlur={(e) => {
              const v = e.target.value.trim()
              const currentNotes = (item.notes ?? "").trim()
              if (v !== currentNotes) {
                updateItem(item.key, { notes: v || null })
              }
            }}
            className="w-full min-h-[56px] rounded-md border border-border bg-background px-3 py-2 text-sm resize-y"
          />
        </div>
      ))}
    </div>
  )
}
