"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { toast } from "sonner"
import {
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Flag,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

// HQ → Assets → Licenses. Spec §5.2. Client component — the Renew/Cancel
// actions write back to hq.licenses. Schema-scoped client is built inline
// to match the sibling pattern in /hq/overview/alerts/page.tsx.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _DOCS_TITLE = "Licenses & Subscriptions — Assets | HQ | Suprans"

const LICENSE_STATUS_TONE: Record<string, StatusTone> = {
  active: "emerald",
  cancelled: "red",
  expired: "red",
  trialing: "amber",
  pending: "amber",
}

interface LicenseRow {
  id: string
  tool: string | null
  category: string | null
  login_email: string | null
  seats_total: number | null
  seats_used: number | null
  renewal_date: string | null
  monthly_cost: number | null
  annual_cost: number | null
  currency: string | null
  status: string | null
  billing_entity_id: string | null
  notes: string | null
}

const CATEGORY_OPTIONS = [
  "all",
  "SaaS",
  "Design",
  "Dev",
  "Marketing",
  "Finance",
  "HR",
  "Communication",
  "Other",
] as const

type Tab = "all" | "active" | "cancelled" | "expired" | "trialing" | "pending"

const STATUS_TABS: FilterTab[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "trialing", label: "Trialing" },
  { id: "pending", label: "Pending" },
  { id: "cancelled", label: "Cancelled" },
  { id: "expired", label: "Expired" },
]

// Schema-scoped client. Matches the pattern in /hq/overview/alerts.
const supabaseHq = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  { db: { schema: "hq" } },
)

function daysUntil(d: string | null): number | null {
  if (!d) return null
  const target = new Date(d)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}

function currencySymbol(code: string | null | undefined): string {
  if (!code) return "₹"
  const c = code.toUpperCase()
  if (c === "INR") return "₹"
  if (c === "USD") return "$"
  if (c === "EUR") return "€"
  if (c === "GBP") return "£"
  return `${c} `
}

