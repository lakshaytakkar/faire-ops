"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  Phone,
  Mail,
  MapPin,
  Building2,
  CalendarDays,
  FileText,
  Receipt,
  Package,
  LifeBuoy,
  Sparkles,
  Pencil,
  Check,
  X,
  AlertTriangle,
} from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import {
  EtsDetailShell,
  EtsKpi,
  EtsTabsPanel,
  EtsStatusBadge,
  EtsEmptyState,
  EtsTable,
  EtsTHead,
  EtsTH,
  EtsTR,
  EtsTD,
  formatCurrency,
  formatDate,
  formatInitials,
} from "@/app/(portal)/ets/_components/ets-ui"

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  city: string | null
  state: string | null
  country: string | null
  stage: string | null
  package_tier: string | null
  selected_package: string | null
  store_name: string | null
  store_address: string | null
  store_area: string | null
  store_size: string | null
  store_frontage: string | null
  store_type: string | null
  total_paid: number | null
  pending_dues: number | null
  total_investment: number | null
  qualification_score: number | null
  total_score: number | null
  manager_name: string | null
  manager_phone: string | null
  assigned_to: string | null
  launch_phase: string | null
  estimated_launch_date: string | null
  actual_launch_date: string | null
  notes: string | null
  last_note: string | null
  next_action: string | null
  next_action_date: string | null
  avatar_url: string | null
  payment_medium: string | null
  payment_status: string | null
  date_of_payment: string | null
  store_finalised: boolean | null
  has_3d_model: boolean | null
  has_2d_floor_layout: boolean | null
  shared_with_alex: boolean | null
  meeting_date: string | null
  documents_url: string | null
  client_health: string | null
  client_id_external: string | null
  is_lost: boolean | null
  lost_reason: string | null
  created_at: string | null
  stage_changed_at: string | null
  days_in_stage: number | null
  gst_number: string | null
  pan_number: string | null
  bank_name: string | null
}

const STAGE_OPTIONS = [
  "new-lead",
  "qualified",
  "token-paid",
  "onboarding",
  "onboarded",
  "launched",
  "lost",
  "refund",
]

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabaseEts
      .from("clients")
      .select("*")
      .eq("id", id)
      .maybeSingle()
    if (error) setErr(error.message)
    setClient(data as Client | null)
    setLoading(false)
  }, [id])

  useEffect(() => {
    if (id) load()
  }, [id, load])

  async function patch(updates: Partial<Client>) {
    setBusy(true)
    const { error } = await supabaseEts
      .from("clients")
      .update(updates)
      .eq("id", id)
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setClient((c) => (c ? { ...c, ...updates } : c))
  }

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-5 w-20 rounded bg-muted animate-pulse" />
        <div className="h-24 rounded-lg bg-muted animate-pulse" />
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <Link
          href="/ets/sales/clients"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to clients
        </Link>
        <EtsEmptyState
          icon={AlertTriangle}
          title="Client not found"
          description={err ?? "The client you requested doesn't exist or was deleted."}
        />
      </div>
    )
  }

  return (
    <EtsDetailShell
      backHref="/ets/sales/clients"
      backLabel="All clients"
      avatar={
        <div
          className="size-14 rounded-full bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold text-base shrink-0 ring-1 ring-emerald-200 overflow-hidden"
          aria-hidden
        >
          {client.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={client.avatar_url}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            formatInitials(client.name)
          )}
        </div>
      }
      title={client.name}
      subtitle={[client.city, client.state, client.country]
        .filter(Boolean)
        .join(", ")}
      badges={
        <div className="flex items-center gap-1.5 flex-wrap">
          <EtsStatusBadge value={client.stage} />
          {client.payment_status && (
            <EtsStatusBadge value={client.payment_status} />
          )}
          {client.is_lost && <EtsStatusBadge value="lost" />}
          {client.client_health && (
            <span className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
              {client.client_health}
            </span>
          )}
        </div>
      }
      actions={
        <StageSelector
          stage={client.stage}
          onChange={(next) => patch({ stage: next, stage_changed_at: new Date().toISOString() })}
          busy={busy}
        />
      }
      kpis={
        <>
          <EtsKpi label="Total paid" value={formatCurrency(client.total_paid)} />
          <EtsKpi label="Pending dues" value={formatCurrency(client.pending_dues)} />
          <EtsKpi label="Investment" value={formatCurrency(client.total_investment)} />
          <EtsKpi label="Score" value={client.total_score ?? client.qualification_score ?? "—"} />
          <EtsKpi
            label="Store finalised"
            value={client.store_finalised ? "Yes" : client.store_finalised === false ? "Searching" : "—"}
          />
          <EtsKpi
            label="Days in stage"
            value={client.days_in_stage ?? "—"}
            hint={
              client.stage_changed_at
                ? `since ${formatDate(client.stage_changed_at)}`
                : undefined
            }
          />
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <EtsTabsPanel
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "activities", label: "Activities" },
            { id: "payments", label: "Payments" },
            { id: "orders", label: "Orders" },
            { id: "documents", label: "Documents" },
            { id: "store", label: "Store" },
            { id: "tickets", label: "Tickets" },
          ]}
          render={(active) => {
            if (active === "overview") return <OverviewTab client={client} />
            if (active === "activities")
              return <ActivitiesTab clientId={client.id} onRefresh={load} />
            if (active === "payments")
              return <PaymentsTab clientId={client.id} />
            if (active === "orders") return <OrdersTab clientId={client.id} />
            if (active === "documents")
              return <DocumentsTab clientId={client.id} />
            if (active === "store") return <StoreTab clientId={client.id} />
            if (active === "tickets") return <TicketsTab clientId={client.id} />
            return null
          }}
        />
        <RightRail client={client} patch={patch} busy={busy} />
      </div>
    </EtsDetailShell>
  )
}

