"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  FileCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { supabaseHq } from "@/lib/supabase"
import { formatDate } from "@/lib/format"

// HQ → Compliance → Filings (list). See suprans-hq-full-spec.md §8.3 and
// SPACE_PATTERN.md §3. Client component so the Mark Filed popover can
// write back to hq.filings in place.

interface FilingRow {
  id: string
  entity_id: string | null
  filing_type: string | null
  period: string | null
  due_date: string | null
  filed_date: string | null
  status: string | null
  filed_by: string | null
  documents_url: string | null
  notes: string | null
}

interface EntityOption {
  id: string
  name: string
}

function dueTone(filing: FilingRow, today: number): "text-red-600" | "text-amber-700" | "" {
  if (filing.status === "filed") return ""
  if (!filing.due_date) return ""
  const due = new Date(filing.due_date).getTime()
  if (due < today) return "text-red-600"
  const diffDays = (due - today) / (24 * 60 * 60 * 1000)
  if (diffDays <= 30) return "text-amber-700"
  return ""
}

function deriveStatus(f: FilingRow, today: number): string {
  if (f.status === "filed") return "filed"
  if (!f.due_date) return f.status ?? "upcoming"
  const due = new Date(f.due_date).getTime()
  if (due < today) return "overdue"
  return f.status ?? "upcoming"
}

