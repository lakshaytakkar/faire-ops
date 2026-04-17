import { notFound } from "next/navigation"
import Link from "next/link"
import { Target, Flag, TrendingUp, CalendarDays } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDate } from "@/lib/format"
import { GoalEditLauncher } from "./GoalEditLauncher"

export const dynamic = "force-dynamic"

type Params = { id: string }

interface Milestone {
  title?: string
  done?: boolean
  due?: string
}

export default async function LifeGoalDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params

  const [goalRes, notesRes, capturesRes] = await Promise.all([
    supabaseLife
      .from("life_goals")
      .select(
        "id, title, description, why, domain, horizon, status, progress, milestones, completed_at, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseLife
      .from("thought_notes")
      .select("id, title, content, created_at")
      .eq("linked_goal_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseLife
      .from("captures")
      .select("id, content, source, status, created_at")
      .eq("linked_goal_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  if (!goalRes.data) notFound()
  const goal = goalRes.data as {
    id: string
    title: string | null
    description: string | null
    why: string | null
    domain: string | null
    horizon: string | null
    status: string | null
    progress: number | null
    milestones: Milestone[] | null
    completed_at: string | null
    created_at: string | null
    updated_at: string | null
  }
  const notes = notesRes.data ?? []
  const captures = capturesRes.data ?? []

  const milestones = Array.isArray(goal.milestones) ? goal.milestones : []

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title={goal.title ?? "Untitled goal"}
        subtitle={goal.description ?? undefined}
        breadcrumbs={[
          { label: "Life", href: "/life" },
          { label: "Goals", href: "/life/goals" },
          { label: goal.title ?? "Goal" },
        ]}
        actions={<GoalEditLauncher goal={goal} />}
      />

      <KPIGrid>
        <MetricCard
          label="Horizon"
          value={goal.horizon ?? "—"}
          icon={CalendarDays}
          iconTone="blue"
        />
        <MetricCard
          label="Domain"
          value={goal.domain ?? "—"}
          icon={Target}
          iconTone="violet"
        />
        <MetricCard
          label="Progress"
          value={goal.progress !== null ? `${goal.progress}%` : "—"}
          icon={TrendingUp}
          iconTone="emerald"
        />
        <MetricCard
          label="Status"
          value={goal.status ?? "—"}
          icon={Flag}
          iconTone="amber"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <DetailCard title="Overview" className="lg:col-span-2">
          <div className="divide-y divide-border">
            <InfoRow
              label="Status"
              value={
                <StatusBadge tone={toneForStatus(goal.status)}>
                  {goal.status ?? "—"}
                </StatusBadge>
              }
            />
            <InfoRow label="Horizon" value={goal.horizon ?? "—"} />
            <InfoRow label="Domain" value={goal.domain ?? "—"} />
            <InfoRow
              label="Progress"
              value={
                <span className="tabular-nums">
                  {goal.progress !== null ? `${goal.progress}%` : "—"}
                </span>
              }
            />
            <InfoRow label="Created" value={formatDate(goal.created_at)} />
            <InfoRow label="Updated" value={formatDate(goal.updated_at)} />
            {goal.completed_at && (
              <InfoRow label="Completed" value={formatDate(goal.completed_at)} />
            )}
          </div>
        </DetailCard>

        <DetailCard title="Why">
          {goal.why ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{goal.why}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No reason captured yet.</p>
          )}
        </DetailCard>
      </div>

      <DetailCard title={`Milestones (${milestones.length})`}>
        {milestones.length === 0 ? (
          <EmptyState
            icon={Flag}
            title="No milestones yet"
            description="Break this goal into the sub-steps that make it real."
          />
        ) : (
          <ul className="divide-y divide-border">
            {milestones.map((m, i) => (
              <li
                key={i}
                className="flex items-center justify-between py-2.5 gap-3"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <span
                    className={
                      m.done
                        ? "size-2 rounded-full bg-emerald-500 shrink-0"
                        : "size-2 rounded-full bg-slate-300 shrink-0"
                    }
                  />
                  <span className="text-sm truncate">
                    {m.title ?? "Untitled milestone"}
                  </span>
                </div>
                {m.due && (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {formatDate(m.due)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </DetailCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DetailCard title={`Linked notes (${notes.length})`}>
          {notes.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No notes linked"
              description="Thought notes tagged to this goal will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {notes.map((n) => (
                <li key={n.id} className="py-2.5">
                  <Link
                    href="/life/journal/thoughts"
                    className="block hover:text-primary"
                  >
                    <div className="text-sm font-medium truncate">
                      {n.title ?? "Untitled note"}
                    </div>
                    {n.content && (
                      <div className="text-sm text-muted-foreground truncate">
                        {n.content}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(n.created_at)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>

        <DetailCard title={`Linked captures (${captures.length})`}>
          {captures.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No captures linked"
              description="Quick ideas tagged to this goal will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {captures.map((c) => (
                <li key={c.id} className="py-2.5">
                  <Link
                    href={`/life/growth/captures/${c.id}`}
                    className="block hover:text-primary"
                  >
                    <div className="text-sm truncate">{c.content ?? "—"}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.status && (
                        <StatusBadge tone={toneForStatus(c.status)}>
                          {c.status}
                        </StatusBadge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(c.created_at)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      </div>
    </div>
  )
}
