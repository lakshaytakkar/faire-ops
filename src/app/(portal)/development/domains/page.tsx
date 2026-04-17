import { Globe, Clock, AlertTriangle, List, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Domains — Development | Suprans" }

interface DomainRow {
  id: string
  domain: string | null
  project_id: string | null
  venture_slug: string | null
  status: string | null
  registrar: string | null
  expiry_date: string | null
  ssl_valid: boolean | null
  notes: string | null
}

interface ProjectRow {
  id: string
  name: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

function expiryTone(expiry: string | null): StatusTone {
  if (!expiry) return "slate"
  const delta = new Date(expiry).getTime() - Date.now()
  if (Number.isNaN(delta)) return "slate"
  if (delta < 0) return "red"
  if (delta < 60 * DAY_MS) return "amber"
  return "emerald"
}

function expiryLabel(expiry: string | null): string {
  if (!expiry) return "unknown"
  const delta = new Date(expiry).getTime() - Date.now()
  if (Number.isNaN(delta)) return "unknown"
  if (delta < 0) return "expired"
  if (delta < 60 * DAY_MS) return "expiring"
  return "active"
}

export default async function DomainsPage() {
  const [domainsRes, projectsRes] = await Promise.all([
    supabase
      .from("domains")
      .select(
        "id, domain, project_id, venture_slug, status, registrar, expiry_date, ssl_valid, notes",
      )
      .order("domain", { ascending: true }),
    supabase.from("projects").select("id, name"),
  ])

  const domains = (domainsRes.data ?? []) as DomainRow[]
  const projects = (projectsRes.data ?? []) as ProjectRow[]
  const projectName = new Map(projects.map((p) => [p.id, p.name ?? "—"]))

  const now = Date.now()
  const expired = domains.filter(
    (d) => d.expiry_date && new Date(d.expiry_date).getTime() < now,
  ).length
  const expiringSoon = domains.filter((d) => {
    if (!d.expiry_date) return false
    const t = new Date(d.expiry_date).getTime()
    return t >= now && t - now < 60 * DAY_MS
  }).length
  const active = domains.filter((d) => {
    if (!d.expiry_date) return (d.status ?? "").toLowerCase() === "active"
    return new Date(d.expiry_date).getTime() - now >= 60 * DAY_MS
  }).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Domains"
        subtitle="Every domain pointing at a faire-ops property."
        actions={
          <Button size="sm" disabled>
            + Add domain
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard label="Active" value={active} icon={Globe} iconTone="emerald" />
        <MetricCard
          label="Expiring soon"
          value={expiringSoon}
          icon={Clock}
          iconTone="amber"
          hint="within 60 days"
        />
        <MetricCard label="Expired" value={expired} icon={AlertTriangle} iconTone="red" />
        <MetricCard label="Total" value={domains.length} icon={List} iconTone="blue" />
      </KPIGrid>

      <DetailCard title={`All domains (${domains.length})`}>
        {domains.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="No domains yet"
            description="Register a domain in GoDaddy and link it to a project here."
            action={
              <Button size="sm" disabled>
                Add first domain
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Venture</TableHead>
                  <TableHead>Registrar</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>SSL</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((d) => {
                  const tone = expiryTone(d.expiry_date)
                  const label = expiryLabel(d.expiry_date)
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        {d.domain ? (
                          <a
                            href={`https://${d.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                          >
                            {d.domain}
                            <ExternalLink className="size-3 text-muted-foreground" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {d.project_id ? projectName.get(d.project_id) ?? "—" : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.venture_slug ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">{d.registrar ?? "—"}</TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {formatDate(d.expiry_date)}
                      </TableCell>
                      <TableCell>
                        {d.ssl_valid === null ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : d.ssl_valid ? (
                          <StatusBadge tone="emerald">valid</StatusBadge>
                        ) : (
                          <StatusBadge tone="red">invalid</StatusBadge>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={tone}>{label}</StatusBadge>
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