// ─── Header actions ─────────────────────────────────────────────────────────

function StageSelector({
  stage,
  onChange,
  busy,
}: {
  stage: string | null
  onChange: (s: string) => void
  busy: boolean
}) {
  return (
    <select
      value={stage ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={busy}
      className="h-9 px-3 rounded-md border border-border/80 bg-card text-sm font-medium"
    >
      {STAGE_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  )
}

// ─── Right rail ─────────────────────────────────────────────────────────────

function RightRail({
  client,
  patch,
  busy,
}: {
  client: Client
  patch: (u: Partial<Client>) => Promise<void>
  busy: boolean
}) {
  return (
    <div className="space-y-5">
      <Panel title="Assigned">
        <EditableField
          label="Manager name"
          value={client.manager_name}
          onSave={(v) => patch({ manager_name: v })}
          busy={busy}
        />
        <EditableField
          label="Manager phone"
          value={client.manager_phone}
          onSave={(v) => patch({ manager_phone: v })}
          busy={busy}
        />
        <EditableField
          label="Sales person"
          value={client.assigned_to}
          onSave={(v) => patch({ assigned_to: v })}
          busy={busy}
        />
      </Panel>

      <Panel title="Next action">
        <EditableField
          label="Action"
          value={client.next_action}
          onSave={(v) => patch({ next_action: v })}
          busy={busy}
        />
        <EditableField
          label="Due date"
          type="date"
          value={client.next_action_date}
          onSave={(v) => patch({ next_action_date: v })}
          busy={busy}
        />
      </Panel>

      <Panel title="Launch">
        <EditableField
          label="Phase"
          value={client.launch_phase}
          onSave={(v) => patch({ launch_phase: v })}
          busy={busy}
        />
        <EditableField
          label="Estimated launch"
          type="date"
          value={client.estimated_launch_date}
          onSave={(v) => patch({ estimated_launch_date: v })}
          busy={busy}
        />
        <EditableField
          label="Actual launch"
          type="date"
          value={client.actual_launch_date}
          onSave={(v) => patch({ actual_launch_date: v })}
          busy={busy}
        />
      </Panel>

      <Panel title="Notes">
        <NotesField
          value={client.notes}
          onSave={(v) => patch({ notes: v, last_note: new Date().toISOString() })}
          busy={busy}
        />
      </Panel>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm">
      <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  )
}

function EditableField({
  label,
  value,
  onSave,
  type = "text",
  busy,
}: {
  label: string
  value: string | number | null | undefined
  onSave: (v: string) => void
  type?: string
  busy?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value?.toString() ?? "")
  useEffect(() => setDraft(value?.toString() ?? ""), [value])
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </div>
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="flex-1 h-8 px-2 rounded-md border border-border/80 bg-background text-sm"
            autoFocus
          />
          <button
            onClick={() => {
              onSave(draft.trim())
              setEditing(false)
            }}
            className="size-7 rounded hover:bg-emerald-50 text-emerald-700 flex items-center justify-center"
            disabled={busy}
          >
            <Check className="size-3.5" />
          </button>
          <button
            onClick={() => {
              setDraft(value?.toString() ?? "")
              setEditing(false)
            }}
            className="size-7 rounded hover:bg-rose-50 text-rose-700 flex items-center justify-center"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="w-full flex items-center justify-between gap-2 text-sm font-medium hover:text-emerald-700 text-left"
        >
          <span className="truncate">
            {value != null && value !== ""
              ? type === "date"
                ? formatDate(value as string)
                : String(value)
              : <span className="text-muted-foreground italic">— set —</span>}
          </span>
          <Pencil className="size-3 text-muted-foreground shrink-0" />
        </button>
      )}
    </div>
  )
}

