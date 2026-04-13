"use client"

import { useEffect, useState, useMemo, useCallback, DragEvent } from "react"
import Link from "next/link"
import { GripVertical, Users } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import {
  EtsListShell,
  EtsEmptyState,
  EtsStatusBadge,
  formatCurrency,
  formatInitials,
} from "@/app/(portal)/ets/_components/ets-ui"

interface PipelineClient {
  id: string
  name: string
  email: string | null
  phone: string | null
  city: string | null
  stage: string | null
  total_paid: number | null
  package_tier: string | null
  selected_package: string | null
  manager_name: string | null
  assigned_to: string | null
  total_score: number | null
  estimated_launch_date: string | null
  avatar_url: string | null
  days_in_stage: number | null
}

const STAGES: {
  id: string
  label: string
  color: string
  headerBg: string
  headerText: string
}[] = [
  { id: "new-lead", label: "New lead", color: "bg-slate-500", headerBg: "bg-slate-50", headerText: "text-slate-700" },
  { id: "qualified", label: "Qualified", color: "bg-blue-500", headerBg: "bg-blue-50", headerText: "text-blue-700" },
  { id: "token-paid", label: "Token paid", color: "bg-amber-500", headerBg: "bg-amber-50", headerText: "text-amber-700" },
  { id: "onboarding", label: "Onboarding", color: "bg-indigo-500", headerBg: "bg-indigo-50", headerText: "text-indigo-700" },
  { id: "onboarded", label: "Onboarded", color: "bg-emerald-500", headerBg: "bg-emerald-50", headerText: "text-emerald-700" },
  { id: "launched", label: "Launched", color: "bg-emerald-600", headerBg: "bg-emerald-50", headerText: "text-emerald-800" },
  { id: "refund", label: "Refund", color: "bg-rose-500", headerBg: "bg-rose-50", headerText: "text-rose-700" },
  { id: "lost", label: "Lost", color: "bg-zinc-400", headerBg: "bg-zinc-50", headerText: "text-zinc-700" },
]

