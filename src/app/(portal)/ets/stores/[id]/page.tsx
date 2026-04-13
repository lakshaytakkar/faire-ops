"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  Building2,
  Users,
  ClipboardList,
  Package,
  LifeBuoy,
  FileText,
  Pencil,
  Check,
  X,
  AlertTriangle,
  Boxes,
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

interface Store {
  id: string
  name: string
  client_id: string | null
  city: string | null
  state: string | null
  address: string | null
  pincode: string | null
  store_size_sqft: number | null
  floor_type: string | null
  launch_date: string | null
  status: string | null
  store_type: string | null
  package_tier: string | null
  created_at: string | null
  updated_at: string | null
}

const STATUS_OPTIONS = [
  "planning",
  "under-construction",
  "ready",
  "operational",
  "closed",
]

export default function StoreDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string

  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [counts, setCounts] = useState({ staff: 0, boq: 0, tickets: 0 })
  const [boqTotal, setBoqTotal] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabaseEts
      .from("stores")
      .select("*")
      .eq("id", id)
      .maybeSingle()
    if (error) setErr(error.message)
    setStore(data as Store | null)
    setLoading(false)

    const [staff, boq, tickets] = await Promise.all([
      supabaseEts.from("store_staff").select("id", { count: "exact", head: true }).eq("store_id", id),
      supabaseEts.from("store_boq").select("id, total_price", { count: "exact" }).eq("store_id", id),
      supabaseEts
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("store_id", id)
        .neq("status", "closed"),
    ])
    const total = (boq.data ?? []).reduce(
      (s: number, r: { total_price: number | null }) => s + (Number(r.total_price) || 0),
      0,
    )
    setBoqTotal(total)
    setCounts({
      staff: staff.count ?? 0,
      boq: boq.count ?? 0,
      tickets: tickets.count ?? 0,
    })
  }, [id])

  useEffect(() => {
    if (id) load()
  }, [id, load])

  async function patch(updates: Partial<Store>) {
    setBusy(true)
    const { error } = await supabaseEts.from("stores").update(updates).eq("id", id)
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setStore((s) => (s ? { ...s, ...updates } : s))
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

  if (!store) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <Link
          href="/ets/stores"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to stores
        </Link>
        <EtsEmptyState
          icon={AlertTriangle}
          title="Store not found"
          description={err ?? "The store you requested doesn't exist or was deleted."}
        />
      </div>
    )
  }

  return (
    <EtsDetailShell
      backHref="/ets/stores"
      backLabel="All stores"
      avatar={
        <div
          className="size-14 rounded-full bg-muted text-foreground flex items-center justify-center font-bold text-base shrink-0 ring-1 ring-border"
          aria-hidden
        >
          {formatInitials(store.name)}
        </div>
      }
      title={store.name}
      subtitle={[store.address, store.city, store.state, store.pincode]
        .filter(Boolean)
        .join(", ")}
      badges={
        <div className="flex items-center gap-1.5 flex-wrap">
          <EtsStatusBadge value={store.status} />
          {store.store_type && <EtsStatusBadge value={store.store_type} />}
        </div>
      }
      actions={
        <select
          value={store.status ?? ""}
          onChange={(e) => patch({ status: e.target.value })}
          disabled={busy}
          className="h-9 px-3 rounded-md border border-border bg-card text-sm font-medium"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      }
      kpis={
        <>
          <EtsKpi label="Size" value={store.store_size_sqft ? `${store.store_size_sqft} sqft` : "—"} />
          <EtsKpi label="Package" value={store.package_tier ?? "—"} />
          <EtsKpi label="Launch date" value={formatDate(store.launch_date)} />
          <EtsKpi label="Staff" value={counts.staff} />
          <EtsKpi label="BOQ total" value={formatCurrency(boqTotal)} hint={`${counts.boq} items`} />
          <EtsKpi label="Open tickets" value={counts.tickets} />
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <EtsTabsPanel
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "staff", label: "Staff" },
            { id: "boq", label: "BOQ" },
            { id: "kit", label: "Setup Kit" },
            { id: "orders", label: "Orders" },
            { id: "tickets", label: "Tickets" },
            { id: "documents", label: "Documents" },
          ]}
          render={(active) => {
            if (active === "overview") return <OverviewTab store={store} />
            if (active === "staff") return <StaffTab storeId={store.id} />
            if (active === "boq") return <BoqTab storeId={store.id} />
            if (active === "kit") return <KitTab storeId={store.id} />
            if (active === "orders") return <OrdersTab storeId={store.id} />
            if (active === "tickets") return <TicketsTab storeId={store.id} />
            if (active === "documents") return <DocumentsTab storeId={store.id} />
            return null
          }}
        />
        <RightRail store={store} patch={patch} busy={busy} />
      </div>
    </EtsDetailShell>
  )
}