function NotesField({
  value,
  onSave,
  busy,
}: {
  value: string | null | undefined
  onSave: (v: string) => void
  busy?: boolean
}) {
  const [draft, setDraft] = useState(value ?? "")
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    setDraft(value ?? "")
    setDirty(false)
  }, [value])
  return (
    <div>
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          setDirty(true)
        }}
        rows={4}
        placeholder="Add a note…"
        className="w-full rounded-md border border-border/80 bg-background px-3 py-2 text-sm"
      />
      {dirty && (
        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            onClick={() => {
              setDraft(value ?? "")
              setDirty(false)
            }}
            className="h-7 px-2.5 text-xs rounded-md border border-border/80 bg-card hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(draft)
              setDirty(false)
            }}
            disabled={busy}
            className="h-7 px-2.5 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Save
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

function OverviewTab({ client }: { client: Client }) {
  return (
    <div className="space-y-5">
      <Section title="Contact" icon={Phone}>
        <Field label="Email">
          {client.email ? (
            <a href={`mailto:${client.email}`} className="hover:underline">
              {client.email}
            </a>
          ) : (
            "—"
          )}
        </Field>
        <Field label="Phone">
          {client.phone ? (
            <a href={`tel:${client.phone}`} className="hover:underline">
              {client.phone}
            </a>
          ) : (
            "—"
          )}
        </Field>
        <Field label="Location">
          {[client.city, client.state, client.country].filter(Boolean).join(", ") || "—"}
        </Field>
        <Field label="Meeting date">{formatDate(client.meeting_date)}</Field>
      </Section>

      <Section title="Store" icon={Building2}>
        <Field label="Store name">{client.store_name ?? "—"}</Field>
        <Field label="Address">{client.store_address ?? "—"}</Field>
        <Field label="Area">{client.store_area ? `${client.store_area} sqft` : "—"}</Field>
        <Field label="Type">{client.store_type ?? "—"}</Field>
        <Field label="Package">{client.selected_package ?? client.package_tier ?? "—"}</Field>
        <Field label="Frontage">{client.store_frontage ?? "—"}</Field>
      </Section>

      <Section title="Payment" icon={Receipt}>
        <Field label="Medium">{client.payment_medium ?? "—"}</Field>
        <Field label="Status">
          <EtsStatusBadge value={client.payment_status} />
        </Field>
        <Field label="Date of payment">{formatDate(client.date_of_payment)}</Field>
        <Field label="Total paid">{formatCurrency(client.total_paid)}</Field>
        <Field label="Pending dues">{formatCurrency(client.pending_dues)}</Field>
        <Field label="Investment">{formatCurrency(client.total_investment)}</Field>
      </Section>

      <Section title="Progress" icon={Sparkles}>
        <Field label="3D model">
          {client.has_3d_model ? "✓ Yes" : client.has_3d_model === false ? "✗ No" : "—"}
        </Field>
        <Field label="2D floor layout">
          {client.has_2d_floor_layout
            ? "✓ Yes"
            : client.has_2d_floor_layout === false
            ? "✗ No"
            : "—"}
        </Field>
        <Field label="Shared with Alex">
          {client.shared_with_alex ? "✓ Yes" : "—"}
        </Field>
        <Field label="Health">{client.client_health ?? "—"}</Field>
      </Section>

      <Section title="Compliance" icon={FileText}>
        <Field label="GST">{client.gst_number ?? "—"}</Field>
        <Field label="PAN">{client.pan_number ?? "—"}</Field>
        <Field label="Bank">{client.bank_name ?? "—"}</Field>
      </Section>

      {client.is_lost && client.lost_reason && (
        <div className="rounded-md bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800">
          <div className="font-semibold mb-1">Marked lost</div>
          <div>{client.lost_reason}</div>
        </div>
      )}
    </div>
  )
}

