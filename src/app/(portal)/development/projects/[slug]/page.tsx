import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ExternalLink,
  GitBranch,
  Code2,
  Globe,
  Rocket,
  Target,
  User,
  ListChecks,
  BookOpen,
  Layers as LayersIcon,
} from "lucide-react"
import {
  getProjectBySlug,
  summarizeChecklist,
  summarizeByDimension,
} from "@/lib/projects"
import {
  HealthDot,
  StatusPill,
  VersionPill,
  KindPill,
  TechStack,
  relativeTime,
  HEALTH_META,
  ventureMeta,
} from "@/components/development/dev-primitives"
import {
  EtsDetailShell,
  EtsKpi,
} from "@/app/(portal)/ets/_components/ets-ui"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function DevelopmentProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) notFound()

  const v = ventureMeta(project.venture)
  const summary = summarizeChecklist(project.checklist)
  const dimensions = summarizeByDimension(project.checklist)
  const health = HEALTH_META[project.health]
  const creds = project.credentials

  return (
    <EtsDetailShell
      backHref="/development/projects"
      backLabel="All projects"
      avatar={
        <div
          className={cn(
            "size-12 rounded-md flex items-center justify-center shrink-0 text-white text-base font-semibold",
            v.gradientClass,
          )}
          aria-hidden
        >
          {v.short}
        </div>
      }
      title={project.name}
      subtitle={`${v.label} · ${project.owner_name ?? "Unassigned"}`}
      badges={
        <>
          <StatusPill status={project.status} />
          <VersionPill version={project.version} />
          <KindPill kind={project.kind} />
        </>
      }
      actions={
        <div className="flex items-center gap-2">
          <HealthDot health={project.health} withLabel />
          {(creds?.production_url ?? project.url) && (
            <a
              href={creds?.production_url ?? project.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 h-8 px-3 rounded-md border bg-card text-sm font-medium hover:bg-muted/40"
            >
              <ExternalLink className="size-3.5" /> Visit
            </a>
          )}
        </div>
      }
      kpis={
        <>
          <EtsKpi label="Owner" value={project.owner_name ?? "Unassigned"} />
          <EtsKpi
            label="Health"
            value={health.label}
          />
          <EtsKpi
            label="Last deploy"
            value={project.last_deploy_at ? relativeTime(project.last_deploy_at) : "—"}
          />
          <EtsKpi
            label="Repository"
            value={creds?.github_repo_slug ?? "—"}
          />
          <EtsKpi
            label="Stack"
            value={`${project.tech_stack.length} tech`}
          />
          <EtsKpi
            label="Progress"
            value={`${summary.percentComplete}%`}
            hint={`${summary.done}/${summary.total - summary.notApplicable} done`}
          />
        </>
      }
    >
      <div className="space-y-5">
        {project.narrative && (
          <Card className="p-5">
            <p className="text-sm leading-relaxed">{project.narrative}</p>
          </Card>
        )}

        {project.tech_stack.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <LayersIcon className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Tech stack</h2>
            </div>
            <TechStack stack={project.tech_stack} />
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Build progress</h2>
            </div>
            <p className="text-3xl font-semibold tabular-nums">
              {summary.percentComplete}
              <span className="text-base text-muted-foreground">%</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.done} of {summary.total - summary.notApplicable} items complete
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${summary.percentComplete}%` }}
              />
            </div>
            <dl className="mt-4 space-y-1.5 text-sm">
              <Row label="Done" value={summary.done.toString()} />
              <Row label="In progress" value={summary.inProgress.toString()} />
              <Row label="Pending" value={summary.pending.toString()} />
              <Row label="Not applicable" value={summary.notApplicable.toString()} muted />
            </dl>
          </Card>

          <Card className="lg:col-span-2 p-5">
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">By build dimension</h2>
            </div>
            <div className="space-y-3">
              {dimensions.map((d) => {
                const pct = d.percent ?? 0
                const applicable = d.percent !== null
                return (
                  <div key={d.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{d.label}</span>
                      <span className="tabular-nums text-xs text-muted-foreground">
                        {applicable ? `${d.done}/${d.total} · ${pct}%` : "N/A"}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${applicable ? pct : 0}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetaTile icon={User} label="Owner" value={project.owner_name ?? "Unassigned"} />
          <MetaTile
            icon={Rocket}
            label="Last deploy"
            value={project.last_deploy_at ? relativeTime(project.last_deploy_at) : "—"}
          />
          <MetaTile
            icon={Globe}
            label="Production"
            value={creds?.production_url ?? project.url ?? "—"}
            href={creds?.production_url ?? project.url ?? undefined}
          />
          <MetaTile
            icon={Code2}
            label="Repository"
            value={creds?.github_repo_slug ?? creds?.github_url ?? "Not linked"}
            href={creds?.github_url ?? undefined}
          />
        </div>

        {project.pages.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Site map</h2>
            </div>
            <ul className="space-y-1">
              {project.pages.map((p) => (
                <PageNode
                  key={p.id}
                  name={p.name}
                  path={p.path}
                  status={p.status}
                  subpages={p.subpages ?? []}
                  level={0}
                />
              ))}
            </ul>
          </Card>
        )}

        {project.plugins.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <GitBranch className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Integrations</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {project.plugins.map((pl) => (
                <div
                  key={pl.id}
                  className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                >
                  <span className="text-sm font-medium truncate">{pl.plugin_label}</span>
                  <Badge variant="outline" className="capitalize">
                    {pl.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </EtsDetailShell>
  )
}

function Row({
  label,
  value,
  muted,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm font-semibold", muted && "text-muted-foreground")}>
        {value}
      </dd>
    </div>
  )
}

function MetaTile({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof User
  label: string
  value: string
  href?: string
}) {
  const body = (
    <Card className="p-4 h-full transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1.5 text-sm font-semibold truncate">{value}</p>
      {href && (
        <p className="mt-0.5 text-xs text-primary inline-flex items-center gap-1">
          Open <ExternalLink className="size-3" />
        </p>
      )}
    </Card>
  )
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {body}
      </a>
    )
  }
  return body
}

interface PageNodeProps {
  name: string
  path: string | null
  status: string
  subpages: Array<{ id: string; name: string; path: string | null; status: string; subpages?: PageNodeProps["subpages"] }>
  level: number
}

function PageNode({ name, path, status, subpages, level }: PageNodeProps) {
  return (
    <li>
      <div
        className="flex items-center justify-between py-1.5"
        style={{ paddingLeft: `${level * 20}px` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">{name}</span>
          {path && (
            <span className="text-xs text-muted-foreground truncate">{path}</span>
          )}
        </div>
        <Badge
          variant={status === "done" ? "secondary" : status === "in-progress" ? "outline" : "outline"}
          className="capitalize"
        >
          {status.replace("-", " ")}
        </Badge>
      </div>
      {subpages.length > 0 && (
        <ul className="space-y-1">
          {subpages.map((s) => (
            <PageNode
              key={s.id}
              name={s.name}
              path={s.path}
              status={s.status}
              subpages={s.subpages ?? []}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