// ─── Right rail ─────────────────────────────────────────────────────────────

function RightRail({
  store,
  patch,
  busy,
}: {
  store: Store
  patch: (u: Partial<Store>) => Promise<void>
  busy: boolean
}) {
  return (
    <div className="space-y-5">
      <Panel title="Schedule">
        <EditableField
          label="Launch date"
          type="date"
          value={store.launch_date}
          onSave={(v) => patch({ launch_date: v || null })}
          busy={busy}
        />
      </Panel>
      <Panel title="Configuration">
        <EditableField
          label="Package tier"
          value={store.package_tier}
          onSave={(v) => patch({ package_tier: v || null })}
          busy={busy}
        />
        <EditableField
          label="Store type"
          value={store.store_type}
          onSave={(v) => patch({ store_type: v || null })}
          busy={busy}
        />
        <EditableField
          label="Floor type"
          value={store.floor_type}
          onSave={(v) => patch({ floor_type: v || null })}
          busy={busy}
        />
      </Panel>
      <Panel title="Sizing">
        <EditableField
          label="Size (sqft)"
          type="number"
          value={store.store_size_sqft}
          onSave={(v) => patch({ store_size_sqft: v ? parseInt(v) : null })}
          busy={busy}
        />
      </Panel>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="px-4 py-3 border-b border-border">
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
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </div>
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="flex-1 h-8 px-2 rounded-md border border-border bg-background text-sm"
            autoFocus
          />
          <button
            onClick={() => {
              onSave(draft.trim())
              setEditing(false)
            }}
            className="size-7 rounded hover:bg-muted text-foreground flex items-center justify-center"
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
          className="w-full flex items-center justify-between gap-2 text-sm font-medium hover:text-primary text-left"
        >
          <span className="truncate">
            {value != null && value !== "" ? (
              type === "date" ? formatDate(value as string) : String(value)
            ) : (
              <span className="text-muted-foreground italic">— set —</span>
            )}
          </span>
          <Pencil className="size-3 text-muted-foreground shrink-0" />
        </button>
      )}
    </div>
  )
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

function OverviewTab({ store }: { store: Store }) {
  return (
    <div className="space-y-5">
      <Section title="Location" icon={Building2}>
        <Field label="Address">{store.address ?? "—"}</Field>
        <Field label="City">{store.city ?? "—"}</Field>
        <Field label="State">{store.state ?? "—"}</Field>
        <Field label="Pincode">{store.pincode ?? "—"}</Field>
      </Section>
      <Section title="Specifications" icon={Boxes}>
        <Field label="Size">{store.store_size_sqft ? `${store.store_size_sqft} sqft` : "—"}</Field>
        <Field label="Floor type">{store.floor_type ?? "—"}</Field>
        <Field label="Store type">{store.store_type ?? "—"}</Field>
        <Field label="Package tier">{store.package_tier ?? "—"}</Field>
      </Section>
      <Section title="Timeline" icon={ClipboardList}>
        <Field label="Status"><EtsStatusBadge value={store.status} /></Field>
        <Field label="Launch date">{formatDate(store.launch_date)}</Field>
        <Field label="Created">{formatDate(store.created_at)}</Field>
        <Field label="Updated">{formatDate(store.updated_at)}</Field>
      </Section>
    </div>
  )
}

