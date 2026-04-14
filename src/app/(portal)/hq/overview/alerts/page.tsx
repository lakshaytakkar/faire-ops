"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { toast } from "sonner"
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  MoreHorizontal,
  ShieldCheck,
} from "lucide-react"

import { BackLink } from "@/components/shared/back-link"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { FilterBar } from "@/components/shared/filter-bar"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"

/**
 * Alerts (`/hq/overview/alerts`) — spec §1.4.
 *
 * Types rendered: compliance_filing | contract_expiring | visa_deadline |
 * payment_overdue | renewal_due | other.
 * Severity tones: critical=red, high=amber, medium=blue, low=slate.
 */

type AlertType =
  | "compliance_filing"
  | "contract_expiring"
  | "visa_deadline"
  | "payment_overdue"
  | "renewal_due"
  | "other"

type Severity = "low" | "medium" | "high" | "critical"

interface AlertRow {
  id: string
  alert_type: AlertType
  subject: string | null
  description: string | null
  severity: Severity
  due_date: string | null
  resolved_at: string | null
  resolved_by: string | null
}

type Tab = "open" | "resolved" | "all"

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const SEVERITY_TONE: Record<Severity, StatusTone> = {
  critical: "red",
  high: "amber",
  medium: "blue",
  low: "slate",
}

const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  compliance_filing: "Compliance filing",
  contract_expiring: "Contract expiring",
  visa_deadline: "Visa deadline",
  payment_overdue: "Payment overdue",
  renewal_due: "Renewal due",
  other: "Other",
}

// Local client bound to the `hq` schema. Kept in-file to avoid touching
// src/lib/supabase.ts while sibling agents edit it.
const supabaseHq = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  { db: { schema: "hq" } },
)

function startOfMonthIso(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

function isOverdue(due: string | null): boolean {
  if (!due) return false
  const d = new Date(due)
  if (Number.isNaN(d.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

export default function HqAlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [tab, setTab] = useState<Tab>("open")
  const [typeFilter, setTypeFilter] = useState<AlertType | "all">("all")
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabaseHq
        .from("alerts")
        .select(
          "id, alert_type, subject, description, severity, due_date, resolved_at, resolved_by",
        )
      if (cancelled) return
      if (error) {
        toast.error(`Failed to load alerts: ${error.message}`)
        setAlerts([])
      } else {
        setAlerts((data ?? []) as AlertRow[])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const monthStart = startOfMonthIso()
    return {
      critical: alerts.filter(
        (a) => a.severity === "critical" && !a.resolved_at,
      ).length,
      high: alerts.filter((a) => a.severity === "high" && !a.resolved_at).length,
      medium: alerts.filter(
        (a) => a.severity === "medium" && !a.resolved_at,
      ).length,
      resolvedThisMonth: alerts.filter(
        (a) => a.resolved_at && a.resolved_at >= monthStart,
      ).length,
      open: alerts.filter((a) => !a.resolved_at).length,
      resolved: alerts.filter((a) => !!a.resolved_at).length,
      total: alerts.length,
    }
  }, [alerts])

  const distinctTypes = useMemo(() => {
    const set = new Set<AlertType>()
    for (const a of alerts) set.add(a.alert_type)
    return Array.from(set).sort()
  }, [alerts])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return alerts
      .filter((a) => {
        if (tab === "open" && a.resolved_at) return false
        if (tab === "resolved" && !a.resolved_at) return false
        if (typeFilter !== "all" && a.alert_type !== typeFilter) return false
        if (needle) {
          const hay = `${a.subject ?? ""} ${a.description ?? ""}`.toLowerCase()
          if (!hay.includes(needle)) return false
        }
        return true
      })
      .sort((a, b) => {
        const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
        if (sev !== 0) return sev
        const da = a.due_date ? new Date(a.due_date).getTime() : Infinity
        const db = b.due_date ? new Date(b.due_date).getTime() : Infinity
        return da - db
      })
  }, [alerts, q, tab, typeFilter])

  async function markResolved(id: string) {
    const original = alerts
    const now = new Date().toISOString()
    setResolvingId(id)
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, resolved_at: now, resolved_by: "admin@suprans" }
          : a,
      ),
    )
    const { error } = await supabaseHq
      .from("alerts")
      .update({ resolved_at: now, resolved_by: "admin@suprans" })
      .eq("id", id)
    setResolvingId(null)
    if (error) {
      setAlerts(original)
      toast.error(`Could not resolve alert: ${error.message}`)
      return
    }
    toast.success("Alert resolved")
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/hq/overview" label="Overview" />

      <PageHeader
        title="Alerts"
        subtitle="Open items that need attention across the business."
      />

      <KPIGrid>
        <MetricCard
          label="Critical"
          value={counts.critical}
          icon={AlertTriangle}
          iconTone="red"
        />
        <MetricCard
          label="High"
          value={counts.high}
          icon={AlertCircle}
          iconTone="amber"
        />
        <MetricCard
          label="Medium"
          value={counts.medium}
          icon={Bell}
          iconTone="blue"
        />
        <MetricCard
          label="Resolved this month"
          value={counts.resolvedThisMonth}
          icon={Check}
          iconTone="emerald"
        />
      </KPIGrid>

      <FilterBar
        search={{
          value: q,
          onChange: setQ,
          placeholder: "Search alerts...",
        }}
        tabs={[
          { id: "open", label: "Open", count: counts.open },
          { id: "resolved", label: "Resolved", count: counts.resolved },
          { id: "all", label: "All", count: counts.total },
        ]}
        activeTab={tab}
        onTabChange={(id) => setTab(id as Tab)}
        right={
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AlertType | "all")}
            className="h-8 rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All types</option>
            {distinctTypes.map((t) => (
              <option key={t} value={t}>
                {ALERT_TYPE_LABEL[t] ?? t}
              </option>
            ))}
          </select>
        }
      />

      <DetailCard title="All alerts">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading alerts…
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nothing here"
            description={
              alerts.length === 0
                ? "No alerts have been raised yet."
                : "No alerts match your current filters."
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border/80">
                <tr className="text-left">
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Severity
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Type
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Subject
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Due date
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {visible.map((a) => {
                  const overdue = !a.resolved_at && isOverdue(a.due_date)
                  const isResolved = !!a.resolved_at
                  return (
                    <tr
                      key={a.id}
                      className="hover:bg-muted/20 transition-colors align-top"
                    >
                      <td className="px-5 py-3">
                        <StatusBadge tone={SEVERITY_TONE[a.severity]}>
                          {a.severity}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-3 text-foreground whitespace-nowrap">
                        {ALERT_TYPE_LABEL[a.alert_type] ?? a.alert_type}
                      </td>
                      <td className="px-5 py-3 font-medium text-foreground">
                        {a.subject ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground max-w-[32rem]">
                        {a.description ?? "—"}
                      </td>
                      <td
                        className={
                          overdue
                            ? "px-5 py-3 whitespace-nowrap text-red-600 font-semibold"
                            : "px-5 py-3 whitespace-nowrap text-foreground"
                        }
                      >
                        {formatDate(a.due_date)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {isResolved ? (
                            <StatusBadge tone="emerald">Resolved</StatusBadge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={resolvingId === a.id}
                              onClick={() => markResolved(a.id)}
                            >
                              <Check className="size-3.5" />
                              {resolvingId === a.id
                                ? "Resolving…"
                                : "Mark Resolved"}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled
                            aria-label="More actions"
                          >
                            <MoreHorizontal className="size-3.5" />
                          </Button>
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
    </div>
  )
}
