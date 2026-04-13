"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Rocket, Search, Trash2 } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import {
  EtsListShell,
  EtsTable,
  EtsTHead,
  EtsTH,
  EtsTR,
  EtsTD,
  EtsStatusBadge,
  EtsEmptyState,
  EtsEditDrawer,
  formatDate,
} from "@/app/(portal)/ets/_components/ets-ui"

interface LaunchRow {
  id: string
  name: string | null
  target_launch_date: string | null
  status: string | null
  notes: string | null
  created_at: string | null
}

const STATUSES = ["planning", "in-progress", "launched", "cancelled"]

export default function EtsSupplyLaunchesPage() {
  const [rows, setRows] = useState<LaunchRow[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [drawer, setDrawer] = useState<{ open: boolean; row: LaunchRow | null }>(
    { open: false, row: null },
  )

  async function load() {
    setLoading(true)
    const { data } = await supabaseEts
      .from("launch_batches")
      .select("id, name, target_launch_date, status, notes, created_at")
      .order("created_at", { ascending: false })
    setRows((data ?? []) as LaunchRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search.trim()) {
        const t = search.trim().toLowerCase()
        const hay = [r.name, r.notes].filter(Boolean).join(" ").toLowerCase()
        if (!hay.includes(t)) return false
      }
      return true
    })
  }, [rows, search, statusFilter])

  async function del(id: string) {
    if (!confirm("Delete?")) return
    await supabaseEts.from("launch_batches").delete().eq("id", id)
    load()
  }

  return (
    <EtsListShell
      title="Launches"
      subtitle={
        loading
          ? "Loading…"
          : `${filtered.length} of ${rows.length} batch${rows.length === 1 ? "" : "es"}`
      }
      action={
        <button
          onClick={() => setDrawer({ open: true, row: null })}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          <Plus className="size-4" /> New launch
        </button>
      }
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-md border border-border/80 bg-card text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-border/80 bg-card text-sm"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      }
    >
      {!loading && filtered.length === 0 ? (
        <EtsEmptyState
          icon={Rocket}
          title="No launches match"
          description="Adjust filters or create a new launch batch."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Name</EtsTH>
            <EtsTH>Target date</EtsTH>
            <EtsTH>Status</EtsTH>
            <EtsTH>Notes</EtsTH>
            <EtsTH>Created</EtsTH>
            <EtsTH className="text-right">Actions</EtsTH>
          </EtsTHead>
          <tbody>
            {filtered.map((r) => (
              <EtsTR key={r.id} onClick={() => setDrawer({ open: true, row: r })}>
                <EtsTD>
                  <div className="font-semibold text-sm">{r.name ?? "—"}</div>
                </EtsTD>
                <EtsTD className="text-xs">{formatDate(r.target_launch_date)}</EtsTD>
                <EtsTD>
                  <EtsStatusBadge value={r.status} />
                </EtsTD>
                <EtsTD className="text-xs text-muted-foreground max-w-md truncate">
                  {r.notes ?? "—"}
                </EtsTD>
                <EtsTD className="text-xs">{formatDate(r.created_at)}</EtsTD>
                <EtsTD className="text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      del(r.id)
                    }}
                    className="inline-flex size-8 items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </EtsTD>
              </EtsTR>
            ))}
          </tbody>
        </EtsTable>
      )}

      <LaunchDrawer
        open={drawer.open}
        row={drawer.row}
        onClose={() => setDrawer({ open: false, row: null })}
        onSaved={() => {
          setDrawer({ open: false, row: null })
          load()
        }}
      />
    </EtsListShell>
  )
}

function LaunchDrawer({
  open,
  row,
  onClose,
  onSaved,
}: {
  open: boolean
  row: LaunchRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const [target, setTarget] = useState("")
  const [status, setStatus] = useState("planning")
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(row?.name ?? "")
    setTarget(row?.target_launch_date ?? "")
    setStatus(row?.status ?? "planning")
    setNotes(row?.notes ?? "")
    setErr(null)
  }, [open, row])

  async function save() {
    if (!name.trim()) {
      setErr("Name is required.")
      return
    }
    setBusy(true)
    setErr(null)
    const payload = {
      name: name.trim(),
      target_launch_date: target || null,
      status,
      notes: notes.trim() || null,
    }
    const q = row
      ? supabaseEts.from("launch_batches").update(payload).eq("id", row.id)
      : supabaseEts.from("launch_batches").insert(payload)
    const { error } = await q
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    onSaved()
  }

  return (
    <EtsEditDrawer
      open={open}
      onClose={onClose}
      title={row ? "Edit launch" : "New launch"}
      subtitle="Group stores into a batched go-live."
      footer={
        <>
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-md border border-border/80 bg-card text-sm font-medium hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            placeholder="E.g. Diwali wave"
          />
        </Field>
        <Field label="Target launch date">
          <input
            type="date"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
          />
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full min-h-[88px] rounded-md border border-border/80 bg-background px-3 py-2 text-sm"
          />
        </Field>
        {err && (
          <div className="rounded-md bg-rose-50 text-rose-700 px-3 py-2 text-xs">
            {err}
          </div>
        )}
      </div>
    </EtsEditDrawer>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
        {required && <span className="text-rose-600 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
