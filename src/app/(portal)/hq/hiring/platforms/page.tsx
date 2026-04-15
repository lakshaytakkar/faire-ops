import Link from "next/link"
import {
  CheckCircle2,
  Wallet,
  Armchair,
  UserPlus,
  ExternalLink as ExternalLinkIcon,
} from "lucide-react"

import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus, type StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatNumber, relativeTime } from "@/lib/format"

import { PlatformRowActions } from "./platform-row-actions"

export const dynamic = "force-dynamic"
export const metadata = { title: "Job platforms — Hiring · Suprans HQ" }

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
] as const

type StatusKey = (typeof STATUS_TABS)[number]["key"]

interface PlatformRow {
  id: string
  name: string
  url: string | null
  account_email: string | null
  plan: string | null
  seats: number | null
  monthly_cost: number | string | null
  currency: string | null
  status: string
  notes: string | null
  last_synced_at: string | null
  created_at: string | null
  updated_at: string | null
}

// Platform-specific brand tone for the pill inside the "Platform" cell.
// Kept local to this page; promote to StatusBadge map only if used elsewhere.
function platformTone(name: string | null | undefined): StatusTone {
  if (!name) return "slate"
  const key = name.toLowerCase()
  if (key.includes("naukri")) return "blue"
  if (key.includes("workindia")) return "amber"
  if (key.includes("internshala")) return "emerald"
  if (key.includes("indeed")) return "violet"
  if (key.includes("linkedin")) return "blue"
  if (key.includes("direct") || key.includes("referral")) return "slate"
  return "slate"
}

function currencySymbol(code: string | null | undefined): string {
  if (!code) return "₹"
  const c = code.toUpperCase()
  if (c === "USD") return "$"
  if (c === "EUR") return "€"
  if (c === "GBP") return "£"
  return "₹"
}

export default async function HqHiringPlatformsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const activeTab: StatusKey =
    (STATUS_TABS.find((t) => t.key === sp.status)?.key ?? "all") as StatusKey

  // --- Load in parallel: all platforms + all candidate rollups + 30d count
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [platformsRes, candidateSourcesRes, recentCandidatesRes] = await Promise.all([
    supabaseHq
      .from("job_platforms")
      .select(
        "id, name, url, account_email, plan, seats, monthly_cost, currency, status, notes, last_synced_at, created_at, updated_at",
      )
      .order("monthly_cost", { ascending: false, nullsFirst: false }),
    supabaseHq.from("candidates").select("source"),
    supabaseHq
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .not("source", "is", null)
      .gte("created_at", thirtyDaysAgo),
  ])

  const allPlatforms = (platformsRes.data ?? []) as PlatformRow[]
  const candidateSources = (candidateSourcesRes.data ?? []) as {
    source: string | null
  }[]
  const recent30dCount = recentCandidatesRes.count ?? 0

  // Build sourced counts keyed by exact source name for precise match with platform.name.
  const sourcedByName = new Map<string, number>()
  for (const c of candidateSources) {
    if (!c.source) continue
    sourcedByName.set(c.source, (sourcedByName.get(c.source) ?? 0) + 1)
  }

  // KPIs — computed across ALL platforms regardless of active tab
  const activeCount = allPlatforms.filter((p) => p.status === "active").length
  const totalMonthlyCost = allPlatforms.reduce(
    (sum, p) => sum + (p.monthly_cost != null ? Number(p.monthly_cost) : 0),
    0,
  )
  const totalSeats = allPlatforms.reduce(
    (sum, p) => sum + (p.seats ?? 0),
    0,
  )

  // Tab counts + filtering
  const tabCounts: Record<StatusKey, number> = {
    all: allPlatforms.length,
    active: allPlatforms.filter((p) => p.status === "active").length,
    paused: allPlatforms.filter((p) => p.status === "paused").length,
  }

  const platforms =
    activeTab === "all"
      ? allPlatforms
      : allPlatforms.filter((p) => p.status === activeTab)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Job platforms"
        subtitle="Sourcing channels, seats, and monthly spend across every hiring platform."
        actions={
          <Button size="sm" disabled>
            + Add platform
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Active platforms"
          value={activeCount}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="Total monthly cost"
          value={formatCurrency(totalMonthlyCost, "₹")}
          icon={Wallet}
          iconTone="blue"
          hint="across all platforms"
        />
        <MetricCard
          label="Total seats"
          value={formatNumber(totalSeats)}
          icon={Armchair}
          iconTone="violet"
        />
        <MetricCard
          label="Candidates sourced (30d)"
          value={formatNumber(recent30dCount)}
          icon={UserPlus}
          iconTone="amber"
        />
      </KPIGrid>

      <DetailCard title="Connected platforms">
        {/* Chip-style status tabs — URL-driven, server-rendered */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {STATUS_TABS.map((t) => {
            const isActive = t.key === activeTab
            const href =
              t.key === "all"
                ? "/hq/hiring/platforms"
                : `/hq/hiring/platforms?status=${t.key}`
            const n = tabCounts[t.key]
            return (
              <Link
                key={t.key}
                href={href}
                className={
                  isActive
                    ? "inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium"
                    : "inline-flex items-center gap-2 rounded-full bg-muted text-foreground px-3 py-1.5 text-sm font-medium hover:bg-muted/70"
                }
              >
                <span>{t.label}</span>
                <span className="tabular-nums opacity-75">{n}</span>
              </Link>
            )
          })}
        </div>

        {platforms.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No platforms match this filter"
            description="Switch tabs or add a new sourcing platform."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Platform</th>
                  <th className="text-left px-3 py-2">Plan</th>
                  <th className="text-left px-3 py-2">Account email</th>
                  <th className="text-right px-3 py-2 tabular-nums">Seats</th>
                  <th className="text-right px-3 py-2 tabular-nums">
                    Monthly cost
                  </th>
                  <th className="text-left px-3 py-2">Currency</th>
                  <th className="text-right px-3 py-2 tabular-nums">
                    Candidates sourced
                  </th>
                  <th className="text-left px-3 py-2">Last synced</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="px-3 py-2 w-10" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {platforms.map((p) => {
                  const sourced = sourcedByName.get(p.name) ?? 0
                  const seatsLabel =
                    p.seats == null
                      ? "—"
                      : `${formatNumber(p.seats)} / ${formatNumber(p.seats)}`
                  const sym = currencySymbol(p.currency)
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge tone={platformTone(p.name)}>
                            {p.name}
                          </StatusBadge>
                          {p.url && (
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-muted-foreground hover:text-foreground"
                              aria-label={`Open ${p.name}`}
                            >
                              <ExternalLinkIcon className="size-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {p.plan ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {p.account_email ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {seatsLabel}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {p.monthly_cost == null
                          ? "—"
                          : formatCurrency(Number(p.monthly_cost), sym)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {p.currency ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatNumber(sourced)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {p.last_synced_at ? relativeTime(p.last_synced_at) : "Never"}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge tone={toneForStatus(p.status)}>
                          {p.status}
                        </StatusBadge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <PlatformRowActions
                          platform={{
                            id: p.id,
                            name: p.name,
                            plan: p.plan,
                            seats: p.seats,
                            monthly_cost: p.monthly_cost,
                            url: p.url,
                            account_email: p.account_email,
                            status: p.status,
                          }}
                        />
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
