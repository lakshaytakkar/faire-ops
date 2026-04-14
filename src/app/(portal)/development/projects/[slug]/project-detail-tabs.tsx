"use client"

import { useState } from "react"
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
  Sparkles,
  Calendar,
  Clock,
} from "lucide-react"
import type { ChecklistItem, ProjectPage, ProjectPluginRow } from "@/lib/projects"
import { TechStack } from "@/components/development/dev-primitives"
import { relativeTime } from "@/lib/format"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { DetailCard, InfoRow, LargeModal } from "@/components/shared/detail-views"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"

export interface ProjectDeployment {
  id: string
  vercel_deployment_id: string
  commit_sha: string | null
  commit_message: string | null
  branch: string | null
  author_name: string | null
  status: "queued" | "building" | "ready" | "error" | "canceled"
  deployed_at: string | null
  url: string | null
}

export interface ProjectRoadmap {
  id: string
  quarter: string
  title: string
  description: string | null
  status: "planned" | "in_progress" | "shipped" | "at_risk" | "deferred"
  target_date: string | null
  owner: string | null
  bullets: string[]
}

export interface ProjectChangelog {
  id: string
  entry_date: string
  title: string
  description: string | null
  kind: "release" | "feature" | "fix" | "chore"
}

interface ProjectSlim {
  id: string
  slug: string
  name: string
  description: string | null
  narrative: string | null
  tech_stack: string[]
  url: string | null
  production_url: string | null
  github_url: string | null
  github_repo_slug: string | null
}

type TabId = "overview" | "checklist" | "deployments" | "roadmap" | "changelog"

