"use client"

import { useEffect, useMemo, useState } from "react"
import { Flag, Plus, Check } from "lucide-react"
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
  formatCurrency,
  formatDate,
} from "@/app/(portal)/ets/_components/ets-ui"

interface MilestoneRow {
  id: string
  client_id: string | null
  store_id: string | null
  milestone_name: string | null
  amount: number | null
  due_date: string | null
  paid_date: string | null
  status: string | null
  client_name: string | null
  store_name: string | null
}

interface ClientOpt {
  id: string
  name: string
}
interface StoreOpt {
  id: string
  name: string
  client_id: string | null
}

export default function EtsSalesMilestonesPage() {
  const [rows, setRows] = useState<MilestoneRow[]>([])
  const [clients, setClients] = useState<ClientOpt[]>([])
  const [stores, setStores] = useState<StoreOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<MilestoneRow | null>(null)
  const [clientFilter, setClientFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  async function load() {
    setLoading(true)
    const { data, error } = await supabaseEts
      .from("milestone_payments")
      .select(
        "id, client_id, store_id, milestone_name, amount, due_date, paid_date, status, clients(name), stores(name)",
      )
      .order("due_date", { ascending: true })
    if (error && (error as { code?: string }).code === "42P01") {
      setTableMissing(true)
      setRows([])
    } else {
      setRows(
        ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
          id: String(r.id),
          client_id: (r.client_id as string) ?? null,
          store_id: (r.store_id as string) ?? null,
          milestone_name: (r.milestone_name as string) ?? null,
          amount: (r.amount as number) ?? null,
          due_date: (r.due_date as string) ?? null,
          paid_date: (r.paid_date as string) ?? null,
          status: (r.status as string) ?? null,
          client_name: ((r.clients as { name?: string } | null)?.name) ?? null,
          store_name: ((r.stores as { name?: string } | null)?.name) ?? null,
        })),
      )
    }
    const cl = await supabaseEts.from("clients").select("id, name").order("name")
    setClients((cl.data ?? []) as ClientOpt[])
    const st = await supabaseEts
      .from("stores")
      .select("id, name, client_id")
      .order("name")
    setStores((st.data ?? []) as StoreOpt[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (clientFilter !== "all" && r.client_id !== clientFilter) return false
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (from && r.due_date && r.due_date < from) return false
      if (to && r.due_date && r.due_date > to) return false
      return true
    })
  }, [rows, clientFilter, statusFilter, from, to])

  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const monthStart = today.slice(0, 7) + "-01"
    let pendingCount = 0
    let pendingTotal = 0
    let overdueCount = 0
    let paidThisMonth = 0
    rows.forEach((r) => {
      if (r.status === "pending") {
        pendingCount++
        pendingTotal += Number(r.amount ?? 0)
      }
      if (r.status === "overdue") overdueCount++
      if (
        r.status === "paid" &&
        r.paid_date &&
        r.paid_date >= monthStart
      ) {
        paidThisMonth += Number(r.amount ?? 0)
      }
    })
    return { pendingCount, pendingTotal, overdueCount, paidThisMonth }
  }, [rows])

  async function markPaid(id: string) {
    const today = new Date().toISOString().slice(0, 10)
    await supabaseEts
      .from("milestone_payments")
      .update({ status: "paid", paid_date: today })
      .eq("id", id)
    load()
  }

  return (
    <EtsListShell
      title="Milestones"
      subtitle={
        loading
          ? "Loading…"
          : `${filtered.length} of ${rows.length} milestone${rows.length === 1 ? "" : "s"}`
      }
      action={
        !tableMissing && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
          >
            <Plus className="size-4" /> New milestone
          </button>
        )
      }
      filters={
        !tableMissing && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-border/80 bg-card p-4">
              <Kpi label="Pending count" value={kpis.pendingCount} />
              <Kpi
                label="Pending total"
                value={formatCurrency(kpis.pendingTotal)}
              />
              <Kpi label="Overdue count" value={kpis.overdueCount} />
              <Kpi
                label="Paid this month"
                value={formatCurrency(kpis.paidThisMonth)}
              />
            </div>
            <div className="flex gap-3 flex-wrap">
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="h-10 px-3 rounded-md border border-border/80 bg-card text-sm"
              >
                <option value="all">All clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 rounded-md border border-border/80 bg-card text-sm"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-10 px-3 rounded-md border border-border/80 bg-card text-sm"
              />
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-10 px-3 rounded-md border border-border/80 bg-card text-sm"
              />
            </div>
          </>
        )
      }
    >
      {tableMissing ? (
        <EtsEmptyState
          icon={Flag}
          title="milestone_payments table missing"
          description="The ets.milestone_payments table is not configured."
        />
      ) : !loading && filtered.length === 0 ? (
        <EtsEmptyState
          icon={Flag}
          title="No milestones match"
          description="Adjust filters or create a new milestone."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Client</EtsTH>
            <EtsTH>Store</EtsTH>
            <EtsTH>Milestone</EtsTH>
            <EtsTH>Due</EtsTH>
            <EtsTH>Paid</EtsTH>
            <EtsTH className="text-right">Amount</EtsTH>
            <EtsTH>Status</EtsTH>
            <EtsTH></EtsTH>
          </EtsTHead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map((m) => (
                  <EtsTR key={m.id} onClick={() => setEditing(m)}>
                    <EtsTD>
                      <div className="font-semibold text-sm">
                        {m.client_name ?? "—"}
                      </div>
                    </EtsTD>
                    <EtsTD className="text-xs text-muted-foreground">
                      {m.store_name ?? "—"}
                    </EtsTD>
                    <EtsTD className="text-xs">{m.milestone_name ?? "—"}</EtsTD>
                    <EtsTD className="text-xs">{formatDate(m.due_date)}</EtsTD>
                    <EtsTD className="text-xs">{formatDate(m.paid_date)}</EtsTD>
                    <EtsTD className="text-right font-mono text-xs">
                      {formatCurrency(m.amount)}
                    </EtsTD>
                    <EtsTD>
                      <EtsStatusBadge value={m.status} />
                    </EtsTD>
                    <EtsTD>
                      {m.status !== "paid" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markPaid(m.id)
                          }}
                          className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        >
                          <Check className="size-3" /> Mark paid
                        </button>
                      )}
                    </EtsTD>
                  </EtsTR>
                ))}
          </tbody>
        </EtsTable>
      )}

      <MilestoneDrawer
        open={creating || !!editing}
        editing={editing}
        clients={clients}
        stores={stores}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        onSaved={() => {
          setCreating(false)
          setEditing(null)
          load()
        }}
      />
    </EtsListShell>
  )
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  )
}