export default function HqFilingsPage() {
  const [filings, setFilings] = useState<FilingRow[]>([])
  const [entities, setEntities] = useState<EntityOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters.
  const [q, setQ] = useState("")
  const [statusTab, setStatusTab] = useState("all")
  const [entityFilter, setEntityFilter] = useState("all")
  const [dueIn, setDueIn] = useState<"all" | "30" | "60">("all")

  // Mark Filed popover.
  const [popoverRow, setPopoverRow] = useState<string | null>(null)
  const [popoverDate, setPopoverDate] = useState<string>("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [fRes, eRes] = await Promise.all([
        supabaseHq
          .from("filings")
          .select(
            "id, entity_id, filing_type, period, due_date, filed_date, status, filed_by, documents_url, notes",
          )
          .order("due_date", { ascending: true }),
        supabaseHq
          .from("entities")
          .select("id, name")
          .order("name", { ascending: true }),
      ])
      if (cancelled) return
      if (fRes.error) setError(fRes.error.message)
      setFilings((fRes.data ?? []) as FilingRow[])
      setEntities(
        ((eRes.data ?? []) as Array<{ id: string; name: string | null }>).map((e) => ({
          id: e.id,
          name: e.name ?? "—",
        })),
      )
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [])

  const entityNameById = useMemo(
    () => new Map(entities.map((e) => [e.id, e.name])),
    [entities],
  )

  const counts = useMemo(() => {
    const now = today
    let upcoming = 0
    let pending = 0
    let filedThisYear = 0
    let overdue = 0
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime()
    for (const f of filings) {
      const s = deriveStatus(f, now)
      if (s === "overdue") overdue++
      else if (s === "filed") {
        if (f.filed_date && new Date(f.filed_date).getTime() >= yearStart) filedThisYear++
      } else if (s === "pending") pending++
      else if (s === "upcoming") upcoming++
    }
    return { upcoming, pending, filedThisYear, overdue }
  }, [filings, today])

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase()
    return filings.filter((f) => {
      if (entityFilter !== "all" && f.entity_id !== entityFilter) return false
      const s = deriveStatus(f, today)
      if (statusTab !== "all" && s !== statusTab) return false
      if (dueIn !== "all" && f.due_date) {
        const due = new Date(f.due_date).getTime()
        const max = today + parseInt(dueIn, 10) * 24 * 60 * 60 * 1000
        if (due < today || due > max) return false
      }
      if (qLower) {
        const entityName = f.entity_id ? entityNameById.get(f.entity_id) ?? "" : ""
        const hay = `${f.filing_type ?? ""} ${f.period ?? ""} ${entityName}`.toLowerCase()
        if (!hay.includes(qLower)) return false
      }
      return true
    })
  }, [filings, q, statusTab, entityFilter, dueIn, today, entityNameById])

  const tabs: FilterTab[] = [
    { id: "all", label: "All", count: filings.length },
    { id: "upcoming", label: "Upcoming", count: counts.upcoming },
    { id: "pending", label: "Pending", count: counts.pending },
    { id: "filed", label: "Filed", count: counts.filedThisYear },
    { id: "overdue", label: "Overdue", count: counts.overdue },
  ]

  async function markFiled(id: string) {
    if (!popoverDate) return
    setSaving(true)
    const { error: updErr } = await supabaseHq
      .from("filings")
      .update({
        status: "filed",
        filed_date: popoverDate,
        filed_by: "admin@suprans",
      })
      .eq("id", id)
    if (updErr) {
      setError(updErr.message)
    } else {
      setFilings((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: "filed", filed_date: popoverDate, filed_by: "admin@suprans" }
            : f,
        ),
      )
    }
    setSaving(false)
    setPopoverRow(null)
    setPopoverDate("")
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Filings"
        subtitle="Statutory filings across every entity."
        actions={
          <Button variant="outline" size="sm" disabled>
            + Add Filing
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard label="Upcoming" value={counts.upcoming} icon={Clock} iconTone="blue" />
        <MetricCard label="Pending" value={counts.pending} icon={FileCheck} iconTone="amber" />
        <MetricCard
          label="Filed (this year)"
          value={counts.filedThisYear}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard label="Overdue" value={counts.overdue} icon={AlertTriangle} iconTone="red" />
      </KPIGrid>

      <FilterBar
        search={{
          value: q,
          onChange: setQ,
          placeholder: "Search filing or entity…",
        }}
        tabs={tabs}
        activeTab={statusTab}
        onTabChange={setStatusTab}
        right={
          <>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-md border border-input bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All entities</option>
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              {(["all", "30", "60"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDueIn(v)}
                  className={`h-7 px-2.5 text-xs font-medium rounded-md transition-colors ${
                    dueIn === v
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {v === "all" ? "Any due" : `Due ≤${v}d`}
                </button>
              ))}
            </div>
          </>
        }
      />

      <DetailCard title="All filings">
        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <EmptyState icon={Inbox} title="Loading filings…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileCheck}
            title="No filings match"
            description="Try clearing filters or changing the status tab."
          />
        ) : (
          <div className="relative">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Filing Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Filed Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Filed By</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => {
                  const status = deriveStatus(f, today)
                  const tone = dueTone(f, today)
                  const entityName = f.entity_id
                    ? entityNameById.get(f.entity_id) ?? "—"
                    : "—"
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="text-sm">{entityName}</TableCell>
                      <TableCell>
                        <Link
                          href={`/hq/compliance/filings/${f.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {f.filing_type ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{f.period ?? "—"}</TableCell>
                      <TableCell className={`text-sm font-medium ${tone}`}>
                        {formatDate(f.due_date)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(f.filed_date)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={toneForStatus(status)}>{status}</StatusBadge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {f.filed_by ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {f.documents_url ? (
                          <a
                            href={f.documents_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            Open <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right relative">
                        <button
                          type="button"
                          onClick={() => {
                            setPopoverRow((prev) => (prev === f.id ? null : f.id))
                            setPopoverDate(new Date().toISOString().slice(0, 10))
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                          aria-label="Row actions"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                        {popoverRow === f.id && (
                          <div className="absolute right-2 top-9 z-20 w-60 rounded-md border bg-card p-3 text-left shadow-lg">
                            {f.status === "filed" ? (
                              <div className="text-xs text-muted-foreground">
                                Already marked filed on {formatDate(f.filed_date)}.
                              </div>
                            ) : (
                              <>
                                <label className="block text-xs font-medium mb-1">
                                  Filed date
                                </label>
                                <input
                                  type="date"
                                  value={popoverDate}
                                  onChange={(e) => setPopoverDate(e.target.value)}
                                  className="w-full h-8 px-2 text-sm rounded border border-input bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                                <div className="flex items-center justify-end gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPopoverRow(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => markFiled(f.id)}
                                    disabled={saving || !popoverDate}
                                  >
                                    {saving ? "Saving…" : "Mark Filed"}
                                  </Button>
                                </div>
                              </>
                            )}
                            <div className="mt-3 border-t pt-2 space-y-1">
                              <button
                                type="button"
                                disabled
                                className="block w-full text-left text-xs text-muted-foreground py-1 opacity-60 cursor-not-allowed"
                              >
                                Upload Document (soon)
                              </button>
                              <button
                                type="button"
                                disabled
                                className="block w-full text-left text-xs text-muted-foreground py-1 opacity-60 cursor-not-allowed"
                              >
                                Add Note (soon)
                              </button>
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
