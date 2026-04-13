"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams } from "next/navigation"
import { Plus, Check, Clock, AlertTriangle, Circle, Trash2 } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import { EtsEmptyState } from "@/app/(portal)/ets/_components/ets-ui"
import { ListTodo } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChecklistItem {
  id: string
  client_id: string
  phase: string
  item: string
  sort_order: number
  status: "pending" | "in_progress" | "done" | "blocked"
  owner: string | null
  notes: string | null
  deliverable_file_id: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

const DEFAULT_PHASES: { phase: string; items: { item: string; owner?: string }[] }[] = [
  {
    phase: "Lead",
    items: [
      { item: "Lead profile created" },
      { item: "Discovery call done", owner: "Sales" },
      { item: "Background check" },
    ],
  },
  {
    phase: "Qualified",
    items: [
      { item: "LOI signed" },
      { item: "Token paid" },
      { item: "Site visit completed" },
    ],
  },
  {
    phase: "Onboarding",
    items: [
      { item: "Profile completed" },
      { item: "GST + PAN uploaded" },
      { item: "Bank docs verified" },
      { item: "Agreement signed" },
      { item: "Storefront finalised" },
    ],
  },
  {
    phase: "Brand",
    items: [
      { item: "Brand kit delivered", owner: "Bharti" },
      { item: "Signage approved", owner: "Bharti" },
      { item: "Bag artwork approved", owner: "Bharti" },
      { item: "Banner artwork approved", owner: "Bharti" },
    ],
  },
  {
    phase: "Layout",
    items: [
      { item: "Floor plan v1 shared", owner: "Bharti" },
      { item: "Zone plan approved", owner: "Bharti" },
      { item: "3D rendering approved", owner: "Bharti" },
    ],
  },
  {
    phase: "Setup",
    items: [
      { item: "BOQ finalised", owner: "Khushal" },
      { item: "Setup kit ordered", owner: "Khushal" },
      { item: "Fixtures delivered", owner: "Khushal" },
      { item: "Interior work done" },
      { item: "Opening inventory delivered", owner: "Khushal" },
    ],
  },
  {
    phase: "Launch",
    items: [
      { item: "Soft launch" },
      { item: "Marketing kit live" },
      { item: "Training delivered" },
      { item: "Launch report shared" },
    ],
  },
]

const STATUS_META: Record<
  ChecklistItem["status"],
  { label: string; icon: typeof Check; tone: string }
> = {
  pending: { label: "Pending", icon: Circle, tone: "text-muted-foreground" },
  in_progress: { label: "In progress", icon: Clock, tone: "text-amber-600" },
  done: { label: "Done", icon: Check, tone: "text-emerald-600" },
  blocked: { label: "Blocked", icon: AlertTriangle, tone: "text-rose-600" },
}

export default function ProjectChecklistPage() {
  const params = useParams<{ id: string }>()
  const clientId = params?.id as string
  const [rows, setRows] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabaseEts
      .from("project_checklist_items")
      .select("*")
      .eq("client_id", clientId)
      .order("sort_order", { ascending: true })
    setRows((data ?? []) as ChecklistItem[])
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    if (clientId) load()
  }, [clientId, load])

  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>()
    rows.forEach((r) => {
      const list = map.get(r.phase) ?? []
      list.push(r)
      map.set(r.phase, list)
    })
    return map
  }, [rows])

  const stats = useMemo(() => {
    const done = rows.filter((r) => r.status === "done").length
    const inProgress = rows.filter((r) => r.status === "in_progress").length
    const blocked = rows.filter((r) => r.status === "blocked").length
    const pct = rows.length > 0 ? Math.round((done / rows.length) * 100) : 0
    return { done, inProgress, blocked, total: rows.length, pct }
  }, [rows])

  async function seedDefaults() {
    setSeeding(true)
    let order = 0
    const inserts: Omit<ChecklistItem, "id" | "created_at" | "updated_at">[] = []
    for (const ph of DEFAULT_PHASES) {
      for (const it of ph.items) {
        inserts.push({
          client_id: clientId,
          phase: ph.phase,
          item: it.item,
          sort_order: order++,
          status: "pending",
          owner: it.owner ?? null,
          notes: null,
          deliverable_file_id: null,
          completed_at: null,
        })
      }
    }
    await supabaseEts.from("project_checklist_items").insert(inserts)
    setSeeding(false)
    load()
  }

  async function updateStatus(id: string, status: ChecklistItem["status"]) {
    setRows((rs) =>
      rs.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              completed_at: status === "done" ? new Date().toISOString() : null,
            }
          : r,
      ),
    )
    await supabaseEts
      .from("project_checklist_items")
      .update({
        status,
        completed_at: status === "done" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
  }

  async function updateOwner(id: string, owner: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, owner: owner || null } : r)))
    await supabaseEts
      .from("project_checklist_items")
      .update({ owner: owner || null, updated_at: new Date().toISOString() })
      .eq("id", id)
  }

  async function removeItem(id: string) {
    if (!confirm("Remove this item?")) return
    setRows((rs) => rs.filter((r) => r.id !== id))
    await supabaseEts.from("project_checklist_items").delete().eq("id", id)
  }

  async function addCustom(phase: string) {
    const text = prompt("New item:")?.trim()
    if (!text) return
    const maxOrder = Math.max(0, ...rows.map((r) => r.sort_order))
    const { data } = await supabaseEts
      .from("project_checklist_items")
      .insert({
        client_id: clientId,
        phase,
        item: text,
        sort_order: maxOrder + 1,
        status: "pending",
      })
      .select()
      .single()
    if (data) setRows((rs) => [...rs, data as ChecklistItem])
  }

  if (loading) {
    return <div className="h-64 rounded-lg bg-muted animate-pulse" />
  }

  if (rows.length === 0) {
    return (
      <EtsEmptyState
        icon={ListTodo}
        title="No checklist yet"
        description="Seed the default 7-phase launch SOP (24 items) or add custom items per phase."
        cta={
          <button
            onClick={seedDefaults}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            <Plus className="size-4" />
            {seeding ? "Seeding…" : "Seed default SOP"}
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-card shadow-sm p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold">Launch readiness</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.done} of {stats.total} complete · {stats.inProgress} in progress
              {stats.blocked > 0 && ` · ${stats.blocked} blocked`}
            </p>
          </div>
          <div className="flex items-center gap-3 min-w-[240px]">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${stats.pct}%` }}
              />
            </div>
            <span className="text-sm font-mono font-semibold">{stats.pct}%</span>
          </div>
        </div>
      </div>

      {Array.from(grouped.entries()).map(([phase, items]) => {
        const phaseDone = items.filter((i) => i.status === "done").length
        return (
          <div key={phase} className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{phase}</h3>
                <span className="text-xs font-mono text-muted-foreground">
                  {phaseDone}/{items.length}
                </span>
              </div>
              <button
                onClick={() => addCustom(phase)}
                className="inline-flex items-center gap-1 h-7 px-2 rounded text-xs font-medium border hover:bg-muted"
              >
                <Plus className="size-3" /> Add item
              </button>
            </div>
            <ul className="divide-y">
              {items.map((it) => {
                const meta = STATUS_META[it.status]
                const Icon = meta.icon
                return (
                  <li key={it.id} className="px-4 py-3 flex items-center gap-3">
                    <Icon className={cn("size-4 shrink-0", meta.tone)} />
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        it.status === "done" && "line-through text-muted-foreground",
                      )}
                    >
                      {it.item}
                    </span>
                    <input
                      type="text"
                      value={it.owner ?? ""}
                      onChange={(e) => updateOwner(it.id, e.target.value)}
                      placeholder="Owner"
                      className="h-7 w-28 rounded border bg-background px-2 text-xs"
                    />
                    <select
                      value={it.status}
                      onChange={(e) =>
                        updateStatus(it.id, e.target.value as ChecklistItem["status"])
                      }
                      className="h-7 px-2 rounded border bg-background text-xs"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In progress</option>
                      <option value="done">Done</option>
                      <option value="blocked">Blocked</option>
                    </select>
                    <button
                      onClick={() => removeItem(it.id)}
                      className="size-7 rounded hover:bg-muted text-muted-foreground flex items-center justify-center"
                      aria-label="Remove"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
