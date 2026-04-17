import Link from "next/link"
import { KeyRound, AlertTriangle, Shield, FileLock2 } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const metadata = { title: "Vault pointers — Development | Suprans" }

interface VaultRefRow {
  id: string
  label: string | null
  category: string | null
  vault_service: string | null
  vault_item_ref: string | null
  project_id: string | null
  integration_id: string | null
  notes: string | null
}

interface ProjectLite {
  id: string
  name: string | null
  slug: string | null
}

interface IntegrationLite {
  id: string
  name: string | null
  key: string | null
}

type SearchParams = { category?: string }

const CATEGORIES = ["all", "db", "api-key", "oauth", "ssh", "other"] as const

const CATEGORY_TONE: Record<string, StatusTone> = {
  db: "blue",
  "api-key": "violet",
  oauth: "emerald",
  ssh: "amber",
  other: "slate",
}

function chipHref(base: string, key: string) {
  return key === "all" ? base : `${base}?category=${encodeURIComponent(key)}`
}

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const activeCategory = sp.category ?? "all"

  const [refsRes, projectsRes, integrationsRes] = await Promise.all([
    supabase
      .from("vault_refs")
      .select(
        "id, label, category, vault_service, vault_item_ref, project_id, integration_id, notes",
      )
      .order("label", { ascending: true }),
    supabase.from("projects").select("id, name, slug"),
    supabase.from("integrations").select("id, name, key"),
  ])

  const refs = (refsRes.data ?? []) as VaultRefRow[]
  const projects = (projectsRes.data ?? []) as ProjectLite[]
  const integrations = (integrationsRes.data ?? []) as IntegrationLite[]

  const projectMap = new Map(projects.map((p) => [p.id, p.name ?? p.slug ?? "—"]))
  const integrationMap = new Map(
    integrations.map((i) => [i.id, i.name ?? i.key ?? "—"]),
  )

  const total = refs.length
  const byService = (name: string) =>
    refs.filter((r) => (r.vault_service ?? "").toLowerCase() === name.toLowerCase()).length

  const count1Password = byService("1password")
  const countBitwarden = byService("bitwarden")
  const countEnvLocal = refs.filter((r) => {
    const s = (r.vault_service ?? "").toLowerCase()
    return s === ".env.local" || s === "env.local" || s === "env-local"
  }).length

  const categoryCounts: Record<string, number> = {
    all: refs.length,
    db: refs.filter((r) => r.category === "db").length,
    "api-key": refs.filter((r) => r.category === "api-key").length,
    oauth: refs.filter((r) => r.category === "oauth").length,
    ssh: refs.filter((r) => r.category === "ssh").length,
    other: refs.filter((r) => r.category === "other" || !r.category).length,
  }

  const filtered = refs.filter((r) => {
    if (activeCategory === "all") return true
    if (activeCategory === "other") return r.category === "other" || !r.category
    return r.category === activeCategory
  })

  const base = "/development/vault"

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Vault pointers"
        subtitle="Labels and references for secrets stored in 1Password / Bitwarden. No secret values live in this table."
      />

      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="size-5 shrink-0 text-red-600 mt-0.5" />
        <div className="space-y-0.5">
          <div className="text-sm font-semibold text-red-800">
            Never paste actual secrets into this page or its DB. Pointers only.
          </div>
          <p className="text-sm text-red-700">
            Every row is a label that points to a secret kept in your password manager.
            If you see an actual password, token, or private key here, remove it immediately.
          </p>
        </div>
      </div>

      <KPIGrid>
        <MetricCard label="Total refs" value={total} icon={KeyRound} iconTone="blue" />
        <MetricCard label="1Password" value={count1Password} icon={Shield} iconTone="emerald" />
        <MetricCard label="Bitwarden" value={countBitwarden} icon={Shield} iconTone="violet" />
        <MetricCard label=".env.local" value={countEnvLocal} icon={FileLock2} iconTone="amber" />
      </KPIGrid>

      <DetailCard title={`Pointers (${filtered.length})`}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {CATEGORIES.map((c) => {
            const isActive = c === activeCategory
            const n = categoryCounts[c]
            return (
              <Link
                key={c}
                href={chipHref(base, c)}
                className={
                  isActive
                    ? "inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium"
                    : "inline-flex items-center gap-2 rounded-full bg-muted text-foreground px-3 py-1.5 text-sm font-medium hover:bg-muted/70"
                }
              >
                <span>{c === "all" ? "All" : c}</span>
                <span className="tabular-nums opacity-75">{n}</span>
              </Link>
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No vault pointers"
            description="Add a label + reference for each secret so your team can find them without DMing passwords."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Integration</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const projectName = r.project_id ? projectMap.get(r.project_id) : null
                  const integrationName = r.integration_id
                    ? integrationMap.get(r.integration_id)
                    : null
                  const cat = r.category ?? "other"
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium text-foreground">
                        {r.label ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={CATEGORY_TONE[cat] ?? "slate"}>
                          {cat}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.vault_service ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {r.vault_item_ref ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {projectName ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {integrationName ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-sm truncate">
                        {r.notes ?? "—"}
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