export default function EtsPipelinePage() {
  const [rows, setRows] = useState<PipelineClient[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [pending, setPending] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabaseEts
      .from("clients")
      .select(
        "id, name, email, phone, city, stage, total_paid, package_tier, selected_package, manager_name, assigned_to, total_score, estimated_launch_date, avatar_url, days_in_stage",
      )
      .order("created_at", { ascending: false })
    setRows((data ?? []) as PipelineClient[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const grouped = useMemo(() => {
    const map = new Map<string, PipelineClient[]>()
    STAGES.forEach((s) => map.set(s.id, []))
    const unknown: PipelineClient[] = []
    rows.forEach((c) => {
      const key = c.stage ?? "new-lead"
      const bucket = map.get(key)
      if (bucket) bucket.push(c)
      else unknown.push({ ...c, stage: "new-lead" })
    })
    if (unknown.length) map.get("new-lead")!.push(...unknown)
    return map
  }, [rows])

  async function moveTo(clientId: string, newStage: string) {
    const prev = rows.find((r) => r.id === clientId)
    if (!prev || prev.stage === newStage) return
    setPending((s) => new Set(s).add(clientId))
    setRows((rs) => rs.map((r) => (r.id === clientId ? { ...r, stage: newStage } : r)))
    const { error } = await supabaseEts
      .from("clients")
      .update({
        stage: newStage,
        stage_changed_at: new Date().toISOString(),
      })
      .eq("id", clientId)
    setPending((s) => {
      const n = new Set(s)
      n.delete(clientId)
      return n
    })
    if (error) {
      setRows((rs) => rs.map((r) => (r.id === clientId ? { ...r, stage: prev.stage } : r)))
      console.error("Stage update failed:", error)
    }
  }

  function onDragStart(e: DragEvent<HTMLDivElement>, id: string) {
    setDragging(id)
    e.dataTransfer.effectAllowed = "move"
    const el = e.currentTarget
    el.style.opacity = "0.5"
    setTimeout(() => {
      el.style.opacity = "1"
    }, 0)
  }
  function onDragEnd() {
    setDragging(null)
    setDragOverCol(null)
  }
  function onDragOverCol(e: DragEvent, stage: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverCol(stage)
  }
  function onDragLeaveCol() {
    setDragOverCol(null)
  }
  function onDrop(e: DragEvent, stage: string) {
    e.preventDefault()
    setDragOverCol(null)
    if (dragging) moveTo(dragging, stage)
    setDragging(null)
  }

  return (
    <EtsListShell
      title="Pipeline"
      subtitle={
        loading
          ? "Loading…"
          : `${rows.length} client${rows.length === 1 ? "" : "s"} across ${STAGES.length} stages`
      }
      action={
        <Link
          href="/ets/sales/clients"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted/40"
        >
          List view
        </Link>
      }
    >
      {loading ? (
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
          {STAGES.map((_, i) => (
            <div key={i} className="h-72 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EtsEmptyState
          icon={Users}
          title="No clients yet"
          description="Create your first client to see it on the pipeline board."
          cta={
            <Link
              href="/ets/sales/clients"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
            >
              Go to clients
            </Link>
          }
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
          {STAGES.map((s) => {
            const list = grouped.get(s.id) ?? []
            const isDragOver = dragOverCol === s.id
            return (
              <div
                key={s.id}
                onDragOver={(e) => onDragOverCol(e, s.id)}
                onDragLeave={onDragLeaveCol}
                onDrop={(e) => onDrop(e, s.id)}
                className={`w-72 shrink-0 rounded-lg border bg-card shadow-sm overflow-hidden transition-all ${
                  isDragOver ? "ring-2 ring-primary/40 bg-primary/5" : ""
                }`}
              >
                <div
                  className={`px-3 py-2.5 border-b ${s.headerBg} flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`inline-block size-2.5 rounded-full ${s.color} shrink-0`}
                    />
                    <span
                      className={`text-xs font-semibold tracking-wide uppercase truncate ${s.headerText}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.color} text-white shrink-0`}
                  >
                    {list.length}
                  </span>
                </div>
                <div
                  className={`p-2 space-y-2 min-h-[400px] max-h-[calc(100vh-280px)] overflow-y-auto transition-colors ${isDragOver ? "bg-primary/5" : ""}`}
                >
                  {list.map((c) => {
                    const isDragging = dragging === c.id
                    return (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, c.id)}
                        onDragEnd={onDragEnd}
                        className={`group rounded-lg border bg-card p-3 space-y-2 cursor-grab active:cursor-grabbing transition-all ${
                          isDragging
                            ? "opacity-40 scale-95 border-primary"
                            : "hover:shadow-sm"
                        } ${pending.has(c.id) ? "opacity-60" : ""}`}
                      >
                        <Link
                          href={`/ets/sales/clients/${c.id}`}
                          className="block space-y-2"
                          onClick={(e) => {
                            if (dragging) e.preventDefault()
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                              {formatInitials(c.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium leading-snug truncate">
                                {c.name}
                              </div>
                              {c.city && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {c.city}
                                </div>
                              )}
                            </div>
                            <GripVertical className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                          </div>
                          {(c.total_paid != null ||
                            c.selected_package ||
                            c.package_tier) && (
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              {c.total_paid != null && (
                                <span className="text-sm font-semibold text-emerald-700">
                                  {formatCurrency(c.total_paid)}
                                </span>
                              )}
                              {(c.selected_package || c.package_tier) && (
                                <EtsStatusBadge
                                  value={
                                    c.selected_package ?? c.package_tier ?? null
                                  }
                                />
                              )}
                            </div>
                          )}
                          {(c.manager_name || c.assigned_to) && (
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <div className="size-5 rounded-full bg-muted text-foreground text-xs font-medium flex items-center justify-center">
                                {formatInitials(
                                  c.manager_name ?? c.assigned_to,
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground truncate">
                                {c.manager_name ?? c.assigned_to}
                              </span>
                            </div>
                          )}
                        </Link>
                      </div>
                    )
                  })}
                  {isDragOver && list.length === 0 && (
                    <div className="border-2 border-dashed border-primary/30 rounded-lg h-20 flex items-center justify-center">
                      <span className="text-xs text-primary/60">Drop here</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </EtsListShell>
  )
}
