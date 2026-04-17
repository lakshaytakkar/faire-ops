import { Repeat, Plane, ListChecks, FolderKanban } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { DetailCard } from "@/components/shared/detail-views"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Plans — Life | Suprans" }

interface HabitRow {
  status: string | null
}
interface TripRow {
  id: string
  destination: string | null
  start_date: string | null
  status: string | null
}
interface BucketRow {
  status: string | null
}
interface ProjectRow {
  id: string
  name: string | null
  status: string | null
  progress: number | null
}

async function fetchPlans() {
  const [habits, trips, bucket, projects] = await Promise.all([
    supabaseLife.from("habits").select("status"),
    supabaseLife
      .from("trips")
      .select("id, destination, start_date, status")
      .order("start_date", { ascending: true })
      .limit(20),
    supabaseLife.from("bucket_list").select("status"),
    supabaseLife
      .from("personal_projects")
      .select("id, name, status, progress")
      .order("progress", { ascending: false })
      .limit(20),
  ])
  if (habits.error) console.error("life.habits:", habits.error.message)
  if (trips.error) console.error("life.trips:", trips.error.message)
  if (bucket.error) console.error("life.bucket_list:", bucket.error.message)
  if (projects.error) console.error("life.personal_projects:", projects.error.message)

  return {
    habits: (habits.data ?? []) as HabitRow[],
    trips: (trips.data ?? []) as TripRow[],
    bucket: (bucket.data ?? []) as BucketRow[],
    projects: (projects.data ?? []) as ProjectRow[],
  }
}

export default async function LifePlansPage() {
  const { habits, trips, bucket, projects } = await fetchPlans()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const activeHabits = habits.filter((h) => h.status === "active").length
  const upcomingTrips = trips.filter(
    (t) => t.start_date && new Date(t.start_date) >= today,
  ).length
  const bucketDone = bucket.filter((b) => b.status === "done").length
  const bucketTotal = bucket.length
  const activeProjects = projects.filter(
    (p) => p.status === "in_progress" || p.status === "active",
  ).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader title="Plans" subtitle="Habits, projects, trips, and the bucket list." />

      <KPIGrid>
        <MetricCard label="Active habits" value={activeHabits} icon={Repeat} iconTone="emerald" />
        <MetricCard label="Upcoming trips" value={upcomingTrips} icon={Plane} iconTone="blue" />
        <MetricCard
          label="Bucket progress"
          value={`${bucketDone} / ${bucketTotal}`}
          icon={ListChecks}
          iconTone="violet"
        />
        <MetricCard label="Active projects" value={activeProjects} icon={FolderKanban} iconTone="amber" />
      </KPIGrid>

      <DetailCard title="Active personal projects">
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No personal projects"
            description="Side projects keep curiosity alive. Track the ones you're chipping at."
          />
        ) : (
          <ul className="divide-y divide-border">
            {projects.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.name ?? "Untitled"}</div>
                  {p.progress !== null && (
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {p.progress}% complete
                    </div>
                  )}
                </div>
                <StatusBadge tone={toneForStatus(p.status)}>{p.status ?? "—"}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </DetailCard>

      <DetailCard title="Next trips">
        {trips.length === 0 ? (
          <EmptyState
            icon={Plane}
            title="No trips planned"
            description="Travel that's still an idea — and the ones already booked — both live here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {trips.slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.destination ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(t.start_date)}</div>
                </div>
                <StatusBadge tone={toneForStatus(t.status)}>{t.status ?? "—"}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </DetailCard>
    </div>
  )
}