export function ProjectDetailTabs({
  project,
  summary,
  dimensions,
  checklistByDim,
  pages,
  plugins,
  deployments,
  roadmap,
  changelog,
}: {
  project: ProjectSlim
  summary: { done: number; inProgress: number; pending: number; notApplicable: number; total: number; percentComplete: number }
  dimensions: Array<{ key: string; label: string; done: number; total: number; percent: number | null }>
  checklistByDim: Array<{ dimension: string; items: ChecklistItem[] }>
  pages: ProjectPage[]
  plugins: ProjectPluginRow[]
  deployments: ProjectDeployment[]
  roadmap: ProjectRoadmap[]
  changelog: ProjectChangelog[]
}) {
  const [tab, setTab] = useState<TabId>("overview")
  const [selectedDeploy, setSelectedDeploy] = useState<ProjectDeployment | null>(null)

  const tabs: FilterTab[] = [
    { id: "overview", label: "Overview" },
    { id: "checklist", label: "Checklist", count: summary.total - summary.notApplicable },
    { id: "deployments", label: "Deployments", count: deployments.length },
    { id: "roadmap", label: "Roadmap", count: roadmap.length },
    { id: "changelog", label: "Changelog", count: changelog.length },
  ]

  return (
    <>
      <FilterBar tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as TabId)} />

      {tab === "overview" && (
        <div className="space-y-5">
          {project.narrative && (
            <DetailCard title="Narrative">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{project.narrative}</p>
            </DetailCard>
          )}

          {project.tech_stack.length > 0 && (
            <DetailCard title="Tech stack">
              <div className="flex items-center gap-2 mb-2">
                <LayersIcon className="size-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{project.tech_stack.length} technologies</span>
              </div>
              <TechStack stack={project.tech_stack} />
            </DetailCard>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <DetailCard title="Build progress">
              <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                <Target className="size-4" />
                <span className="text-xs">Overall completion</span>
              </div>
              <p className="text-3xl font-bold font-heading tabular-nums">
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
            </DetailCard>

            <div className="lg:col-span-2">
              <DetailCard title="By build dimension">
                <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                  <ListChecks className="size-4" />
                  <span className="text-xs">Progress per dimension</span>
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
              </DetailCard>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetaTile icon={User} label="Owner" value="—" />
            <MetaTile
              icon={Rocket}
              label="Last deploy"
              value={deployments[0]?.deployed_at ? relativeTime(deployments[0].deployed_at) : "—"}
            />
            <MetaTile
              icon={Globe}
              label="Production"
              value={project.production_url ?? project.url ?? "—"}
              href={project.production_url ?? project.url ?? undefined}
            />
            <MetaTile
              icon={Code2}
              label="Repository"
              value={project.github_repo_slug ?? project.github_url ?? "Not linked"}
              href={project.github_url ?? undefined}
            />
          </div>

          {pages.length > 0 && (
            <DetailCard title="Site map">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <BookOpen className="size-4" />
                <span className="text-xs">{pages.length} top-level pages</span>
              </div>
              <ul className="space-y-1">
                {pages.map((p) => (
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
            </DetailCard>
          )}

          {plugins.length > 0 && (
            <DetailCard title="Integrations">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <GitBranch className="size-4" />
                <span className="text-xs">{plugins.length} plugins</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {plugins.map((pl) => (
                  <div
                    key={pl.id}
                    className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                  >
                    <span className="text-sm font-medium truncate">{pl.plugin_label}</span>
                    <StatusBadge tone={toneForStatus(pl.status)}>{pl.status}</StatusBadge>
                  </div>
                ))}
              </div>
            </DetailCard>
          )}
        </div>
      )}

      {tab === "checklist" && (
        <div className="space-y-5">
          {checklistByDim.length === 0 ? (
            <EmptyState icon={ListChecks} title="No checklist items" description="Add checklist rows to project_checklist." />
          ) : (
            checklistByDim.map(({ dimension, items }) => (
              <DetailCard key={dimension} title={dimension}>
                <ul className="space-y-1.5">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between py-1.5 border-b last:border-b-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm truncate">{item.item_label}</span>
                      </div>
                      <StatusBadge tone={toneForStatus(item.status)}>{item.status.replace("-", " ")}</StatusBadge>
                    </li>
                  ))}
                </ul>
              </DetailCard>
            ))
          )}
        </div>
      )}

      {tab === "deployments" && (
        <div className="space-y-3">
          {deployments.length === 0 ? (
            <EmptyState
              icon={Rocket}
              title="No deployments recorded"
              description="Once the Vercel webhook is wired, events for this project will appear here."
            />
          ) : (
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Commit</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Branch</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Author</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">When</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedDeploy(d)}
                      className="border-b last:border-b-0 cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-4 py-3 max-w-md">
                        <div className="text-sm font-medium truncate">{d.commit_message ?? "—"}</div>
                        {d.commit_sha && (
                          <div className="text-xs text-muted-foreground font-mono">{d.commit_sha.slice(0, 7)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={toneForStatus(d.status)}>{d.status}</StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <GitBranch className="size-3" /> {d.branch ?? "main"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{d.author_name ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 justify-end">
                          <Clock className="size-3" /> {relativeTime(d.deployed_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "roadmap" && (
        <div className="space-y-3">
          {roadmap.length === 0 ? (
            <EmptyState icon={Sparkles} title="No roadmap items linked" description="Link a roadmap_item via linked_project_id to see it here." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {roadmap.map((r) => (
                <div key={r.id} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{r.quarter}</span>
                    <StatusBadge tone={toneForStatus(r.status)}>{r.status.replace("_", " ")}</StatusBadge>
                  </div>
                  <h3 className="text-sm font-semibold leading-snug">{r.title}</h3>
                  {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                  {r.bullets.length > 0 && (
                    <ul className="space-y-1.5">
                      {r.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="inline-block size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(r.owner || r.target_date) && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                      {r.owner && <span className="inline-flex items-center gap-1"><User className="size-3" /> {r.owner}</span>}
                      {r.target_date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(r.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "changelog" && (
        <div className="space-y-3">
          {changelog.length === 0 ? (
            <EmptyState icon={BookOpen} title="No changelog entries" description="Link a changelog_entry via linked_project_id to see it here." />
          ) : (
            <ol className="relative space-y-3 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
              {changelog.map((e) => (
                <li key={e.id} className="relative pl-7">
                  <span className={cn("absolute left-0 top-3 size-[15px] rounded-full border-2 border-background", kindDotClass(e.kind))} />
                  <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge tone={kindTone(e.kind)}>{e.kind}</StatusBadge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(e.entry_date).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold leading-snug">{e.title}</h3>
                    {e.description && <p className="text-sm text-muted-foreground">{e.description}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {selectedDeploy && (
        <LargeModal title="Deployment detail" onClose={() => setSelectedDeploy(null)}>
          <div className="space-y-4">
            <DetailCard title="Summary">
              <InfoRow
                label="Status"
                value={<StatusBadge tone={toneForStatus(selectedDeploy.status)}>{selectedDeploy.status}</StatusBadge>}
              />
              <InfoRow
                label="Deployed at"
                value={selectedDeploy.deployed_at ? new Date(selectedDeploy.deployed_at).toLocaleString() : "—"}
              />
              <InfoRow label="Branch" value={selectedDeploy.branch ?? "main"} />
              <InfoRow label="Author" value={selectedDeploy.author_name ?? "—"} />
              <InfoRow
                label="Commit SHA"
                value={selectedDeploy.commit_sha ? <span className="font-mono text-xs">{selectedDeploy.commit_sha}</span> : "—"}
              />
            </DetailCard>
            <DetailCard title="Commit message">
              <p className="text-sm whitespace-pre-wrap break-words">{selectedDeploy.commit_message ?? "—"}</p>
            </DetailCard>
            {selectedDeploy.url && (
              <DetailCard title="Links">
                <a
                  href={selectedDeploy.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Open deployment <ExternalLink className="size-3.5" />
                </a>
              </DetailCard>
            )}
          </div>
        </LargeModal>
      )}
    </>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm font-semibold", muted && "text-muted-foreground")}>{value}</dd>
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
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4 h-full transition-shadow hover:shadow-sm">
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
    </div>
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
      <div className="flex items-center justify-between py-1.5" style={{ paddingLeft: `${level * 20}px` }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">{name}</span>
          {path && <span className="text-xs text-muted-foreground truncate">{path}</span>}
        </div>
        <StatusBadge tone={toneForStatus(status)}>{status.replace("-", " ")}</StatusBadge>
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

function kindTone(kind: ProjectChangelog["kind"]) {
  switch (kind) {
    case "release":
      return "emerald" as const
    case "feature":
      return "blue" as const
    case "fix":
      return "amber" as const
    case "chore":
      return "slate" as const
  }
}

function kindDotClass(kind: ProjectChangelog["kind"]) {
  switch (kind) {
    case "release":
      return "bg-emerald-500"
    case "feature":
      return "bg-blue-500"
    case "fix":
      return "bg-amber-500"
    case "chore":
      return "bg-slate-400"
  }
}
