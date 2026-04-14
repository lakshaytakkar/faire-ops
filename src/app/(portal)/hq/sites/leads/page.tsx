"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Download,
  Inbox,
  MessageCircle,
  Plus,
  ShieldCheck,
  Upload,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { FilterBar } from "@/components/shared/filter-bar"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { EditDrawer } from "@/components/shared/edit-drawer"
import { Button } from "@/components/ui/button"
import { relativeTime, formatDateTime } from "@/lib/format"
import { supabaseHq } from "@/lib/supabase"

export const dynamic = "force-dynamic"

/**
 * Leads (`/hq/sites/leads`) — spec §7.3.
 *
 * Central lead inbox across all Suprans websites. Status tone:
 * new=blue, contacted=amber, qualified=emerald,
 * disqualified=red, converted=violet.
 */

type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "disqualified"
  | "converted"

interface LeadRow {
  id: string
  site_id: string | null
  source_site: string | null
  source_page: string | null
  utm_campaign: string | null
  utm_source: string | null
  utm_medium: string | null
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  status: LeadStatus
  assigned_to: string | null
  converted_to: string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

type TabId = "all" | LeadStatus

const STATUS_TONE: Record<LeadStatus, StatusTone> = {
  new: "blue",
  contacted: "amber",
  qualified: "emerald",
  disqualified: "red",
  converted: "violet",
}

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  disqualified: "Disqualified",
  converted: "Converted",
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadCsv(rows: LeadRow[]) {
  const headers = [
    "name",
    "email",
    "phone",
    "source_site",
    "source_page",
    "utm_campaign",
    "utm_source",
    "utm_medium",
    "status",
    "assigned_to",
    "created_at",
  ]
  const lines = [headers.join(",")]
  for (const r of rows) {
    lines.push(
      [
        r.name,
        r.email,
        r.phone,
        r.source_site,
        r.source_page,
        r.utm_campaign,
        r.utm_source,
        r.utm_medium,
        r.status,
        r.assigned_to,
        r.created_at,
      ]
        .map(csvEscape)
        .join(","),
    )
  }
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function HqLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [tab, setTab] = useState<TabId>("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [assignedFilter, setAssignedFilter] = useState<string>("all")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkAssignee, setBulkAssignee] = useState("")
  const [noteDraft, setNoteDraft] = useState<string>("")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabaseHq
        .from("site_leads")
        .select(
          "id, site_id, source_site, source_page, utm_campaign, utm_source, utm_medium, name, email, phone, message, status, assigned_to, converted_to, notes, created_at, updated_at",
        )
        .order("created_at", { ascending: false })
      if (cancelled) return
      if (error) {
        toast.error(`Failed to load leads: ${error.message}`)
        setLeads([])
      } else {
        setLeads((data ?? []) as LeadRow[])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const c: Record<LeadStatus, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      disqualified: 0,
      converted: 0,
    }
    for (const l of leads) {
      if (l.status && c[l.status] !== undefined) c[l.status]++
    }
    return { ...c, total: leads.length }
  }, [leads])

  const distinctSources = useMemo(() => {
    const set = new Set<string>()
    for (const l of leads) if (l.source_site) set.add(l.source_site)
    return Array.from(set).sort()
  }, [leads])