function StaffTab({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabaseEts
      .from("store_staff")
      .select("*")
      .eq("store_id", storeId)
      .order("joined_at", { ascending: false })
      .then(({ data }) => {
        setRows(data ?? [])
        setLoading(false)
      })
  }, [storeId])
  if (loading) return <div className="h-24 rounded-md bg-muted animate-pulse" />
  if (rows.length === 0)
    return (
      <EtsEmptyState
        icon={Users}
        title="No staff yet"
        description="Add store staff with their PIN codes for POS access."
      />
    )
  return (
    <EtsTable>
      <EtsTHead>
        <EtsTH>User</EtsTH>
        <EtsTH>Designation</EtsTH>
        <EtsTH>PIN</EtsTH>
        <EtsTH>Active</EtsTH>
        <EtsTH>Joined</EtsTH>
      </EtsTHead>
      <tbody>
        {rows.map((r) => (
          <EtsTR key={String(r.id)}>
            <EtsTD className="font-mono text-xs">{String(r.user_id ?? "—").slice(0, 8)}</EtsTD>
            <EtsTD className="text-xs">{(r.designation as string) ?? "—"}</EtsTD>
            <EtsTD className="font-mono text-xs">{(r.pin_code as string) ?? "—"}</EtsTD>
            <EtsTD>
              <EtsStatusBadge value={r.is_active ? "active" : "inactive"} />
            </EtsTD>
            <EtsTD className="text-xs">{formatDate(r.joined_at as string)}</EtsTD>
          </EtsTR>
        ))}
      </tbody>
    </EtsTable>
  )
}

function BoqTab({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabaseEts
      .from("store_boq")
      .select("*, item:setup_kit_items(name, category, unit)")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows(data ?? [])
        setLoading(false)
      })
  }, [storeId])
  if (loading) return <div className="h-24 rounded-md bg-muted animate-pulse" />
  if (rows.length === 0)
    return (
      <EtsEmptyState
        icon={ClipboardList}
        title="No BOQ items"
        description="Bill of quantities for this store is empty."
      />
    )
  return (
    <EtsTable>
      <EtsTHead>
        <EtsTH>Item</EtsTH>
        <EtsTH>Category</EtsTH>
        <EtsTH className="text-right">Qty</EtsTH>
        <EtsTH className="text-right">Unit price</EtsTH>
        <EtsTH className="text-right">Total</EtsTH>
        <EtsTH>Status</EtsTH>
      </EtsTHead>
      <tbody>
        {rows.map((r) => {
          const item = r.item as { name?: string; category?: string; unit?: string } | null
          return (
            <EtsTR key={String(r.id)}>
              <EtsTD className="font-medium text-sm">{item?.name ?? "—"}</EtsTD>
              <EtsTD className="text-xs">{item?.category ?? "—"}</EtsTD>
              <EtsTD className="text-right text-xs font-mono">{String(r.quantity ?? "—")}</EtsTD>
              <EtsTD className="text-right text-xs font-mono">{formatCurrency(r.unit_price as number)}</EtsTD>
              <EtsTD className="text-right text-xs font-mono">{formatCurrency(r.total_price as number)}</EtsTD>
              <EtsTD><EtsStatusBadge value={r.status as string} /></EtsTD>
            </EtsTR>
          )
        })}
      </tbody>
    </EtsTable>
  )
}

function KitTab({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabaseEts
      .from("store_boq")
      .select("quantity, item:setup_kit_items(*)")
      .eq("store_id", storeId)
      .then(({ data }) => {
        setRows(data ?? [])
        setLoading(false)
      })
  }, [storeId])
  if (loading) return <div className="h-24 rounded-md bg-muted animate-pulse" />
  const items = rows
    .map((r) => {
      const item = (r.item as Record<string, unknown> | null) ?? {}
      return {
        qty: r.quantity as number,
        ...item,
      } as {
        qty: number
        id?: string
        name?: string
        category?: string
        material?: string
        unit?: string
        unit_price?: number
      }
    })
    .filter((i) => i.id)
  if (items.length === 0)
    return (
      <EtsEmptyState
        icon={Boxes}
        title="No kit items"
        description="Setup kit items appear here once BOQ is configured."
      />
    )
  return (
    <EtsTable>
      <EtsTHead>
        <EtsTH>Name</EtsTH>
        <EtsTH>Category</EtsTH>
        <EtsTH>Material</EtsTH>
        <EtsTH>Unit</EtsTH>
        <EtsTH className="text-right">Qty</EtsTH>
        <EtsTH className="text-right">Unit price</EtsTH>
      </EtsTHead>
      <tbody>
        {items.map((i, idx) => (
          <EtsTR key={`${i.id}-${idx}`}>
            <EtsTD className="font-medium text-sm">{i.name ?? "—"}</EtsTD>
            <EtsTD className="text-xs">{i.category ?? "—"}</EtsTD>
            <EtsTD className="text-xs">{i.material ?? "—"}</EtsTD>
            <EtsTD className="text-xs">{i.unit ?? "—"}</EtsTD>
            <EtsTD className="text-right text-xs font-mono">{i.qty ?? "—"}</EtsTD>
            <EtsTD className="text-right text-xs font-mono">{formatCurrency(i.unit_price ?? null)}</EtsTD>
          </EtsTR>
        ))}
      </tbody>
    </EtsTable>
  )
}