export default function HqLicensesPage() {
  const [licenses, setLicenses] = useState<LicenseRow[]>([])
  const [entityMap, setEntityMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [tab, setTab] = useState<Tab>("all")
  const [category, setCategory] = useState<string>("all")
  const [renewingId, setRenewingId] = useState<string | null>(null)
  const [renewDate, setRenewDate] = useState<string>("")
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [licensesRes, entitiesRes] = await Promise.all([
        supabaseHq
          .from("licenses")
          .select(
            "id, tool, category, login_email, seats_total, seats_used, renewal_date, monthly_cost, annual_cost, currency, status, billing_entity_id, notes",
          )
          .order("renewal_date", { ascending: true, nullsFirst: false }),
        supabaseHq.from("entities").select("id, name"),
      ])
      if (cancelled) return
      if (licensesRes.error) {
        toast.error(`Failed to load licenses: ${licensesRes.error.message}`)
        setLicenses([])
      } else {
        setLicenses((licensesRes.data ?? []) as LicenseRow[])
      }
      const emap: Record<string, string> = {}
      for (const row of (entitiesRes.data ?? []) as Array<{
        id: string
        name: string | null
      }>) {
        if (row.id) emap[row.id] = row.name ?? ""
      }
      setEntityMap(emap)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const kpis = useMemo(() => {
    const active = licenses.filter((l) => l.status === "active").length
    const within30 = licenses.filter((l) => {
      const d = daysUntil(l.renewal_date)
      return d !== null && d >= 0 && d <= 30
    }).length
    const within90 = licenses.filter((l) => {
      const d = daysUntil(l.renewal_date)
      return d !== null && d >= 0 && d <= 90
    }).length
    const underused = licenses.filter((l) => {
      const total = l.seats_total ?? 0
      const used = l.seats_used ?? 0
      if (total <= 0) return false
      return (total - used) / total > 0.5
    }).length
    return { active, within30, within90, underused }
  }, [licenses])

  const tabCounts = useMemo(() => {
    return {
      all: licenses.length,
      active: licenses.filter((l) => l.status === "active").length,
      trialing: licenses.filter((l) => l.status === "trialing").length,
      pending: licenses.filter((l) => l.status === "pending").length,
      cancelled: licenses.filter((l) => l.status === "cancelled").length,
      expired: licenses.filter((l) => l.status === "expired").length,
    }
  }, [licenses])

  const tabs: FilterTab[] = STATUS_TABS.map((t) => ({
    ...t,
    count: tabCounts[t.id as Tab],
  }))

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return licenses.filter((l) => {
      if (tab !== "all" && l.status !== tab) return false
      if (category !== "all" && l.category !== category) return false
      if (needle) {
        const hay = `${l.tool ?? ""} ${l.login_email ?? ""} ${l.category ?? ""}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [licenses, q, tab, category])

  async function handleRenew(id: string) {
    if (!renewDate) {
      toast.error("Pick a new renewal date first")
      return
    }
    const original = licenses
    setSavingId(id)
    setLicenses((prev) =>
      prev.map((l) => (l.id === id ? { ...l, renewal_date: renewDate } : l)),
    )
    const { error } = await supabaseHq
      .from("licenses")
      .update({ renewal_date: renewDate })
      .eq("id", id)
    setSavingId(null)
    setRenewingId(null)
    setRenewDate("")
    if (error) {
      setLicenses(original)
      toast.error(`Could not update renewal: ${error.message}`)
      return
    }
    toast.success("Renewal date updated")
  }

  async function handleCancel(id: string) {
    const original = licenses
    setSavingId(id)
    setLicenses((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: "cancelled" } : l)),
    )
    const { error } = await supabaseHq
      .from("licenses")
      .update({ status: "cancelled" })
      .eq("id", id)
    setSavingId(null)
    if (error) {
      setLicenses(original)
      toast.error(`Could not cancel: ${error.message}`)
      return
    }
    toast.success("License cancelled")
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Licenses & Subscriptions"
        subtitle="SaaS tools, seat allocations, and renewal windows."
        actions={
          <Button size="sm" disabled>
            + Add License
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Active"
          value={kpis.active}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="Renewal ≤ 30d"
          value={kpis.within30}
          icon={AlertTriangle}
          iconTone="amber"
        />
        <MetricCard
          label="Renewal ≤ 90d"
          value={kpis.within90}
          icon={Clock}
          iconTone="blue"
        />
        <MetricCard
          label="Unused seats > 50%"
          value={kpis.underused}
          icon={Flag}
          iconTone="slate"
        />
      </KPIGrid>

      <FilterBar
        search={{
          value: q,
          onChange: setQ,
          placeholder: "Search tool, email, or category…",
        }}
        tabs={tabs}
        activeTab={tab}
        onTabChange={(id) => setTab(id as Tab)}
        right={
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-8 px-2.5 text-xs rounded-md border border-input bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All categories" : c}
              </option>
            ))}
          </select>
        }
      />

      <DetailCard title="All licenses">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title={
              licenses.length === 0 ? "No licenses yet" : "No licenses match"
            }
            description={
              licenses.length === 0
                ? "Add your first subscription to track renewals and seats."
                : "Try clearing filters or searching for another tool."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Login Email</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Annual</TableHead>
                <TableHead>Billing Entity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((l) => {
                const days = daysUntil(l.renewal_date)
                const renewalExpired = days !== null && days < 0
                const renewalSoon =
                  days !== null && days >= 0 && days <= 30
                const seatsTotal = l.seats_total ?? 0
                const seatsUsed = l.seats_used ?? 0
                const seatsPct =
                  seatsTotal > 0
                    ? Math.min(100, Math.round((seatsUsed / seatsTotal) * 100))
                    : 0
                const underused =
                  seatsTotal > 0 &&
                  (seatsTotal - seatsUsed) / seatsTotal > 0.5
                const sym = currencySymbol(l.currency)
                const entityName = l.billing_entity_id
                  ? entityMap[l.billing_entity_id] ?? "—"
                  : "—"
                return (
                  <TableRow
                    key={l.id}
                    className={cn(
                      "cursor-pointer",
                      renewalExpired && "bg-red-50/40",
                      !renewalExpired && renewalSoon && "bg-amber-50/40",
                    )}
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/hq/assets/licenses/${l.id}`}
                        className="text-foreground hover:underline"
                      >
                        {l.tool ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{l.category ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {l.login_email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <span className="text-xs font-medium tabular-nums">
                          {seatsUsed}/{seatsTotal}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full",
                              seatsPct >= 90
                                ? "bg-red-500"
                                : seatsPct >= 70
                                  ? "bg-amber-500"
                                  : "bg-emerald-500",
                            )}
                            style={{ width: `${seatsPct}%` }}
                          />
                        </div>
                        {underused && (
                          <Flag
                            className="size-3.5 text-muted-foreground"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-sm",
                        renewalExpired && "text-red-700 font-medium",
                        !renewalExpired && renewalSoon && "text-amber-700 font-medium",
                      )}
                    >
                      {formatDate(l.renewal_date)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatCurrency(l.monthly_cost, sym)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatCurrency(l.annual_cost, sym)}
                    </TableCell>
                    <TableCell className="text-sm">{entityName}</TableCell>
                    <TableCell>
                      {l.status ? (
                        <StatusBadge tone={LICENSE_STATUS_TONE[l.status] ?? "slate"}>
                          {l.status}
                        </StatusBadge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1.5 relative">
                        {renewingId === l.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="date"
                              value={renewDate}
                              onChange={(e) => setRenewDate(e.target.value)}
                              className="h-7 px-1.5 text-xs rounded-md border border-input bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={savingId === l.id}
                              onClick={() => handleRenew(l.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRenewingId(null)
                                setRenewDate("")
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRenewingId(l.id)
                                setRenewDate(l.renewal_date ?? "")
                              }}
                            >
                              Renew
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={savingId === l.id || l.status === "cancelled"}
                              onClick={() => handleCancel(l.id)}
                            >
                              Cancel
                            </Button>
                            <Button size="sm" variant="ghost" disabled>
                              Reassign
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </DetailCard>
    </div>
  )
}