function ActivitiesTab({
  clientId,
  onRefresh,
}: {
  clientId: string
  onRefresh: () => void
}) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState("call")
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabaseEts
      .from("lead_activities")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
    setRows(data ?? [])
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    load()
  }, [load])

  async function add() {
    if (!notes.trim()) return
    setBusy(true)
    await supabaseEts.from("lead_activities").insert({
      client_id: clientId,
      activity_type: type,
      notes: notes.trim(),
    })
    setBusy(false)
    setNotes("")
    load()
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/80 bg-muted/20 p-3 space-y-2">
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-9 px-2 rounded-md border border-border/80 bg-background text-sm"
          >
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="note">Note</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Log an activity…"
            className="flex-1 h-9 px-3 rounded-md border border-border/80 bg-background text-sm"
          />
          <button
            onClick={add}
            disabled={busy || !notes.trim()}
            className="h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            Log
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-32 rounded-md bg-muted animate-pulse" />
      ) : rows.length === 0 ? (
        <EtsEmptyState
          icon={CalendarDays}
          title="No activities yet"
          description="Log calls, emails, meetings, and notes — the full contact history for this client."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-md border border-border/80 bg-card p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EtsStatusBadge value={r.activity_type} size="xs" />
                  {r.next_action && (
                    <span className="text-xs text-muted-foreground">
                      → {r.next_action}
                      {r.next_action_date && ` by ${formatDate(r.next_action_date)}`}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(r.created_at)}
                </span>
              </div>
              <p className="mt-1 text-sm">{r.notes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PaymentsTab({ clientId }: { clientId: string }) {
  const [milestones, setMilestones] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabaseEts
        .from("milestone_payments")
        .select("*")
        .eq("client_id", clientId)
        .order("due_date"),
      supabaseEts
        .from("payments")
        .select("*")
        .eq("client_id", clientId)
        .order("date", { ascending: false }),
    ]).then(([m, p]) => {
      setMilestones(m.data ?? [])
      setPayments(p.data ?? [])
      setLoading(false)
    })
  }, [clientId])

  if (loading) return <div className="h-32 rounded-md bg-muted animate-pulse" />

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-2">Milestones</h3>
        {milestones.length === 0 ? (
          <EtsEmptyState
            icon={Receipt}
            title="No milestone payments"
            description="Milestone schedule defines when the partner pays for each launch phase."
          />
        ) : (
          <EtsTable>
            <EtsTHead>
              <EtsTH>Milestone</EtsTH>
              <EtsTH>Due</EtsTH>
              <EtsTH>Paid</EtsTH>
              <EtsTH className="text-right">Amount</EtsTH>
              <EtsTH>Status</EtsTH>
            </EtsTHead>
            <tbody>
              {milestones.map((m) => (
                <EtsTR key={m.id}>
                  <EtsTD className="font-medium">{m.milestone_name}</EtsTD>
                  <EtsTD className="text-xs">{formatDate(m.due_date)}</EtsTD>
                  <EtsTD className="text-xs">{formatDate(m.paid_date)}</EtsTD>
                  <EtsTD className="text-right font-mono text-xs">
                    {formatCurrency(m.amount)}
                  </EtsTD>
                  <EtsTD>
                    <EtsStatusBadge value={m.status} />
                  </EtsTD>
                </EtsTR>
              ))}
            </tbody>
          </EtsTable>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Payment history</h3>
        {payments.length === 0 ? (
          <EtsEmptyState icon={Receipt} title="No payments yet" />
        ) : (
          <EtsTable>
            <EtsTHead>
              <EtsTH>Date</EtsTH>
              <EtsTH>Type</EtsTH>
              <EtsTH>Method</EtsTH>
              <EtsTH>Reference</EtsTH>
              <EtsTH className="text-right">Amount</EtsTH>
              <EtsTH>Status</EtsTH>
            </EtsTHead>
            <tbody>
              {payments.map((p) => (
                <EtsTR key={p.id}>
                  <EtsTD className="text-xs">{formatDate(p.date)}</EtsTD>
                  <EtsTD className="text-xs">{p.type ?? "—"}</EtsTD>
                  <EtsTD className="text-xs">{p.payment_method ?? "—"}</EtsTD>
                  <EtsTD className="text-xs font-mono">{p.payment_ref ?? "—"}</EtsTD>
                  <EtsTD className="text-right font-mono text-xs">
                    {formatCurrency(p.amount)}
                  </EtsTD>
                  <EtsTD>
                    <EtsStatusBadge value={p.status} />
                  </EtsTD>
                </EtsTR>
              ))}
            </tbody>
          </EtsTable>
        )}
      </div>
    </div>
  )
}

