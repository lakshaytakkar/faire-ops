import Link from "next/link"
import { Globe, CheckCircle2, Inbox, CalendarRange } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { supabaseHq } from "@/lib/supabase"
import { relativeTime, formatNumber } from "@/lib/format"

// HQ → Sites → Overview (spec §7.1). Server component — one card per
// Suprans domain with uptime, leads MTD, and last-deploy recency.
// site_traffic_snapshots is currently empty, so sessions-today reads 0
// as a placeholder until GA4 ingestion lands.

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Sites — HQ | Suprans",
}

interface SiteRow {
  id: string
  domain: string | null
  vertical: string | null
  status: string | null
  last_deployed_at: string | null
  uptime_pct_30d: number | null
}

interface SiteLeadRow {
  id: string
  site_id: string | null
  status: string | null
  created_at: string | null
}

function startOfUtcDay(d = new Date()): Date {
  const day = new Date(d)
  day.setUTCHours(0, 0, 0, 0)
  return day
}

function startOfUtcMonth(d = new Date()): Date {
  const month = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
  return month
}

async function fetchData() {
  const [sitesRes, leadsRes] = await Promise.all([
    supabaseHq
      .from("sites")
      .select(
        "id, domain, vertical, status, last_deployed_at, uptime_pct_30d",
      )
      .order("domain", { ascending: true }),
    supabaseHq
      .from("site_leads")
      .select("id, site_id, status, created_at"),
  ])

  const sites = (sitesRes.data ?? []) as SiteRow[]
  const leads = (leadsRes.data ?? []) as SiteLeadRow[]
  return { sites, leads }
}

export default async function HqSitesOverviewPage() {
  const { sites, leads } = await fetchData()

  const todayStart = startOfUtcDay().getTime()
  const monthStart = startOfUtcMonth().getTime()

  const leadsTodayTotal = leads.filter((l) => {
    if (!l.created_at) return false
    const t = new Date(l.created_at).getTime()
    return !Number.isNaN(t) && t >= todayStart
  }).length
  const leadsMtdTotal = leads.filter((l) => {
    if (!l.created_at) return false
    const t = new Date(l.created_at).getTime()
    return !Number.isNaN(t) && t >= monthStart
  }).length

  const leadsMtdBySite = new Map<string, number>()
  for (const l of leads) {
    if (!l.site_id || !l.created_at) continue
    const t = new Date(l.created_at).getTime()
    if (Number.isNaN(t) || t < monthStart) continue
    leadsMtdBySite.set(l.site_id, (leadsMtdBySite.get(l.site_id) ?? 0) + 1)
  }

  const totalSites = sites.length
  const liveSites = sites.filter(
    (s) => (s.status ?? "").toLowerCase() === "live",
  ).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Sites"
        subtitle="All Suprans domains at a glance."
      />

      <KPIGrid>
        <MetricCard
          label="Total sites"
          value={totalSites}
          icon={Globe}
          iconTone="blue"
        />
        <MetricCard
          label="Live"
          value={liveSites}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="Leads today"
          value={leadsTodayTotal}
          icon={Inbox}
          iconTone="violet"
        />
        <MetricCard
          label="Leads MTD"
          value={leadsMtdTotal}
          icon={CalendarRange}
          iconTone="amber"
        />
      </KPIGrid>

      {sites.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No sites yet"
          description="Domains will appear here once hq.sites is populated."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => {
            const domain = site.domain ?? "—"
            const uptime =
              site.uptime_pct_30d !== null && site.uptime_pct_30d !== undefined
                ? `${Number(site.uptime_pct_30d).toFixed(2)}%`
                : "—"
            const leadsMtd = site.id
              ? leadsMtdBySite.get(site.id) ?? 0
              : 0
            // TODO: /hq/sites/leads does not yet honour ?site= query param —
            // link is forward-compat so the inbox can filter by domain later.
            const href = `/hq/sites/leads?site=${encodeURIComponent(domain)}`
            return (
              <Link
                key={site.id}
                href={href}
                className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex flex-col gap-3 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[0.9375rem] font-semibold tracking-tight text-foreground truncate">
                      {domain}
                    </div>
                    {site.vertical && (
                      <div className="mt-1">
                        <StatusBadge tone="slate">{site.vertical}</StatusBadge>
                      </div>
                    )}
                  </div>
                  <StatusBadge tone={toneForStatus(site.status)}>
                    {site.status ?? "unknown"}
                  </StatusBadge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Uptime 30d</div>
                    <div className="mt-0.5 font-semibold text-foreground">
                      {uptime}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Sessions today</div>
                    <div className="mt-0.5 font-semibold text-foreground">
                      {formatNumber(0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Leads MTD</div>
                    <div className="mt-0.5 font-semibold text-foreground">
                      {formatNumber(leadsMtd)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground pt-1 border-t border-border/60">
                  Last deployed {relativeTime(site.last_deployed_at)}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