function MilestoneDrawer({
  open,
  editing,
  clients,
  stores,
  onClose,
  onSaved,
}: {
  open: boolean
  editing: MilestoneRow | null
  clients: ClientOpt[]
  stores: StoreOpt[]
  onClose: () => void
  onSaved: () => void
}) {
  const [clientId, setClientId] = useState("")
  const [storeId, setStoreId] = useState("")
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [status, setStatus] = useState("pending")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (editing) {
      setClientId(editing.client_id ?? "")
      setStoreId(editing.store_id ?? "")
      setName(editing.milestone_name ?? "")
      setAmount(editing.amount?.toString() ?? "")
      setDueDate(editing.due_date ?? "")
      setStatus(editing.status ?? "pending")
    } else {
      setClientId("")
      setStoreId("")
      setName("")
      setAmount("")
      setDueDate("")
      setStatus("pending")
    }
    setErr(null)
  }, [editing, open])

  const filteredStores = useMemo(
    () => stores.filter((s) => !clientId || s.client_id === clientId),
    [stores, clientId],
  )

  async function submit() {
    if (!clientId) {
      setErr("Client is required.")
      return
    }
    if (!name.trim()) {
      setErr("Milestone name is required.")
      return
    }
    setBusy(true)
    setErr(null)
    const payload = {
      client_id: clientId,
      store_id: storeId || null,
      milestone_name: name.trim(),
      amount: amount ? Number(amount) : null,
      due_date: dueDate || null,
      status,
    }
    const res = editing
      ? await supabaseEts
          .from("milestone_payments")
          .update(payload)
          .eq("id", editing.id)
      : await supabaseEts.from("milestone_payments").insert(payload)
    setBusy(false)
    if (res.error) {
      setErr(res.error.message)
      return
    }
    onSaved()
  }

  return (
    <EtsEditDrawer
      open={open}
      onClose={onClose}
      title={editing ? "Edit milestone" : "New milestone"}
      footer={
        <>
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-md border border-border/80 bg-card text-sm font-medium hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Client" required>
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value)
              setStoreId("")
            }}
            className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
          >
            <option value="">Select…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Store (optional)">
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
          >
            <option value="">—</option>
            {filteredStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Milestone name" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            placeholder="Token, agreement, fit-out…"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹)">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Due date">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
        </div>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
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
