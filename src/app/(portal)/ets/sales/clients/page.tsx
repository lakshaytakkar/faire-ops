"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Search, Phone, Mail, MapPin, Plus, Users } from "lucide-react"
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

interface ClientRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  city: string | null
  state: string | null
  stage: string | null
  package_tier: string | null
  total_paid: number | null
  pending_dues: number | null
  total_score: number | null
  manager_name: string | null
  assigned_to: string | null
  launch_phase: string | null
  estimated_launch_date: string | null
  is_lost: boolean | null
}

export default function EtsClientsPage() {
  const [rows, setRows] = useState<ClientRow[]>([])
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  async function load() {
    const { data } = await supabaseEts
      .from("clients")
      .select(
        "id, name, email, phone, city, state, stage, package_tier, total_paid, pending_dues, total_score, manager_name, assigned_to, launch_phase, estimated_launch_date, is_lost",
      )
      .order("created_at", { ascending: false })
    setRows((data ?? []) as ClientRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const stages = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => r.stage && set.add(r.stage))
    return Array.from(set).sort()
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (stageFilter !== "all" && r.stage !== stageFilter) return false
      if (search.trim()) {
        const term = search.trim().toLowerCase()
        const hay = [r.name, r.email, r.phone, r.city, r.manager_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [rows, search, stageFilter])

  return (
    <EtsListShell
      title="Clients"
      subtitle={
        loading
          ? "Loading…"
          : `${filtered.length} of ${rows.length} client${rows.length === 1 ? "" : "s"}`
      }
      action={
        <div className="flex items-center gap-2">
          <Link
            href="/ets/sales/pipeline"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border/80 bg-card text-sm font-medium hover:bg-muted/40"
          >
            Pipeline view
          </Link>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
          >
            <Plus className="size-4" /> New client
          </button>
        </div>
      }
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, email, phone, city, manager…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-md border border-border/80 bg-card text-sm"
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-border/80 bg-card text-sm"
          >
            <option value="all">All stages</option>
            {stages.map((s) => (
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
          icon={Users}
          title="No clients match"
          description="Adjust the filters or create a new client to get started."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Client</EtsTH>
            <EtsTH>Contact</EtsTH>
            <EtsTH>City</EtsTH>
            <EtsTH>Stage</EtsTH>
            <EtsTH>Manager</EtsTH>
            <EtsTH className="text-right">Paid</EtsTH>
            <EtsTH className="text-right">Score</EtsTH>
            <EtsTH>Launch</EtsTH>
          </EtsTHead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map((c) => (
                  <EtsTR key={c.id}>
                    <EtsTD>
                      <Link
                        href={`/ets/sales/clients/${c.id}`}
                        className="block hover:text-emerald-700"
                      >
                        <div className="font-semibold text-sm">{c.name}</div>
                        {c.package_tier && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {c.package_tier}
                          </div>
                        )}
                      </Link>
                    </EtsTD>
                    <EtsTD>
                      <div className="flex flex-col gap-0.5">
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            className="text-xs flex items-center gap-1 hover:underline"
                          >
                            <Phone className="size-3" /> {c.phone}
                          </a>
                        )}
                        {c.email && (
                          <a
                            href={`mailto:${c.email}`}
                            className="text-xs flex items-center gap-1 text-muted-foreground hover:underline truncate"
                          >
                            <Mail className="size-3" /> {c.email}
                          </a>
                        )}
                      </div>
                    </EtsTD>
                    <EtsTD className="text-xs">
                      {(c.city || c.state) && (
                        <div className="flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground" />
                          {[c.city, c.state].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </EtsTD>
                    <EtsTD>
                      <EtsStatusBadge value={c.stage} />
                    </EtsTD>
                    <EtsTD className="text-xs">
                      {c.manager_name ?? c.assigned_to ?? "—"}
                    </EtsTD>
                    <EtsTD className="text-right font-mono text-xs">
                      {formatCurrency(c.total_paid)}
                    </EtsTD>
                    <EtsTD className="text-right text-xs">
                      {c.total_score ?? "—"}
                    </EtsTD>
                    <EtsTD className="text-xs">
                      {c.launch_phase && (
                        <div className="font-medium">{c.launch_phase}</div>
                      )}
                      {c.estimated_launch_date && (
                        <div className="text-muted-foreground">
                          {formatDate(c.estimated_launch_date)}
                        </div>
                      )}
                    </EtsTD>
                  </EtsTR>
                ))}
          </tbody>
        </EtsTable>
      )}

      <NewClientDrawer
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false)
          load()
        }}
      />
    </EtsListShell>
  )
}

function NewClientDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [stage, setStage] = useState("new-lead")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (!name.trim()) {
      setErr("Name is required.")
      return
    }
    setBusy(true)
    setErr(null)
    const { error } = await supabaseEts.from("clients").insert({
      name: name.trim(),
      email: email.trim().toLowerCase() || null,
      phone: phone.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      stage,
    })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setName("")
    setEmail("")
    setPhone("")
    setCity("")
    setState("")
    setStage("new-lead")
    onCreated()
  }

  return (
    <EtsEditDrawer
      open={open}
      onClose={onClose}
      title="New client"
      subtitle="Create a new partner lead or signed client."
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
            {busy ? "Creating…" : "Create"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Full name" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            placeholder="E.g. Ankur Khurana"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            placeholder="+91-…"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
          <Field label="State">
            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
        </div>
        <Field label="Stage">
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
          >
            <option value="new-lead">New lead</option>
            <option value="qualified">Qualified</option>
            <option value="token-paid">Token paid</option>
            <option value="onboarding">Onboarding</option>
            <option value="onboarded">Onboarded</option>
            <option value="launched">Launched</option>
            <option value="lost">Lost</option>
            <option value="refund">Refund</option>
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
