import Link from "next/link"
import { ArrowRight, Calendar, Target } from "lucide-react"
import { listProjects } from "@/lib/projects"
import { SectionHeader, StatusPill, ventureMeta } from "@/components/development/dev-primitives"
import { EtsListShell, EtsEmptyState } from "@/app/(portal)/ets/_components/ets-ui"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = { title: "Sprints — Development | Suprans" }

export default async function SprintsPage() {
  const projects = await listProjects()
  const now = new Date()
  const sprintStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1)
  const sprintEnd = new Date(sprintStart)
  sprintEnd.setDate(sprintStart.getDate() + 13)

  const building = projects.filter((p) => p.status === "building")
  const live = projects.filter((p) => p.status === "live")
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })

  return (
    <EtsListShell
      title="Sprints"
      subtitle={`Two-week window ${fmt(sprintStart)} – ${fmt(sprintEnd)}. Projects every team is committed to ship, grouped by ownership.`}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SprintKpi icon={Calendar} label="Sprint window" value={`${fmt(sprintStart)} – ${fmt(sprintEnd)}`} sublabel="14 days" />
          <SprintKpi icon={Target} label="Commitments" value={building.length.toString()} sublabel={`${building.length === 1 ? "project" : "projects"} actively building`} />
          <SprintKpi icon={Target} label="Maintaining" value={live.length.toString()} sublabel={`${live.length === 1 ? "property" : "properties"} in production`} />
        </div>

        <div>
          <SectionHeader
            eyebrow="Active work"
            title="This sprint's commitments"
            description="Every project below has an owner committed to meaningful progress this window."
          />
          <div className="space-y-2">
            {building.map((p) => {
              const v = ventureMeta(p.venture)
              return (
                <Link key={p.id} href={`/development/projects/${p.slug}`} className="block">
                  <Card className="p-4 transition-shadow hover:shadow-sm">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "size-10 rounded-md flex items-center justify-center shrink-0 text-white font-semibold text-sm",
                          v.gradientClass,
                        )}
                        aria-hidden
                      >
                        {v.short}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-sm font-semibold">{p.name}</h3>
                          <StatusPill status={p.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {v.label} · Owner: <span className="font-medium text-foreground">{p.owner_name ?? "Unassigned"}</span>
                        </p>
                        {p.narrative && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{p.narrative}</p>
                        )}
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </Card>
                </Link>
              )
            })}
            {building.length === 0 && (
              <EtsEmptyState
                icon={Target}
                title="No active commitments"
                description='No projects are actively under build right now. Flip a project status to "building" from its detail page to surface it here.'
              />
            )}
          </div>
        </div>

        <div>
          <SectionHeader
            eyebrow="Maintaining"
            title="Live — maintenance only"
            description="Properties shipping to users that take only maintenance work this sprint."
          />
          <div className="space-y-2">
            {live.map((p) => {
              const v = ventureMeta(p.venture)
              return (
                <Link key={p.id} href={`/development/projects/${p.slug}`} className="block">
                  <Card className="p-3 flex items-center justify-between gap-3 transition-shadow hover:shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "size-9 rounded-md flex items-center justify-center shrink-0 text-white text-sm font-semibold",
                          v.gradientClass,
                        )}
                      >
                        {v.short}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.label} · {p.owner_name ?? "Unassigned"}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </EtsListShell>
  )
}

function SprintKpi({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: typeof Calendar
  label: string
  value: string
  sublabel: string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="size-8 rounded-md bg-muted flex items-center justify-center">
          <Icon className="size-4 text-muted-foreground" />
        </div>
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
    </Card>
  )
}
