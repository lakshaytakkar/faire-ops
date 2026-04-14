"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Check,
  FileText,
  Paperclip,
  Plus,
  Receipt,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { FilterBar } from "@/components/shared/filter-bar"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/format"
import { supabaseHq } from "@/lib/supabase"

export const dynamic = "force-dynamic"

/**
 * Expenses (`/hq/finance/expenses`) — spec §3.3.
 *
 * Status values: pending_approval | approved | rejected | paid.
 * Row-level mutations: approve, reject, mark paid.
 */

type ExpenseStatus = "pending_approval" | "approved" | "rejected" | "paid"

interface ExpenseRow {
  id: string
  entity_id: string | null
  vertical: string | null
  category: string | null
  vendor: string | null
  amount: number | string | null
  currency: string | null
  payment_mode: string | null
  approved_by: string | null
  status: ExpenseStatus
  paid_at: string | null
  receipt_url: string | null
  created_at?: string | null
}

type TabId = "all" | "pending" | "approved" | "paid" | "rejected"

const STATUS_LABEL: Record<ExpenseStatus, string> = {
  pending_approval: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
}

function currencySymbol(c: string | null | undefined): string {
  if (!c) return "₹"
  const m: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "د.إ ",
  }
  return m[c.toUpperCase()] ?? `${c} `
}

function toNumber(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0
  const n = typeof v === "string" ? parseFloat(v) : v
  return Number.isFinite(n) ? n : 0
}

