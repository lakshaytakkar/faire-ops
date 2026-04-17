import { notFound } from "next/navigation"
import { FolderKanban, ListChecks, Clock3, Rocket, Globe } from "lucide-react"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { formatDateTime } from "@/lib/format"
import { ChecklistEditor, type ChecklistItem } from "./checklist-editor"

export const dynamic = "force-dynamic"

interface ProjectTypeRef {
  label: string | null
  key: string | null
  icon: string | null
}

interface ProjectRow {
  id: string
  name: string | null
  venture: string | null
  status: string | null
  health: string | null
  repo_path: string | null
  owner_email: string | null
  owner_name: string | null
  last_deploy_at: string | null
  project_type_id: string | null
  project_types: ProjectTypeRef | ProjectTypeRef[] | null
}

interface ChecklistTemplateRow {
  id: string
  items: Array<{ key: string; label: string; required?: boolean; description?: string | null }> | null
}

interface ProjectChecklistRow {
  id: string
  template_id: string | null
  items: ChecklistItem[] | null
  checklist_templates: ChecklistTemplateRow | ChecklistTemplateRow[] | null
}

function firstTypeRef(t: ProjectTypeRef | ProjectTypeRef[] | null): ProjectTypeRef | null {
  if (!t) return null
  if (Array.isArray(t)) return t[0] ?? null
  return t
}

function firstTemplateRef(
  t: ChecklistTemplateRow | ChecklistTemplateRow[] | null,
): ChecklistTemplateRow | null {
  if (!t) return null
  if (Array.isArray(t)) return t[0] ?? null
  return t
}

export default async function RegistryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "id, name, venture, status, health, repo_path, owner_email, owner_name, last_deploy_at, project_type_id, project_types(label, key, icon)",
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !project) notFound()
  const p = project as ProjectRow

  const [{ data: checklistRow }, { data: domainsData }, { data: deploysData }] = await Promise.all([
    supabase
      .from("project_checklists")
      .select("id, template_id, items, checklist_templates(id, items)")
      .eq("project_id", p.id)
      .maybeSingle(),
    supabase.from("domains").select("id, domain, status").eq("project_id", p.id),
    supabase.from("deployment_events").select("id, deployed_at, status").eq("project_id", p.id),
  ])

  const checklist = (checklistRow ?? null) as ProjectChecklistRow | null
  const domains = (domainsData ?? []) as Array<{ id: string; domain: string | null; status: string | null }>
  const deployments = (deploysData ?? []) as Array<{ id: string; status: string | null; deployed_at: string | null }>

  const template = checklist ? firstTemplateRef(checklist.checklist_templates) : null
  const templateItems = template?.items ?? []
  const currentItems: ChecklistItem[] = checklist?.items ?? []
  const itemsById = new Map(currentItems.map((it) => [it.key, it]))

  // Merge template + current, preserving template order and filling defaults.
  const mergedItems: ChecklistItem[] = templateItems.length
    ? templateItems.map((t) => {
        const existing = itemsById.get(t.key)
        return {
          key: t.key,
          label: existing?.label ?? t.label,
          status: existing?.status ?? "pending",
          notes: existing?.notes ?? null,
          description: t.description ?? null,
          required: t.required ?? false,
          updated_at: existing?.updated_at ?? null,
          updated_by: existing?.updated_by ?? null,
        }
      })
    : currentItems.map((it) => ({
        key: it.key,
        label: it.label,
        status: it.status ?? "pending",
        notes: it.notes ?? null,
        description: null,
        required: false,
        updated_at: it.updated_at ?? null,
        updated_by: it.updated_by ?? null,
      }))

  const totalItems = mergedItems.length
  const doneItems = mergedItems.filter((i) => i.status === "done").length
  const pendingItems = mergedItems.filter((i) => i.status === "pending" || i.status === "in_progress").length
  const percent = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100)

  const type = firstTypeRef(p.project_types)
  const subtitle = `${p.venture ?? "—"} · ${p.repo_path ?? "—"}`

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/development/registry" label="All projects" />

      <HeroCard
        title={p.name ?? "Untitled project"}
        subtitle={subtitle}
        icon={FolderKanban}
        tone="blue"
        meta={
          <>
            {p.status && (
              <StatusBadge tone={toneForStatus(p.status)}>{p.status.replace(/_/g, " ")}</StatusBadge>
            )}
            {p.health && <StatusBadge tone={toneForStatus(p.health)}>{p.health}</StatusBadge>}
            {type?.label && <StatusBadge tone="slate">{type.label}</StatusBadge>}
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" disabled>
              Edit
            </Button>
            <Button variant="outline" size="sm" disabled>
              Open repo
            </Button>
          </>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Checklist progress"
          value={`${percent}%`}
          icon={ListChecks}
          iconTone="emerald"
          hint={`${doneItems}/${totalItems} done`}
        />
        <MetricCard label="Items pending" value={pendingItems} icon={Clock3} iconTone="amber" />
        <MetricCard label="Deployments" value={deployments.length} icon={Rocket} iconTone="blue" />
        <MetricCard label="Domains linked" value={domains.length} icon={Globe} iconTone="violet" />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title={`Checklist (${doneItems}/${totalItems})`}>
            {checklist && mergedItems.length > 0 ? (
              <ChecklistEditor
                checklistId={checklist.id}
                items={mergedItems}
                updateableItems={mergedItems}
              />
            ) : (
              <EmptyState
                icon={ListChecks}
                title="No checklist yet"
                description="This project has no checklist linked to a template."
              />
            )}
          </DetailCard>
        </div>
        <div className="space-y-5">
          <DetailCard title="Key details">
            <InfoRow label="Repo path" value={p.repo_path ?? "—"} />
            <InfoRow label="Venture" value={p.venture ?? "—"} />
            <InfoRow label="Owner email" value={p.owner_email ?? "—"} />
            <InfoRow label="Last deploy" value={formatDateTime(p.last_deploy_at)} />
          </DetailCard>
          <DetailCard title="Linked">
            <InfoRow
              label="Domains"
              value={
                <span className="tabular-nums">{domains.length}</span>
              }
            />
            <InfoRow
              label="Deployment events"
              value={
                <span className="tabular-nums">{deployments.length}</span>
              }
            />
            {domains.slice(0, 5).map((d) => (
              <InfoRow
                key={d.id}
                label={d.domain ?? "—"}
                value={
                  d.status ? (
                    <StatusBadge tone={toneForStatus(d.status)}>{d.status}</StatusBadge>
                  ) : (
                    "—"
                  )
                }
              />
            ))}
          </DetailCard>
        </div>
      </div>
    </div>
  )
}

