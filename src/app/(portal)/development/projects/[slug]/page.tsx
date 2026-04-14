import { notFound } from "next/navigation"
import { ExternalLink, FolderKanban, Heart, Rocket, GitBranch, Layers, Target } from "lucide-react"
import {
  getProjectBySlug,
  summarizeChecklist,
  summarizeByDimension,
  type ChecklistItem,
} from "@/lib/projects"
import { supabase } from "@/lib/supabase"
import {
  HealthDot,
  HEALTH_META,
  KIND_META,
  VERSION_META,
  STATUS_META,
  ventureMeta,
} from "@/components/development/dev-primitives"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { relativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ProjectDetailTabs, type ProjectDeployment, type ProjectRoadmap, type ProjectChangelog } from "./project-detail-tabs"

export const dynamic = "force-dynamic"

export default async function DevelopmentProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) notFound()

  const [{ data: deployRaw }, { data: roadmapRaw }, { data: changelogRaw }] = await Promise.all([
    supabase
      .from("deployment_events")
      .select("id, vercel_deployment_id, commit_sha, commit_message, branch, author_name, status, deployed_at, url")
      .eq("project_id", project.id)
      .order("deployed_at", { ascending: false, nullsFirst: false })
      .limit(50),
    supabase
      .from("roadmap_items")
      .select("id, quarter, title, description, status, target_date, owner, bullets")
      .eq("linked_project_id", project.id)
      .order("quarter", { ascending: true }),
    supabase
      .from("changelog_entries")
      .select("id, entry_date, title, description, kind")
      .eq("linked_project_id", project.id)
      .order("entry_date", { ascending: false })
      .limit(30),
  ])

  const deployments: ProjectDeployment[] = (deployRaw ?? []).map((d) => ({
    id: d.id as string,
    vercel_deployment_id: d.vercel_deployment_id as string,
    commit_sha: (d.commit_sha as string | null) ?? null,
    commit_message: (d.commit_message as string | null) ?? null,
    branch: (d.branch as string | null) ?? null,
    author_name: (d.author_name as string | null) ?? null,
    status: d.status as ProjectDeployment["status"],
    deployed_at: (d.deployed_at as string | null) ?? null,
    url: (d.url as string | null) ?? null,
  }))

  const roadmap: ProjectRoadmap[] = (roadmapRaw ?? []).map((r) => ({
    id: r.id as string,
    quarter: r.quarter as string,
    title: r.title as string,
    description: (r.description as string | null) ?? null,
    status: r.status as ProjectRoadmap["status"],
    target_date: (r.target_date as string | null) ?? null,
    owner: (r.owner as string | null) ?? null,
    bullets: Array.isArray(r.bullets) ? (r.bullets as string[]) : [],
  }))

  const changelog: ProjectChangelog[] = (changelogRaw ?? []).map((e) => ({
    id: e.id as string,
    entry_date: e.entry_date as string,
    title: e.title as string,
    description: (e.description as string | null) ?? null,
    kind: e.kind as ProjectChangelog["kind"],
  }))

  const v = ventureMeta(project.venture)
  const summary = summarizeChecklist(project.checklist)
  const dimensions = summarizeByDimension(project.checklist)
  const checklistByDim = groupChecklistByDimension(project.checklist)
  const health = HEALTH_META[project.health]
  const creds = project.credentials

  const liveUrl = creds?.production_url ?? project.url

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/development/projects" label="All projects" />

      <HeroCard
        title={project.name}
        subtitle={`${v.label} · ${project.owner_name ?? "Unassigned"}`}
        avatar={
          <div
            className={cn(
              "size-12 rounded-md flex items-center justify-center text-white text-base font-semibold",
              v.gradientClass,
            )}
            aria-hidden
          >
            {v.short}
          </div>
        }
        meta={
          <>
            <StatusBadge tone={toneForStatus(project.status)}>
              {STATUS_META[project.status].label}
            </StatusBadge>
            <StatusBadge tone={toneForStatus(project.version)}>
              {VERSION_META[project.version].label}
            </StatusBadge>
            <StatusBadge tone="slate">{KIND_META[project.kind].label}</StatusBadge>
          </>
        }
        actions={
          <>
            <HealthDot health={project.health} withLabel />
            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 h-8 px-3 rounded-md border bg-card text-sm font-medium hover:bg-muted/40"
              >
                <ExternalLink className="size-3.5" /> Visit
              </a>
            )}
          </>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Owner"
          value={project.owner_name ?? "Unassigned"}
          icon={FolderKanban}
          iconTone="slate"
        />
        <MetricCard label="Health" value={health.label} icon={Heart} iconTone="emerald" />
        <MetricCard
          label="Last deploy"
          value={project.last_deploy_at ? relativeTime(project.last_deploy_at) : "—"}
          icon={Rocket}
          iconTone="blue"
        />
        <MetricCard
          label="Repository"
          value={creds?.github_repo_slug ?? "—"}
          icon={GitBranch}
          iconTone="violet"
        />
        <MetricCard
          label="Stack"
          value={`${project.tech_stack.length} tech`}
          icon={Layers}
          iconTone="slate"
        />
        <MetricCard
          label="Progress"
          value={`${summary.percentComplete}%`}
          icon={Target}
          iconTone="amber"
          hint={`${summary.done}/${summary.total - summary.notApplicable} done`}
        />
      </KPIGrid>

      <ProjectDetailTabs
        project={{
          id: project.id,
          slug: project.slug,
          name: project.name,
          description: project.description,
          narrative: project.narrative,
          tech_stack: project.tech_stack,
          url: project.url,
          production_url: creds?.production_url ?? null,
          github_url: creds?.github_url ?? null,
          github_repo_slug: creds?.github_repo_slug ?? null,
        }}
        summary={summary}
        dimensions={dimensions}
        checklistByDim={checklistByDim}
        pages={project.pages}
        plugins={project.plugins}
        deployments={deployments}
        roadmap={roadmap}
        changelog={changelog}
      />
    </div>
  )
}

function groupChecklistByDimension(
  checklist: ChecklistItem[],
): Array<{ dimension: string; items: ChecklistItem[] }> {
  const map = new Map<string, ChecklistItem[]>()
  for (const item of checklist) {
    const key = item.dimension ?? "other"
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries())
    .map(([dimension, items]) => ({
      dimension,
      items: items.slice().sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.dimension.localeCompare(b.dimension))
}
