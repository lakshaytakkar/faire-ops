"use client"

import { useEffect, useMemo, useState } from "react"
import { FileText, Plus, ExternalLink } from "lucide-react"
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

interface ProposalRow {
  id: string
  title: string | null
  client_id: string | null
  client_name: string | null
  status: string | null
  pdf_url: string | null
  created_at: string | null
  template_type: string | null
}

interface ClientOpt {
  id: string
  name: string
}

export default function EtsSalesProposalsPage() {
  const [rows, setRows] = useState<ProposalRow[]>([])
  const [clients, setClients] = useState<ClientOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [tableMissing, setTableMissing] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")

  async function load() {
    setLoading(true)
    // discovery: try direct proposals table
    const probe = await supabaseEts.from("proposals").select("id").limit(1)
    if (!probe.error) {
      const { data } = await supabaseEts
        .from("proposals")
        .select(
          "id, title, status, pdf_url, created_at, client_id, clients(name)",
        )
        .order("created_at", { ascending: false })
      setRows(
        ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
          id: String(r.id),
          title: (r.title as string) ?? null,
          client_id: (r.client_id as string) ?? null,
          client_name:
            ((r.clients as { name?: string } | null)?.name) ?? null,
          status: (r.status as string) ?? null,
          pdf_url: (r.pdf_url as string) ?? null,
          created_at: (r.created_at as string) ?? null,
          template_type: null,
        })),
      )
    } else if ((probe.error as { code?: string }).code === "42P01") {
      // fallback to document_instances + document_templates
      const { data, error } = await supabaseEts
        .from("document_instances")
        .select(
          "id, status, pdf_url, created_at, client_id, notes, document_templates(title, type), clients(name)",
        )
        .order("created_at", { ascending: false })
      if (error) {
        setTableMissing(true)
        setRows([])
      } else {
        const filtered = ((data ?? []) as Array<Record<string, unknown>>)
          .filter((r) => {
            const t = (r.document_templates as { type?: string } | null)?.type
            return !t || /propos|quote|estim/i.test(t)
          })
          .map((r) => ({
            id: String(r.id),
            title:
              ((r.document_templates as { title?: string } | null)?.title) ??
              null,
            client_id: (r.client_id as string) ?? null,
            client_name:
              ((r.clients as { name?: string } | null)?.name) ?? null,
            status: (r.status as string) ?? null,
            pdf_url: (r.pdf_url as string) ?? null,
            created_at: (r.created_at as string) ?? null,
            template_type:
              ((r.document_templates as { type?: string } | null)?.type) ??
              null,
          }))
        setRows(filtered)
      }
    } else {
      setTableMissing(true)
      setRows([])
    }

    const cl = await supabaseEts
      .from("clients")
      .select("id, name")
      .order("name")
    setClients((cl.data ?? []) as ClientOpt[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    return rows.filter(
      (r) => statusFilter === "all" || r.status === statusFilter,
    )
  }, [rows, statusFilter])

  return (
    <EtsListShell
      title="Proposals"
      subtitle={
        loading
          ? "Loading…"
          : `${filtered.length} of ${rows.length} proposal${rows.length === 1 ? "" : "s"}`
      }
      action={
        !tableMissing && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="size-4" /> New proposal
          </button>
        )
      }
      filters={
        !tableMissing && (
          <div className="flex gap-3 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-border bg-card text-sm"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        )
      }
    >
      {tableMissing ? (
        <EtsEmptyState
          icon={FileText}
          title="Proposals not configured"
          description="No proposals or document_instances table found in the ets schema."
        />
      ) : !loading && filtered.length === 0 ? (
        <EtsEmptyState
          icon={FileText}
          title="No proposals yet"
          description="Send your first proposal to a qualified lead."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Title</EtsTH>
            <EtsTH>Client</EtsTH>
            <EtsTH>Status</EtsTH>
            <EtsTH>Created</EtsTH>
            <EtsTH>PDF</EtsTH>
          </EtsTHead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map((p) => (
                  <EtsTR key={p.id}>
                    <EtsTD>
                      <div className="font-semibold text-sm">
                        {p.title ?? "Untitled"}
                      </div>
                      {p.template_type && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {p.template_type}
                        </div>
                      )}
                    </EtsTD>
                    <EtsTD className="text-xs">{p.client_name ?? "—"}</EtsTD>
                    <EtsTD>
                      <EtsStatusBadge value={p.status} />
                    </EtsTD>
                    <EtsTD className="text-xs text-muted-foreground">
                      {formatDate(p.created_at)}
                    </EtsTD>
                    <EtsTD>
                      {p.pdf_url ? (
                        <a
                          href={p.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
                        >
                          <ExternalLink className="size-3" /> Open
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </EtsTD>
                  </EtsTR>
                ))}
          </tbody>
        </EtsTable>
      )}

      <NewProposalDrawer
        open={creating}
        clients={clients}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false)
          load()
        }}
      />
    </EtsListShell>
  )
}

function NewProposalDrawer({
  open,
  clients,
  onClose,
  onCreated,
}: {
  open: boolean
  clients: ClientOpt[]
  onClose: () => void
  onCreated: () => void
}) {
  const [clientId, setClientId] = useState("")
  const [title, setTitle] = useState("")
  const [status, setStatus] = useState("draft")
  const [amount, setAmount] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (!clientId) {
      setErr("Client is required.")
      return
    }
    setBusy(true)
    setErr(null)
    // try proposals table first
    const proposalsTry = await supabaseEts.from("proposals").insert({
      client_id: clientId,
      title: title.trim() || null,
      status,
      amount: amount ? Number(amount) : null,
      valid_until: validUntil || null,
      notes: notes.trim() || null,
    })
    if (proposalsTry.error && (proposalsTry.error as { code?: string }).code === "42P01") {
      // fallback to document_instances (no amount/valid_until persisted)
      const ins = await supabaseEts.from("document_instances").insert({
        client_id: clientId,
        status,
        notes:
          [
            title.trim() && `Title: ${title.trim()}`,
            amount && `Amount: ${amount}`,
            validUntil && `Valid until: ${validUntil}`,
            notes.trim(),
          ]
            .filter(Boolean)
            .join("\n") || null,
      })
      setBusy(false)
      if (ins.error) {
        setErr(ins.error.message)
        return
      }
    } else if (proposalsTry.error) {
      setBusy(false)
      setErr(proposalsTry.error.message)
      return
    } else {
      setBusy(false)
    }
    setClientId("")
    setTitle("")
    setStatus("draft")
    setAmount("")
    setValidUntil("")
    setNotes("")
    onCreated()
  }

  return (
    <EtsEditDrawer
      open={open}
      onClose={onClose}
      title="New proposal"
      subtitle="Send a package proposal to a qualified lead."
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
        <Field label="Client" required>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            placeholder="Launch Pro proposal — Mumbai store"
          />
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹)">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Valid until">
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            />
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
