import Link from "next/link"
import {
  ArrowRight,
  Code,
  FolderKanban,
  Globe,
  Layers,
  Rocket,
  Users,
  GitBranch,
  Sparkles,
} from "lucide-react"
import { listProjects } from "@/lib/projects"
import {
  HealthDot,
  SectionHeader,
  relativeTime,
  ventureMeta,
} from "@/components/development/dev-primitives"
import { DevProjectCard } from "@/components/development/dev-project-card"
import { EtsListShell } from "@/app/(portal)/ets/_components/ets-ui"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Development — Overview | Suprans",
  description: "Engineering dashboard for every property shipping across the Suprans ecosystem.",
}

export default async function DevelopmentOverviewPage() {
  const projects = await listProjects()

  const live = projects.filter((p) => p.status === "live").length
  const building = projects.filter((p) => p.status === "building").length
  const planning = projects.filter((p) => p.status === "planning").length

  const recent = projects
    .filter((p) => p.last_deploy_at)
    .sort((a, b) => (b.last_deploy_at ?? "").localeCompare(a.last_deploy_at ?? ""))
    .slice(0, 5)

  const byVenture = new Map<
    string,
    { live: number; building: number; planning: number; total: number }
  >()
  for (const p of projects) {
    const key = p.venture ?? "unassigned"
    const cur = byVenture.get(key) ?? { live: 0, building: 0, planning: 0, total: 0 }
    cur.total++
    if (p.status === "live") cur.live++
    else if (p.status === "building") cur.building++
    else if (p.status === "planning") cur.planning++
    byVenture.set(key, cur)
  }
  const ventureRows = Array.from(byVenture.entries())
    .filter(([v]) => v !== "unassigned")
    .sort((a, b) => b[1].total - a[1].total)

  const featured = projects
    .filter((p) => p.status === "live" || p.status === "building")
    .slice(0, 6)

  return (
    <EtsListShell
      title="Development"
      subtitle={`${projects.length} tracked projects across all ventures — every landing, portal, and app Suprans ships.`}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiTile label="Tracked" value={projects.length.toString()} sublabel="all ventures" icon={FolderKanban} />
          <KpiTile label="Live" value={live.toString()} sublabel="shipping today" icon={Globe} />
          <KpiTile label="Building" value={building.toString()} sublabel="under development" icon={Code} />
          <KpiTile label="Planning" value={planning.toString()} sublabel="awaiting kickoff" icon={Sparkles} />
        </div>

        <div>
          <SectionHeader
            eyebrow="Portfolio"
            title="What's shipping and what's in build"
            description="Open a project to see its sprint, deploys, and the narrative behind why it exists."
            right={
              <Link
                href="/development/projects"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                All projects <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {featured.map((p) => (
              <DevProjectCard key={p.id} project={p} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2 p-5">
            <SectionHeader
              eyebrow="By venture"
              title="Who owns what"
              description="Every project rolls up to a venture."
            />
            <div className="space-y-1">
              {ventureRows.map(([venture, counts]) => {
                const v = ventureMeta(venture)
                return (
                  <div
                    key={venture}
                    className="flex items-center justify-between gap-3 py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "size-9 rounded-md flex items-center justify-center shrink-0 text-white font-semibold text-sm",
                          v.gradientClass,
                        )}
                        aria-hidden
                      >
                        {v.short}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{v.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {counts.total} {counts.total === 1 ? "project" : "projects"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {counts.live > 0 && <Badge variant="default">{counts.live} live</Badge>}
                      {counts.building > 0 && <Badge variant="secondary">{counts.building} building</Badge>}
                      {counts.planning > 0 && <Badge variant="outline">{counts.planning} planning</Badge>}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Rocket className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Recent deploys</h3>
              </div>
              <Link
                href="/development/deployments"
                className="text-xs font-medium text-primary hover:underline"
              >
                All →
              </Link>
            </div>
            <div className="space-y-3">
              {recent.map((p) => {
                const v = ventureMeta(p.venture)
                return (
                  <Link
                    key={p.id}
                    href={`/development/projects/${p.slug}`}
                    className="flex items-start gap-2.5 group"
                  >
                    <div
                      className={cn(
                        "size-8 rounded-md flex items-center justify-center shrink-0 text-white text-xs font-semibold",
                        v.gradientClass,
                      )}
                    >
                      {v.short}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate group-hover:text-primary">
                        {p.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                        <GitBranch className="size-3" />
                        {relativeTime(p.last_deploy_at)}
                      </p>
                    </div>
                    <HealthDot health={p.health} />
                  </Link>
                )
              })}
              {recent.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No deploy history yet.
                </p>
              )}
            </div>
          </Card>
        </div>

        <div>
          <SectionHeader
            eyebrow="Jump to"
            title="Other views of the portfolio"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <DeepLink
              href="/development/sprints"
              icon={Layers}
              title="This sprint"
              body="Two-week commitments, owners, blockers."
            />
            <DeepLink
              href="/development/roadmap"
              icon={Sparkles}
              title="Quarterly roadmap"
              body="Themes through end of 2026."
            />
            <DeepLink
              href="/development/deployments"
              icon={Rocket}
              title="Deployment feed"
              body="Every Vercel + Supabase deploy."
            />
            <DeepLink
              href="/development/changelog"
              icon={FolderKanban}
              title="Changelog"
              body="Notable releases across properties."
            />
          </div>
        </div>
      </div>
    </EtsListShell>
  )
}

function KpiTile({
  label,
  value,
  sublabel,
  icon: Icon,
}: {
  label: string
  value: string
  sublabel: string
  icon: typeof Users
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="size-8 rounded-md bg-muted flex items-center justify-center">
          <Icon className="size-4 text-muted-foreground" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
    </Card>
  )
}

function DeepLink({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string
  icon: typeof Users
  title: string
  body: string
}) {
  return (
    <Link href={href} className="group block">
      <Card className="p-4 transition-shadow hover:shadow-sm h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="size-9 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="size-4 text-primary" />
          </div>
          <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
        <h3 className="text-sm font-semibold mb-1 group-hover:text-primary">{title}</h3>
        <p className="text-sm text-muted-foreground">{body}</p>
      </Card>
    </Link>
  )
}