function OrdersTab({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabaseEts
      .from("orders")
      .select("id, order_number, status, payment_status, fulfillment_status, total_units, total_amount, created_at, expected_delivery")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows(data ?? [])
        setLoading(false)
      })
  }, [storeId])
  if (loading) return <div className="h-24 rounded-md bg-muted animate-pulse" />
  if (rows.length === 0)
    return <EtsEmptyState icon={Package} title="No orders" />
  return (
    <EtsTable>
      <EtsTHead>
        <EtsTH>Order</EtsTH>
        <EtsTH>Created</EtsTH>
        <EtsTH>Status</EtsTH>
        <EtsTH>Payment</EtsTH>
        <EtsTH>Fulfillment</EtsTH>
        <EtsTH className="text-right">Units</EtsTH>
        <EtsTH className="text-right">Total</EtsTH>
      </EtsTHead>
      <tbody>
        {rows.map((o) => (
          <EtsTR key={String(o.id)}>
            <EtsTD className="font-mono text-xs">{(o.order_number as string) ?? String(o.id).slice(0, 8)}</EtsTD>
            <EtsTD className="text-xs">{formatDate(o.created_at as string)}</EtsTD>
            <EtsTD><EtsStatusBadge value={o.status as string} /></EtsTD>
            <EtsTD><EtsStatusBadge value={o.payment_status as string} /></EtsTD>
            <EtsTD><EtsStatusBadge value={o.fulfillment_status as string} /></EtsTD>
            <EtsTD className="text-right text-xs">{(o.total_units as number) ?? "—"}</EtsTD>
            <EtsTD className="text-right font-mono text-xs">{formatCurrency(o.total_amount as number)}</EtsTD>
          </EtsTR>
        ))}
      </tbody>
    </EtsTable>
  )
}

function TicketsTab({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabaseEts
      .from("tickets")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows(data ?? [])
        setLoading(false)
      })
  }, [storeId])
  if (loading) return <div className="h-24 rounded-md bg-muted animate-pulse" />
  if (rows.length === 0)
    return <EtsEmptyState icon={LifeBuoy} title="No tickets" />
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
          <EtsTR key={String(t.id)}>
            <EtsTD className="font-medium text-sm">{(t.title as string) ?? "—"}</EtsTD>
            <EtsTD className="text-xs">{(t.type as string) ?? "—"}</EtsTD>
            <EtsTD><EtsStatusBadge value={t.priority as string} /></EtsTD>
            <EtsTD><EtsStatusBadge value={t.status as string} /></EtsTD>
            <EtsTD className="text-xs">{formatDate(t.created_at as string)}</EtsTD>
          </EtsTR>
        ))}
      </tbody>
    </EtsTable>
  )
}

function DocumentsTab({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabaseEts
      .from("document_instances")
      .select("*, template:document_templates(title, type)")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows(data ?? [])
        setLoading(false)
      })
  }, [storeId])
  if (loading) return <div className="h-24 rounded-md bg-muted animate-pulse" />
  if (rows.length === 0)
    return <EtsEmptyState icon={FileText} title="No documents" />
  return (
    <EtsTable>
      <EtsTHead>
        <EtsTH>Template</EtsTH>
        <EtsTH>Status</EtsTH>
        <EtsTH>Signed by</EtsTH>
        <EtsTH>Signed at</EtsTH>
        <EtsTH>PDF</EtsTH>
      </EtsTHead>
      <tbody>
        {rows.map((d) => {
          const tpl = d.template as { title?: string; type?: string } | null
          return (
            <EtsTR key={String(d.id)}>
              <EtsTD className="font-medium text-sm">{tpl?.title ?? "—"}</EtsTD>
              <EtsTD><EtsStatusBadge value={d.status as string} /></EtsTD>
              <EtsTD className="text-xs">{(d.signed_by_name as string) ?? "—"}</EtsTD>
              <EtsTD className="text-xs">{formatDate(d.signed_at as string)}</EtsTD>
              <EtsTD>
                {d.pdf_url ? (
                  <a href={d.pdf_url as string} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 hover:underline">
                    View
                  </a>
                ) : (
                  "—"
                )}
              </EtsTD>
            </EtsTR>
          )
        })}
      </tbody>
    </EtsTable>
  )
}

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
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
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
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  )
}