function OrdersTab({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabaseEts
      .from("orders")
      .select(
        "id, order_number, order_type, source, status, payment_status, fulfillment_status, total_units, total_amount, created_at, expected_delivery",
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows(data ?? [])
        setLoading(false)
      })
  }, [clientId])

  if (loading) return <div className="h-24 rounded-md bg-muted animate-pulse" />
  if (rows.length === 0)
    return (
      <EtsEmptyState
        icon={Package}
        title="No orders yet"
        description="This client hasn't placed any orders — they'll appear here once cart checkout happens."
      />
    )
  return (
    <EtsTable>
      <EtsTHead>
        <EtsTH>Order</EtsTH>
        <EtsTH>Created</EtsTH>
        <EtsTH>Type</EtsTH>
        <EtsTH>Status</EtsTH>
        <EtsTH>Payment</EtsTH>
        <EtsTH>Fulfillment</EtsTH>
        <EtsTH className="text-right">Units</EtsTH>
        <EtsTH className="text-right">Total</EtsTH>
        <EtsTH>Expected</EtsTH>
      </EtsTHead>
      <tbody>
        {rows.map((o) => (
          <EtsTR key={o.id}>
            <EtsTD className="font-mono text-xs">{o.order_number ?? o.id.slice(0, 8)}</EtsTD>
            <EtsTD className="text-xs">{formatDate(o.created_at)}</EtsTD>
            <EtsTD className="text-xs">{o.order_type ?? "—"}</EtsTD>
            <EtsTD><EtsStatusBadge value={o.status} /></EtsTD>
            <EtsTD><EtsStatusBadge value={o.payment_status} /></EtsTD>
            <EtsTD><EtsStatusBadge value={o.fulfillment_status} /></EtsTD>
            <EtsTD className="text-right text-xs">{o.total_units ?? "—"}</EtsTD>
            <EtsTD className="text-right font-mono text-xs">{formatCurrency(o.total_amount)}</EtsTD>
            <EtsTD className="text-xs">{formatDate(o.expected_delivery)}</EtsTD>
          </EtsTR>
        ))}
      </tbody>
    </EtsTable>
  )
}