  const distinctAssignees = useMemo(() => {
    const set = new Set<string>()
    for (const l of leads) if (l.assigned_to) set.add(l.assigned_to)
    return Array.from(set).sort()
  }, [leads])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return leads.filter((l) => {
      if (tab !== "all" && l.status !== tab) return false
      if (sourceFilter !== "all" && l.source_site !== sourceFilter) return false
      if (assignedFilter !== "all") {
        if (assignedFilter === "__unassigned" && l.assigned_to) return false
        if (assignedFilter !== "__unassigned" && l.assigned_to !== assignedFilter)
          return false
      }
      if (needle) {
        const hay = `${l.name ?? ""} ${l.email ?? ""} ${l.phone ?? ""}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [leads, q, tab, sourceFilter, assignedFilter])

  const activeLead = useMemo(
    () => leads.find((l) => l.id === activeLeadId) ?? null,
    [leads, activeLeadId],
  )

  useEffect(() => {
    setNoteDraft(activeLead?.notes ?? "")
  }, [activeLeadId, activeLead?.notes])

  async function updateLead(id: string, patch: Partial<LeadRow>) {
    const original = leads
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    )
    const { error } = await supabaseHq
      .from("site_leads")
      .update(patch)
      .eq("id", id)
    if (error) {
      setLeads(original)
      toast.error(`Update failed: ${error.message}`)
      return false
    }
    return true
  }

  async function setStatus(id: string, status: LeadStatus) {
    const ok = await updateLead(id, { status })
    if (ok) toast.success(`Marked ${STATUS_LABEL[status].toLowerCase()}`)
  }

  async function saveNotes(id: string, notes: string) {
    const lead = leads.find((l) => l.id === id)
    if (!lead) return
    if ((lead.notes ?? "") === notes) return
    const ok = await updateLead(id, { notes })
    if (ok) toast.success("Notes saved")
  }

  async function bulkAssign() {
    const assignee = bulkAssignee.trim()
    if (!assignee || selected.size === 0) return
    const ids = Array.from(selected)
    const original = leads
    setLeads((prev) =>
      prev.map((l) =>
        selected.has(l.id) ? { ...l, assigned_to: assignee } : l,
      ),
    )
    const { error } = await supabaseHq
      .from("site_leads")
      .update({ assigned_to: assignee })
      .in("id", ids)
    if (error) {
      setLeads(original)
      toast.error(`Bulk assign failed: ${error.message}`)
      return
    }
    toast.success(`Assigned ${ids.length} lead${ids.length === 1 ? "" : "s"} to ${assignee}`)
    setSelected(new Set())
    setBulkOpen(false)
    setBulkAssignee("")
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      if (prev.size === visible.length && visible.length > 0) return new Set()
      return new Set(visible.map((v) => v.id))
    })
  }

  const allVisibleSelected =
    visible.length > 0 && selected.size === visible.length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Leads"
        subtitle="All inbound leads across Suprans websites."
        actions={
          <>
            <Button onClick={() => toast.info("Add Lead — coming soon")}>
              <Plus className="size-3.5" /> Add Lead
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info("Import CSV — coming soon")}
            >
              <Upload className="size-3.5" /> Import CSV
            </Button>
            <Button variant="outline" onClick={() => downloadCsv(visible)}>
              <Download className="size-3.5" /> Export
            </Button>
          </>
        }
      />

      <KPIGrid>
        <MetricCard
          label="New"
          value={counts.new}
          icon={Inbox}
          iconTone="blue"
        />
        <MetricCard
          label="Contacted"
          value={counts.contacted}
          icon={MessageCircle}
          iconTone="amber"
        />
        <MetricCard
          label="Qualified"
          value={counts.qualified}
          icon={UserCheck}
          iconTone="emerald"
        />
        <MetricCard
          label="Converted"
          value={counts.converted}
          icon={Users}
          iconTone="violet"
        />
      </KPIGrid>

      <FilterBar
        search={{
          value: q,
          onChange: setQ,
          placeholder: "Search name, email, phone...",
        }}
        tabs={[
          { id: "all", label: "All", count: counts.total },
          { id: "new", label: "New", count: counts.new },
          { id: "contacted", label: "Contacted", count: counts.contacted },
          { id: "qualified", label: "Qualified", count: counts.qualified },
          {
            id: "disqualified",
            label: "Disqualified",
            count: counts.disqualified,
          },
          { id: "converted", label: "Converted", count: counts.converted },
        ]}
        activeTab={tab}
        onTabChange={(id) => setTab(id as TabId)}
        right={
          <>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All source sites</option>
              {distinctSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">Anyone</option>
              <option value="__unassigned">Unassigned</option>
              {distinctAssignees.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                disabled={selected.size === 0}
                onClick={() => setBulkOpen((v) => !v)}
              >
                Assign to… ({selected.size})
              </Button>
              {bulkOpen && selected.size > 0 && (
                <div className="absolute right-0 top-full mt-1 z-20 w-64 rounded-lg border bg-popover p-3 shadow-lg">
                  <label className="text-xs font-medium text-muted-foreground">
                    Assignee (email or name)
                  </label>
                  <input
                    type="text"
                    value={bulkAssignee}
                    onChange={(e) => setBulkAssignee(e.target.value)}
                    placeholder="admin@suprans"
                    className="mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBulkOpen(false)
                        setBulkAssignee("")
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={!bulkAssignee.trim()}
                      onClick={bulkAssign}
                    >
                      Assign
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        }
      />

      <DetailCard title="Inbox">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading leads…
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No leads"
            description={
              leads.length === 0
                ? "No leads have been captured yet."
                : "No leads match your current filters."
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border/80">
                <tr className="text-left">
                  <th className="px-4 py-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Phone
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Source Site
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Source Page
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    UTM Campaign
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    UTM Source
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Assigned To
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {visible.map((l) => {
                  const isSelected = selected.has(l.id)
                  return (
                    <tr
                      key={l.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => setActiveLeadId(l.id)}
                    >
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(l.id)}
                          aria-label={`Select ${l.name ?? l.email ?? "lead"}`}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                        {l.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {l.email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">
                        {l.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {l.source_site ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[16rem] truncate">
                        {l.source_page ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {l.utm_campaign ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {l.utm_source ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {relativeTime(l.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={STATUS_TONE[l.status] ?? "slate"}>
                          {STATUS_LABEL[l.status] ?? l.status}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {l.assigned_to ?? "—"}
                      </td>
                      <td
                        className="px-4 py-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1 justify-end">
                          {l.status !== "contacted" && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => setStatus(l.id, "contacted")}
                            >
                              Mark Contacted
                            </Button>
                          )}
                          {l.status !== "qualified" && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => setStatus(l.id, "qualified")}
                            >
                              <UserCheck className="size-3" />
                              Qualify
                            </Button>
                          )}
                          {l.status !== "disqualified" && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => setStatus(l.id, "disqualified")}
                            >
                              <UserMinus className="size-3" />
                              Disqualify
                            </Button>
                          )}
                          {l.status !== "converted" && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => setStatus(l.id, "converted")}
                            >
                              <UserPlus className="size-3" />
                              Convert
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>

      <EditDrawer
        open={!!activeLead}
        onClose={() => setActiveLeadId(null)}
        title={activeLead?.name ?? "Lead"}
        subtitle={activeLead?.email ?? undefined}
        size="lg"
        footer={
          activeLead && (
            <>
              {activeLead.phone && (
                <a
                  href={`https://wa.me/${activeLead.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 h-8 rounded-md border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted transition-colors"
                >
                  <MessageCircle className="size-3.5" /> Send WhatsApp
                </a>
              )}
              <Button
                size="sm"
                onClick={() => setActiveLeadId(null)}
              >
                Close
              </Button>
            </>
          )
        }
      >
        {activeLead && (
          <div className="space-y-5">
            <div className="rounded-lg border border-border/80 divide-y">
              <div className="px-4">
                <InfoRow label="Name" value={activeLead.name ?? "—"} />
              </div>
              <div className="px-4">
                <InfoRow label="Email" value={activeLead.email ?? "—"} />
              </div>
              <div className="px-4">
                <InfoRow label="Phone" value={activeLead.phone ?? "—"} />
              </div>
              <div className="px-4">
                <InfoRow
                  label="Status"
                  value={
                    <StatusBadge tone={STATUS_TONE[activeLead.status] ?? "slate"}>
                      {STATUS_LABEL[activeLead.status] ?? activeLead.status}
                    </StatusBadge>
                  }
                />
              </div>
              <div className="px-4">
                <InfoRow
                  label="Assigned to"
                  value={activeLead.assigned_to ?? "Unassigned"}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border/80 divide-y">
              <div className="px-4">
                <InfoRow
                  label="Source site"
                  value={activeLead.source_site ?? "—"}
                />
              </div>
              <div className="px-4">
                <InfoRow
                  label="Source page"
                  value={activeLead.source_page ?? "—"}
                />
              </div>
              <div className="px-4">
                <InfoRow
                  label="UTM campaign"
                  value={activeLead.utm_campaign ?? "—"}
                />
              </div>
              <div className="px-4">
                <InfoRow
                  label="UTM source"
                  value={activeLead.utm_source ?? "—"}
                />
              </div>
              <div className="px-4">
                <InfoRow
                  label="UTM medium"
                  value={activeLead.utm_medium ?? "—"}
                />
              </div>
              <div className="px-4">
                <InfoRow
                  label="Captured"
                  value={formatDateTime(activeLead.created_at)}
                />
              </div>
            </div>

            {activeLead.message && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Original message
                </div>
                <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                  {activeLead.message}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notes
                </span>
                <span className="text-xs text-muted-foreground">
                  Saves on blur
                </span>
              </div>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onBlur={() => saveNotes(activeLead.id, noteDraft)}
                placeholder="Add internal notes, status context, next steps…"
                rows={5}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatus(activeLead.id, "contacted")}
              >
                Mark Contacted
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatus(activeLead.id, "qualified")}
              >
                <UserCheck className="size-3.5" /> Qualify
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatus(activeLead.id, "disqualified")}
              >
                <UserMinus className="size-3.5" /> Disqualify
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatus(activeLead.id, "converted")}
              >
                <UserPlus className="size-3.5" /> Convert
              </Button>
            </div>
          </div>
        )}
      </EditDrawer>
    </div>
  )
}
