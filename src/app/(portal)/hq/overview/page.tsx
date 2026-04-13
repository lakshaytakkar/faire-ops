import Link from "next/link"
import {
  Building2,
  Users,
  Briefcase,
  Scale,
  Plane,
  Package,
  ShoppingBag,
  Layers,
  ArrowRight,
  ArrowUpRight,
  Wallet,
  Target,
  BookOpen,
  ShieldCheck,
  LineChart,
  FolderKanban,
} from "lucide-react"
import { supabase, supabaseB2B } from "@/lib/supabase"
import { listSpaces, type Space } from "@/lib/spaces"
import {
  listProjects,
  listChecklistFor,
  summarizeChecklist,
} from "@/lib/projects"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Suprans HQ — Overview",
  description:
    "Company-tier command center. All-hands, ventures portfolio, people, finance, projects, compliance.",
}

/**
 * Suprans HQ / Overview — the company-tier landing page.
 *
 * This is explicitly distinct from /overview (which is scoped to the B2B
 * Ecommerce venture). HQ is the top-of-hierarchy workspace per the locked
 * architecture in docs/ARCHITECTURE.md and memory/project_architecture_suprans.md:
 *
 *   - kind=company (only one). Houses cross-venture views only.
 *   - Shows team totals, portfolio progress, combined revenue, active projects.
 *   - Sub-sections (People, Finance, Projects, Compliance) live at /hq/*.
 *
 * Coming-soon items render as subtle dashed tiles so the landing never looks
 * half-empty as the HQ space is filled out.
 */

const SPACE_ICON: Record<string, typeof ShoppingBag> = {
  "b2b-ecommerce": ShoppingBag,
  "hq": Building2,
  "legal": Scale,
  "goyo": Plane,
  "usdrop": Package,
  "eazysell": Layers,
  "toysinbulk": Layers,
  "suprans-app": Briefcase,
}

interface VentureCard {
  space: Space
  projectProgress: number | null
  projectCount: number
}

async function fetchTeamMemberCount(): Promise<number> {
  try {
    const { count } = await supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
    return count ?? 0
  } catch {
    return 0
  }
}

async function fetchCompanyRevenueCents(): Promise<number> {
  try {
    // faire_store_revenue(p_start=null) returns revenue per store across all
    // orders. Summed across stores = cross-venture revenue for B2B today.
    const { data } = await supabaseB2B.rpc("faire_store_revenue", {
      p_start: null,
    })
    if (!data) return 0
    let total = 0
    for (const row of data as Array<{ revenue_cents: number | string }>) {
      total += Number(row.revenue_cents ?? 0)
    }
    return total
  } catch {
    return 0
  }
}

