"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, Store as StoreIcon, Trash2 } from "lucide-react"
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

interface StoreRow {
  id: string
  name: string
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
  client_id: string | null
}

interface ClientLite {
  id: string
  name: string
}

const STATUS_OPTIONS = [
  "planning",
  "under-construction",
  "ready",
  "operational",
  "closed",
]

export default function EtsStoresPage() {
  const router = useRouter()
  const [rows, setRows] = useState<StoreRow[]>([])
  const [clients, setClients] = useState<ClientLite[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    const [s, c] = await Promise.all([
      supabaseEts
        .from("stores")
        .select(
          "id, name, city, state, address, pincode, store_size_sqft, floor_type, launch_date, status, store_type, package_tier, client_id",
        )
        .order("name", { ascending: true }),
      supabaseEts.from("clients").select("id, name").order("name"),
    ])
    setRows((s.data ?? []) as StoreRow[])
    setClients((c.data ?? []) as ClientLite[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search.trim()) {
        const term = search.trim().toLowerCase()
        const hay = [r.name, r.city, r.state, r.pincode, r.store_type]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [rows, search, statusFilter])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete store "${name}"? This cannot be undone.`)) return
    const { error } = await supabaseEts.from("stores").delete().eq("id", id)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  return (
    <EtsListShell
      title="Stores"
      subtitle={
        loading
          ? "Loading…"
          : `${filtered.length} of ${rows.length} partner store${rows.length === 1 ? "" : "s"}`
      }
      action={
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="size-4" /> New store
        </button>
      }
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, city, type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-md border border-border bg-card text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-border bg-card text-sm"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
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
          icon={StoreIcon}
          title="No stores match"
          description="Adjust the filters or create a new store to get started."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Name</EtsTH>
            <EtsTH>Location</EtsTH>
            <EtsTH>Status</EtsTH>
            <EtsTH>Type</EtsTH>
            <EtsTH>Package</EtsTH>
            <EtsTH className="text-right">Size</EtsTH>
            <EtsTH>Launch</EtsTH>
            <EtsTH></EtsTH>
          </EtsTHead>
          <tbody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map((s) => (
                  <EtsTR key={s.id} onClick={() => router.push(`/ets/stores/${s.id}`)}>
                    <EtsTD>
                      <div className="font-semibold text-sm">{s.name}</div>
                      {s.address && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[260px]">
                          {s.address}
                        </div>
                      )}
                    </EtsTD>
                    <EtsTD className="text-xs">
                      {[s.city, s.state].filter(Boolean).join(", ") || "—"}
                      {s.pincode && (
                        <div className="text-muted-foreground">{s.pincode}</div>
                      )}
                    </EtsTD>
                    <EtsTD>
                      <EtsStatusBadge value={s.status} />
                    </EtsTD>
                    <EtsTD className="text-xs">{s.store_type ?? "—"}</EtsTD>
                    <EtsTD className="text-xs">{s.package_tier ?? "—"}</EtsTD>
                    <EtsTD className="text-right text-xs font-mono">
                      {s.store_size_sqft ? `${s.store_size_sqft}` : "—"}
                    </EtsTD>
                    <EtsTD className="text-xs">{formatDate(s.launch_date)}</EtsTD>
                    <EtsTD>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(s.id, s.name)
                        }}
                        className="size-7 rounded hover:bg-rose-50 text-rose-600 flex items-center justify-center"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </EtsTD>
                  </EtsTR>
                ))}
          </tbody>
        </EtsTable>
      )}

      <NewStoreDrawer
        open={creating}
        onClose={() => setCreating(false)}
        clients={clients}
        onCreated={() => {
          setCreating(false)
          load()
        }}
      />
    </EtsListShell>
  )
}

function NewStoreDrawer({
  open,
  onClose,
  clients,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  clients: ClientLite[]
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    client_id: "",
    name: "",
    city: "",
    state: "",
    address: "",
    pincode: "",
    store_size_sqft: "",
    floor_type: "",
    launch_date: "",
    status: "planning",
    store_type: "standard",
    package_tier: "",
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.name.trim()) {
      setErr("Name is required.")
      return
    }
    setBusy(true)
    setErr(null)
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      client_id: form.client_id || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      address: form.address.trim() || null,
      pincode: form.pincode.trim() || null,
      store_size_sqft: form.store_size_sqft ? parseInt(form.store_size_sqft) : null,
      floor_type: form.floor_type.trim() || null,
      launch_date: form.launch_date || null,
      status: form.status,
      store_type: form.store_type.trim() || null,
      package_tier: form.package_tier.trim() || null,
    }
    const { error } = await supabaseEts.from("stores").insert(payload)
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    onCreated()
  }

  return (
    <EtsEditDrawer
      open={open}
      onClose={onClose}
      title="New store"
      subtitle="Create a partner store record."
      footer={
        <>
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <DrawerField label="Client">
          <select
            value={form.client_id}
            onChange={(e) => set("client_id", e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="">— Unassigned —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </DrawerField>
        <DrawerField label="Store name" required>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
          />
        </DrawerField>
        <div className="grid grid-cols-2 gap-3">
          <DrawerField label="City">
            <input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            />
          </DrawerField>
          <DrawerField label="State">
            <input
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            />
          </DrawerField>
        </div>
        <DrawerField label="Address">
          <input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
          />
        </DrawerField>
        <div className="grid grid-cols-2 gap-3">
          <DrawerField label="Pincode">
            <input
              value={form.pincode}
              onChange={(e) => set("pincode", e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            />
          </DrawerField>
          <DrawerField label="Size (sqft)">
            <input
              type="number"
              value={form.store_size_sqft}
              onChange={(e) => set("store_size_sqft", e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            />
          </DrawerField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DrawerField label="Floor type">
            <input
              value={form.floor_type}
              onChange={(e) => set("floor_type", e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              placeholder="e.g. tile, vinyl"
            />
          </DrawerField>
          <DrawerField label="Launch date">
            <input
              type="date"
              value={form.launch_date}
              onChange={(e) => set("launch_date", e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            />
          </DrawerField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DrawerField label="Status">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </DrawerField>
          <DrawerField label="Store type">
            <select
              value={form.store_type}
              onChange={(e) => set("store_type", e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="standard">standard</option>
              <option value="mini">mini</option>
              <option value="flagship">flagship</option>
            </select>
          </DrawerField>
        </div>
        <DrawerField label="Package tier">
          <input
            value={form.package_tier}
            onChange={(e) => set("package_tier", e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            placeholder="e.g. silver / gold / platinum"
          />
        </DrawerField>
        {err && (
          <div className="rounded-md bg-rose-50 text-rose-700 px-3 py-2 text-xs">
            {err}
          </div>
        )}
      </div>
    </EtsEditDrawer>
  )
}

function DrawerField({
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