function DocumentsTab({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabaseEts
      .from("document_instances")
      .select(
        "id, template_id, status, signed_at, signed_by_name, pdf_url, notes, created_at",
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows(data ?? [])
        setLoading(false)
      })
  }, [clientId])
  if (loading) return <div className="h-24 rounded-md bg-muted animate-pulse" />
  if (rows.length === 0)
    return (
      <EtsEmptyState
        icon={FileText}
        title="No documents"
        description="Signed agreements, KYC docs, and store licenses will appear here."
      />
    )
  return (
    <EtsTable>
      <EtsTHead>
        <EtsTH>Created</EtsTH>
        <EtsTH>Status</EtsTH>
        <EtsTH>Signed by</EtsTH>
        <EtsTH>Signed at</EtsTH>
        <EtsTH>PDF</EtsTH>
        <EtsTH>Notes</EtsTH>
      </EtsTHead>
      <tbody>
        {rows.map((d) => (
          <EtsTR key={d.id}>
            <EtsTD className="text-xs">{formatDate(d.created_at)}</EtsTD>
            <EtsTD><EtsStatusBadge value={d.status} /></EtsTD>
            <EtsTD className="text-xs">{d.signed_by_name ?? "—"}</EtsTD>
            <EtsTD className="text-xs">{formatDate(d.signed_at)}</EtsTD>
            <EtsTD>
              {d.pdf_url ? (
                <a href={d.pdf_url} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 hover:underline">
                  View
                </a>
              ) : (
                "—"
              )}
            </EtsTD>
            <EtsTD className="text-xs text-muted-foreground">{d.notes ?? "—"}</EtsTD>
          </EtsTR>
        ))}
      </tbody>
    </EtsTable>
  )
}

function StoreTab({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabaseEts
      .from("stores")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows(data ?? [])
        setLoading(false)
      })
  }, [clientId])
  if (loading) return <div className="h-24 rounded-md bg-muted animate-pulse" />
  if (rows.length === 0)
    return (
      <EtsEmptyState
        icon={Building2}
        title="No store yet"
        description="Once this client converts to a store partner, the store record will appear here."
      />
    )
  return (
    <div className="space-y-3">
      {rows.map((s) => (
        <Link
          key={s.id}
          href={`/ets/stores/${s.id}`}
          className="block rounded-lg border border-border/80 bg-card hover:bg-muted/30 p-4 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{s.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {[s.address, s.city, s.state, s.pincode].filter(Boolean).join(", ")}
              </div>
            </div>
            <EtsStatusBadge value={s.status} />
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Field label="Size">{s.store_size_sqft ? `${s.store_size_sqft} sqft` : "—"}</Field>
            <Field label="Type">{s.store_type ?? "—"}</Field>
            <Field label="Package">{s.package_tier ?? "—"}</Field>
            <Field label="Launch">{formatDate(s.launch_date)}</Field>
          </div>
        </Link>
      ))}
    </div>
  )
}

function TicketsTab({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabaseEts
      .from("stores")
      .select("id")
      .eq("client_id", clientId)
      .then(async ({ data: stores }) => {
        const storeIds = (stores ?? []).map((s) => s.id)
        if (storeIds.length === 0) {
          setRows([])
          setLoading(false)
          return
        }
        const { data } = await supabaseEts
          .from("tickets")
          .select("*")
          .in("store_id", storeIds)
          .order("created_at", { ascending: false })
        setRows(data ?? [])
        setLoading(false)
      })
  }, [clientId])
  if (loading) return <div className="h-24 rounded-md bg-muted animate-pulse" />
  if (rows.length === 0)
    return (
      <EtsEmptyState
        icon={LifeBuoy}
        title="No tickets"
        description="Support tickets raised by this client or their store staff will land here."
      />
    )
  return (
    <EtsTable>
      <EtsTHead>
        <EtsTH>Title</EtsTH>
        <EtsTH>Type</EtsTH>
        <EtsTH>Priority</EtsTH>
        <EtsTH>Status</EtsTH>
        <EtsTH>Created</EtsTH>
      </EtsTHead>
      <tbody>
        {rows.map((t) => (
          <EtsTR key={t.id}>
            <EtsTD className="font-medium">{t.title}</EtsTD>
            <EtsTD className="text-xs">{t.type ?? "—"}</EtsTD>
            <EtsTD><EtsStatusBadge value={t.priority} /></EtsTD>
            <EtsTD><EtsStatusBadge value={t.status} /></EtsTD>
            <EtsTD className="text-xs">{formatDate(t.created_at)}</EtsTD>
          </EtsTR>
        ))}
      </tbody>
    </EtsTable>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card">
      <div className="px-4 py-2.5 border-b border-border/60 flex items-center gap-2">
        <Icon className="size-4 text-emerald-700" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  )
}