function formatMoney(cents: number): string {
  if (cents === 0) return "—"
  const dollars = cents / 100
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`
  return `$${dollars.toFixed(0)}`
}

function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tint,
}: {
  label: string
  value: string | number
  sublabel?: string
  icon: typeof Users
  tint: string
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div
          className="h-8 w-8 rounded-md flex items-center justify-center ring-1 ring-black/[0.04]"
          style={{
            background: `linear-gradient(135deg, ${tint}26, ${tint}10)`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color: tint }} />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold font-heading text-foreground tabular-nums">
        {value}
      </p>
      {sublabel && (
        <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
      )}
    </div>
  )
}

export default async function HqOverviewPage() {
  const [spaces, teamCount, revenueCents, projects] = await Promise.all([
    listSpaces(),
    fetchTeamMemberCount(),
    fetchCompanyRevenueCents(),
    listProjects(),
  ])

  // Group projects by brand so each venture can show its portfolio progress
  const checklists = await listChecklistFor(projects.map((p) => p.id))
  const progressByBrand = new Map<string, { items: number; done: number; count: number }>()
  for (const p of projects) {
    const s = summarizeChecklist(checklists.get(p.id) ?? [])
    const entry = progressByBrand.get(p.brand) ?? { items: 0, done: 0, count: 0 }
    entry.items += s.total - s.notApplicable
    entry.done += s.done
    entry.count += 1
    progressByBrand.set(p.brand, entry)
  }

  const ventureSpaces = spaces.filter(
    (s) => s.kind !== "company" && s.slug !== "hq",
  )

  const ventureCards: VentureCard[] = ventureSpaces.map((space) => {
    const brandKey = space.slug === "b2b-ecommerce" ? "suprans" : space.slug
    const p =
      progressByBrand.get(brandKey) ??
      progressByBrand.get(space.slug) ??
      null
    return {
      space,
      projectProgress:
        p && p.items > 0 ? Math.round((p.done / p.items) * 100) : null,
      projectCount: p?.count ?? 0,
    }
  })

  const activeVentureCount = ventureSpaces.filter((s) => s.is_active).length
  const totalProjects = projects.length
  const totalItems = Array.from(progressByBrand.values()).reduce(
    (a, b) => a + b.items,
    0,
  )
  const totalDone = Array.from(progressByBrand.values()).reduce(
    (a, b) => a + b.done,
    0,
  )
  const portfolioProgress =
    totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Suprans HQ
          </p>
          <h1 className="mt-0.5 text-2xl md:text-3xl font-bold font-heading text-foreground">
            Company Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything across every venture — the top of the hierarchy.
          </p>
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border/80 bg-card text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
        >
          <FolderKanban className="h-3.5 w-3.5" />
          All projects
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="People"
          value={teamCount}
          sublabel={teamCount === 1 ? "team member" : "team members"}
          icon={Users}
          tint="#3b82f6"
        />
        <KpiCard
          label="Active ventures"
          value={activeVentureCount}
          sublabel={`of ${ventureSpaces.length} tracked`}
          icon={Briefcase}
          tint="#8b5cf6"
        />
        <KpiCard
          label="Portfolio progress"
          value={`${portfolioProgress}%`}
          sublabel={`${totalDone} / ${totalItems} items`}
          icon={Target}
          tint="#10b981"
        />
        <KpiCard
          label="Company revenue"
          value={formatMoney(revenueCents)}
          sublabel="all ventures, all-time"
          icon={Wallet}
          tint="#f59e0b"
        />
      </div>

      {/* Ventures grid */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h2 className="text-base font-bold font-heading text-foreground">
              Ventures
            </h2>
            <p className="text-xs text-muted-foreground">
              Each venture owns its own space with its own admin, team and data.
            </p>
          </div>
          <Link
            href="/"
            className="text-xs font-medium text-primary hover:underline"
          >
            All apps →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ventureCards.map(({ space, projectProgress, projectCount }) => {
            const Icon = SPACE_ICON[space.slug] ?? Layers
            const color = space.color || "#6366f1"
            const isExternal = /^https?:\/\//i.test(space.entry_url)
            const inner = (
              <div
                className={`group flex items-start gap-3 rounded-lg border bg-card shadow-sm p-4 transition-all ${
                  space.is_active
                    ? "border-border/80 hover:border-foreground/20 hover:shadow-md"
                    : "border-dashed border-border/60 opacity-70 cursor-not-allowed"
                }`}
              >
                <div
                  className="h-10 w-10 rounded-md flex items-center justify-center shrink-0 ring-1 ring-black/[0.04]"
                  style={{
                    background: `linear-gradient(135deg, ${color}33, ${color}14)`,
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold font-heading text-foreground leading-tight truncate">
                      {space.name}
                    </h3>
                    {!space.is_active && (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-muted/60 text-muted-foreground ring-1 ring-inset ring-border/60">
                        Coming soon
                      </span>
                    )}
                  </div>
                  {space.tagline && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {space.tagline}
                    </p>
                  )}
                  {projectProgress !== null && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground mb-1">
                        <span>
                          {projectCount} project{projectCount === 1 ? "" : "s"}
                        </span>
                        <span className="tabular-nums font-bold text-foreground">
                          {projectProgress}%
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${projectProgress}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {space.is_active && (
                  isExternal ? (
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                  )
                )}
              </div>
            )
            if (!space.is_active) {
              return <div key={space.id}>{inner}</div>
            }
            if (isExternal) {
              return (
                <a
                  key={space.id}
                  href={space.entry_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {inner}
                </a>
              )
            }
            return (
              <Link key={space.id} href={space.entry_url} className="block">
                {inner}
              </Link>
            )
          })}
        </div>
      </section>

      {/* HQ sub-sections — quick tiles */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h2 className="text-base font-bold font-heading text-foreground">
              Company sections
            </h2>
            <p className="text-xs text-muted-foreground">
              Deep-links into the HQ workspace — people, finance, projects,
              compliance.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SectionTile
            href="/hq/people"
            label="People"
            description="Team directory, org chart, HR"
            icon={Users}
            tint="#3b82f6"
            comingSoon
          />
          <SectionTile
            href="/hq/finance"
            label="Finance"
            description="Cross-venture P&L and cashflow"
            icon={LineChart}
            tint="#f59e0b"
            comingSoon
          />
          <SectionTile
            href="/projects"
            label="Projects"
            description="Delivery portfolio across all ventures"
            icon={FolderKanban}
            tint="#10b981"
          />
          <SectionTile
            href="/hq/compliance"
            label="Compliance"
            description="Policies, legal, audits"
            icon={ShieldCheck}
            tint="#ef4444"
            comingSoon
          />
        </div>
      </section>

      {/* Architecture link — so contributors find the locked vocabulary */}
      <section className="rounded-lg border border-border/80 bg-muted/30 px-5 py-4 flex items-start gap-3">
        <BookOpen className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Architecture & vocabulary
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Suprans is the legal entity. TeamSync AI is this app. Ventures are
            top-level business lines (B2B, Legal, Goyo, …). Each venture has its
            own space with its own admin, team and data. HQ is the only
            company-tier space. See{" "}
            <code className="font-mono text-[11px] bg-background border border-border/80 px-1 py-0.5 rounded">
              docs/ARCHITECTURE.md
            </code>{" "}
            for the full locked reference.
          </p>
        </div>
      </section>
    </div>
  )
}

function SectionTile({
  href,
  label,
  description,
  icon: Icon,
  tint,
  comingSoon,
}: {
  href: string
  label: string
  description: string
  icon: typeof Users
  tint: string
  comingSoon?: boolean
}) {
  const inner = (
    <div
      className={`group flex flex-col gap-2 rounded-lg border bg-card shadow-sm p-4 h-full transition-all ${
        comingSoon
          ? "border-dashed border-border/60 opacity-75"
          : "border-border/80 hover:border-foreground/20 hover:shadow-md"
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          className="h-8 w-8 rounded-md flex items-center justify-center ring-1 ring-black/[0.04]"
          style={{
            background: `linear-gradient(135deg, ${tint}26, ${tint}10)`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color: tint }} />
        </div>
        {comingSoon && (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-muted/60 text-muted-foreground ring-1 ring-inset ring-border/60">
            Soon
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold font-heading text-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
          {description}
        </p>
      </div>
    </div>
  )
  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  )
}
