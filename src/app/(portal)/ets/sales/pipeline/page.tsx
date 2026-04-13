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

const STAGES: { id: string; label: string; color: string }[] = [
  { id: "new-lead", label: "New lead", color: "bg-slate-500" },
  { id: "qualified", label: "Qualified", color: "bg-blue-500" },
  { id: "token-paid", label: "Token paid", color: "bg-amber-500" },
  { id: "onboarding", label: "Onboarding", color: "bg-indigo-500" },
  { id: "onboarded", label: "Onboarded", color: "bg-emerald-500" },
  { id: "launched", label: "Launched", color: "bg-emerald-600" },
  { id: "refund", label: "Refund", color: "bg-rose-500" },
  { id: "lost", label: "Lost", color: "bg-zinc-400" },
]

export default function EtsPipelinePage() {
  const [rows, setRows] = useState<PipelineClient[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)
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

  function onDragStart(e: DragEvent, id: string) {
    setDragging(id)
    e.dataTransfer.effectAllowed = "move"
  }
  function onDragOver(e: DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }
  function onDrop(e: DragEvent, stage: string) {
    e.preventDefault()
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-start">
          {STAGES.map((s) => {
            const list = grouped.get(s.id) ?? []
            return (
              <div
                key={s.id}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, s.id)}
                className="rounded-lg border border-border bg-card/60 min-h-[200px]"
              >
                <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
                  <span className={`inline-block size-2 rounded-full ${s.color}`} />
                  <h3 className="text-xs font-semibold flex-1 truncate">{s.label}</h3>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {list.length}
                  </span>
                </div>
                <div className="p-2 space-y-2">
                  {list.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      Drop clients here
                    </div>
                  ) : (
                    list.map((c) => (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, c.id)}
                        className={`group rounded-md border border-border bg-card p-2.5 shadow-sm cursor-grab active:cursor-grabbing hover:shadow transition-shadow ${pending.has(c.id) ? "opacity-60" : ""}`}
                      >
                        <Link
                          href={`/ets/sales/clients/${c.id}`}
                          className="block"
                          onClick={(e) => {
                            if (dragging) e.preventDefault()
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <div className="size-7 rounded-full bg-muted text-foreground flex items-center justify-center text-xs font-bold shrink-0">
                              {formatInitials(c.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold truncate">
                                {c.name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {c.city ?? "—"}
                              </div>
                            </div>
                            <GripVertical className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-1.5 flex-wrap">
                            {c.total_paid != null && (
                              <span className="text-xs font-mono text-emerald-700">
                                {formatCurrency(c.total_paid)}
                              </span>
                            )}
                            {(c.selected_package || c.package_tier) && (
                              <EtsStatusBadge
                                value={c.selected_package ?? c.package_tier ?? null}
                                size="xs"
                              />
                            )}
                          </div>
                          {(c.manager_name || c.assigned_to) && (
                            <div className="mt-1 text-xs text-muted-foreground truncate">
                              👤 {c.manager_name ?? c.assigned_to}
                            </div>
                          )}
                        </Link>
                      </div>
                    ))
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
