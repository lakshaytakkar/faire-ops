import { notFound } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, CalendarDays, Target, Clock } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDate } from "@/lib/format"
import { IssueEditLauncher } from "./IssueEditLauncher"

export const dynamic = "force-dynamic"

type Params = { id: string }

function daysBetween(from: string | null | undefined, to: Date = new Date()): number | null {
  if (!from) return null
  const d = new Date(from)
  if (isNaN(d.getTime())) return null
  return Math.floor((to.getTime() - d.getTime()) / 86_400_000)
}

export default async function LifeIssueDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params

  const [issueRes, notesRes] = await Promise.all([
    supabaseLife
      .from("life_issues")
      .select(
        "id, title, description, domain, severity, status, target_date, linked_goal_id, notes, resolved_at, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseLife
      .from("thought_notes")
      .select("id, title, content, created_at")
      .eq("linked_issue_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  if (!issueRes.data) notFound()
  const issue = issueRes.data as {
    id: string
    title: string | null
    description: string | null
    domain: string | null
    severity: string | null
    status: string | null
    target_date: string | null
    linked_goal_id: string | null
    notes: string | null
    resolved_at: string | null
    created_at: string | null
    updated_at: string | null
  }
  const notes = notesRes.data ?? []

  type LinkedGoal = { id: string; title: string | null } | null
  let linkedGoal: LinkedGoal = null
  if (issue.linked_goal_id) {
    const { data } = await supabaseLife
      .from("life_goals")
      .select("id, title")
      .eq("id", issue.linked_goal_id)
      .maybeSingle()
    linkedGoal = data as unknown as LinkedGoal
  }

  const age = daysBetween(issue.created_at)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title={issue.title ?? "Untitled issue"}
        subtitle={issue.description ?? undefined}
        breadcrumbs={[
          { label: "Life", href: "/life" },
          { label: "Issues", href: "/life/issues" },
          { label: issue.title ?? "Issue" },
        ]}
        actions={<IssueEditLauncher issue={issue} />}
      />

      <KPIGrid>
        <MetricCard
          label="Severity"
          value={issue.severity ?? "—"}
          icon={AlertTriangle}
          iconTone="red"
        />
        <MetricCard
          label="Status"
          value={issue.status ?? "—"}
          icon={Target}
          iconTone="amber"
        />
        <MetricCard
          label="Age"
          value={age !== null ? `${age} day${age === 1 ? "" : "s"}` : "—"}
          icon={Clock}
          iconTone="blue"
        />
        <MetricCard
          label="Domain"
          value={issue.domain ?? "—"}
          icon={CalendarDays}
          iconTone="violet"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <DetailCard title="Overview" className="lg:col-span-2">
          <div className="divide-y divide-border">
            <InfoRow
              label="Status"
              value={
                <StatusBadge tone={toneForStatus(issue.status)}>
                  {issue.status ?? "—"}
                </StatusBadge>
              }
            />
            <InfoRow
              label="Severity"
              value={
                <StatusBadge tone={toneForStatus(issue.severity)}>
                  {issue.severity ?? "—"}
                </StatusBadge>
              }
            />
            <InfoRow label="Domain" value={issue.domain ?? "—"} />
            <InfoRow label="Target date" value={formatDate(issue.target_date)} />
            <InfoRow label="Opened" value={formatDate(issue.created_at)} />
            <InfoRow label="Updated" value={formatDate(issue.updated_at)} />
            {issue.resolved_at && (
              <InfoRow label="Resolved" value={formatDate(issue.resolved_at)} />
            )}
            <InfoRow
              label="Linked goal"
              value={
                linkedGoal ? (
                  <Link
                    href={`/life/goals/${linkedGoal.id}`}
                    className="text-primary hover:underline"
                  >
                    {linkedGoal.title ?? "Goal"}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
          </div>
        </DetailCard>

        <DetailCard title="Notes">
          {issue.notes ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {issue.notes}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          )}
        </DetailCard>
      </div>

      <DetailCard title={`Thought notes (${notes.length})`}>
        {notes.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Nothing linked"
            description="Thought notes tagged to this issue will appear here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {notes.map((n) => (
              <li key={n.id} className="py-2.5">
                <div className="text-sm font-medium">
                  {n.title ?? "Untitled note"}
                </div>
                {n.content && (
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {n.content}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(n.created_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DetailCard>
    </div>
  )
}