function startOfMonthIso(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

export default function HqExpensesPage() {
  const [rows, setRows] = useState<ExpenseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [tab, setTab] = useState<TabId>("all")
  const [verticalFilter, setVerticalFilter] = useState<string>("all")
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabaseHq
        .from("expenses")
        .select(
          "id, entity_id, vertical, category, vendor, amount, currency, payment_mode, approved_by, status, paid_at, receipt_url, created_at",
        )
        .order("created_at", { ascending: false })
      if (cancelled) return
      if (error) {
        toast.error(`Failed to load expenses: ${error.message}`)
        setRows([])
      } else {
        setRows((data ?? []) as ExpenseRow[])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const monthStart = startOfMonthIso()

  const counts = useMemo(() => {
    let pending = 0
    let approvedThisMonth = 0
    let paidMtd = 0
    const byVerticalPaidMtd = new Map<string, number>()
    const tabCounts = {
      all: rows.length,
      pending: 0,
      approved: 0,
      paid: 0,
      rejected: 0,
    }
    for (const r of rows) {
      if (r.status === "pending_approval") pending++
      if (r.status === "pending_approval") tabCounts.pending++
      else if (r.status === "approved") tabCounts.approved++
      else if (r.status === "paid") tabCounts.paid++
      else if (r.status === "rejected") tabCounts.rejected++

      const createdAt = r.created_at ?? null
      if (
        r.status === "approved" &&
        createdAt &&
        createdAt >= monthStart
      ) {
        approvedThisMonth++
      }
      if (r.status === "paid" && r.paid_at && r.paid_at >= monthStart) {
        const amt = toNumber(r.amount)
        paidMtd += amt
        const v = r.vertical ?? "unknown"
        byVerticalPaidMtd.set(v, (byVerticalPaidMtd.get(v) ?? 0) + amt)
      }
    }
    const topVertical = Array.from(byVerticalPaidMtd.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0]
    return {
      pending,
      approvedThisMonth,
      paidMtd,
      topVertical,
      tabCounts,
    }
  }, [rows, monthStart])

  const distinctVerticals = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) if (r.vertical) set.add(r.vertical)
    return Array.from(set).sort()
  }, [rows])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (tab === "pending" && r.status !== "pending_approval") return false
      if (tab === "approved" && r.status !== "approved") return false
      if (tab === "paid" && r.status !== "paid") return false
      if (tab === "rejected" && r.status !== "rejected") return false
      if (verticalFilter !== "all" && r.vertical !== verticalFilter)
        return false
      if (needle) {
        const hay = `${r.vendor ?? ""} ${r.category ?? ""}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, q, tab, verticalFilter])

  async function updateExpense(id: string, patch: Partial<ExpenseRow>) {
    const original = rows
    setBusyId(id)
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    )
    const { error } = await supabaseHq
      .from("expenses")
      .update(patch)
      .eq("id", id)
    setBusyId(null)
    if (error) {
      setRows(original)
      toast.error(`Update failed: ${error.message}`)
      return false
    }
    return true
  }

  async function approve(id: string) {
    const ok = await updateExpense(id, {
      status: "approved",
      approved_by: "admin@suprans",
    })
    if (ok) toast.success("Expense approved")
  }

  async function reject(id: string) {
    const ok = await updateExpense(id, {
      status: "rejected",
      approved_by: "admin@suprans",
    })
    if (ok) toast.success("Expense rejected")
  }

  async function markPaid(id: string) {
    const ok = await updateExpense(id, {
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    if (ok) toast.success("Marked as paid")
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Expenses"
        subtitle="Review, approve, and track all business expenses."
        actions={
          <Button onClick={() => toast.info("Add Expense — coming soon")}>
            <Plus className="size-3.5" /> Add Expense
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Pending approval"
          value={counts.pending}
          icon={ShieldCheck}
          iconTone="amber"
        />
        <MetricCard
          label="Approved this month"
          value={counts.approvedThisMonth}
          icon={Check}
          iconTone="emerald"
        />
        <MetricCard
          label="Paid MTD"
          value={formatCurrency(counts.paidMtd)}
          icon={Wallet}
          iconTone="blue"
        />
        <MetricCard
          label="Top vertical (paid MTD)"
          value={counts.topVertical ? counts.topVertical[0] : "—"}
          hint={
            counts.topVertical
              ? formatCurrency(counts.topVertical[1])
              : undefined
          }
          icon={Receipt}
          iconTone="violet"
        />
      </KPIGrid>

      <FilterBar
        search={{
          value: q,
          onChange: setQ,
          placeholder: "Search vendor or category...",
        }}
        tabs={[
          { id: "all", label: "All", count: counts.tabCounts.all },
          { id: "pending", label: "Pending", count: counts.tabCounts.pending },
          {
            id: "approved",
            label: "Approved",
            count: counts.tabCounts.approved,
          },
          { id: "paid", label: "Paid", count: counts.tabCounts.paid },
          {
            id: "rejected",
            label: "Rejected",
            count: counts.tabCounts.rejected,
          },
        ]}
        activeTab={tab}
        onTabChange={(id) => setTab(id as TabId)}
        right={
          <>
            <select
              value={verticalFilter}
              onChange={(e) => setVerticalFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All verticals</option>
              {distinctVerticals.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <span className="inline-flex h-8 items-center rounded-md border border-input bg-transparent px-2.5 text-xs text-muted-foreground">
              Last 3 months
            </span>
          </>
        }
      />

      <DetailCard title="All expenses">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading expenses…
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses"
            description={
              rows.length === 0
                ? "No expenses have been recorded yet."
                : "No expenses match your current filters."
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border/80">
                <tr className="text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Vertical
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Category
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Vendor
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Payment Mode
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Approved By
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Receipt
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {visible.map((r) => {
                  const dateVal = r.paid_at ?? r.created_at ?? null
                  const canAct = busyId !== r.id
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-muted/20 transition-colors align-top"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-foreground">
                        {formatDate(dateVal)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{r.vertical ?? "—"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.category ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {r.vendor ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-foreground">
                        {formatCurrency(
                          toNumber(r.amount),
                          currencySymbol(r.currency),
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {r.payment_mode ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {r.approved_by ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={toneForStatus(r.status)}>
                          {STATUS_LABEL[r.status] ?? r.status}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        {r.receipt_url ? (
                          <a
                            href={r.receipt_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <FileText className="size-3.5" /> View
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              toast.info("Receipt upload — coming soon")
                            }
                            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                          >
                            <Paperclip className="size-3.5" /> Attach
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {r.status === "pending_approval" && (
                            <>
                              <Button
                                variant="outline"
                                size="xs"
                                disabled={!canAct}
                                onClick={() => approve(r.id)}
                              >
                                <Check className="size-3" /> Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="xs"
                                disabled={!canAct}
                                onClick={() => reject(r.id)}
                              >
                                <X className="size-3" /> Reject
                              </Button>
                            </>
                          )}
                          {r.status === "approved" && (
                            <Button
                              variant="outline"
                              size="xs"
                              disabled={!canAct}
                              onClick={() => markPaid(r.id)}
                            >
                              <Wallet className="size-3" /> Mark paid
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
    </div>
  )
}
