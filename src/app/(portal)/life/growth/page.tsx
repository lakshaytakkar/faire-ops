import { Layers, BookOpen, Bookmark, ListVideo } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { DetailCard } from "@/components/shared/detail-views"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Growth — Life | Suprans" }

interface BookRow {
  id: string
  title: string | null
  status: string | null
  rating: number | null
  finished_at: string | null
}
interface CaptureRow {
  status: string | null
}
interface SkillRow {
  current_level: number | null
}
interface QueueRow {
  status: string | null
}

async function fetchGrowth() {
  const [books, captures, skills, queue] = await Promise.all([
    supabaseLife
      .from("books")
      .select("id, title, status, rating, finished_at")
      .order("finished_at", { ascending: false })
      .limit(50),
    supabaseLife.from("captures").select("status"),
    supabaseLife.from("skills").select("current_level"),
    supabaseLife.from("queue_items").select("status"),
  ])
  if (books.error) console.error("life.books:", books.error.message)
  if (captures.error) console.error("life.captures:", captures.error.message)
  if (skills.error) console.error("life.skills:", skills.error.message)
  if (queue.error) console.error("life.queue_items:", queue.error.message)

  return {
    books: (books.data ?? []) as BookRow[],
    captures: (captures.data ?? []) as CaptureRow[],
    skills: (skills.data ?? []) as SkillRow[],
    queue: (queue.data ?? []) as QueueRow[],
  }
}

export default async function LifeGrowthPage() {
  const { books, captures, skills, queue } = await fetchGrowth()

  const reading = books.filter((b) => b.status === "reading").length
  const pendingCaptures = captures.filter((c) => c.status === "saved" || c.status === "pending").length
  const queueSize = queue.filter((q) => q.status !== "done" && q.status !== "consumed").length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader title="Growth" subtitle="Books, skills, captures, and the queue." />

      <KPIGrid>
        <MetricCard label="Books in progress" value={reading} icon={BookOpen} iconTone="blue" />
        <MetricCard label="Captures pending" value={pendingCaptures} icon={Bookmark} iconTone="amber" />
        <MetricCard label="Skills tracked" value={skills.length} icon={Layers} iconTone="violet" />
        <MetricCard label="Queue size" value={queueSize} icon={ListVideo} iconTone="emerald" />
      </KPIGrid>

      <DetailCard title="Recent books">
        {books.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No books yet"
            description="Track every book — reading, finished, dropped. Your library is your worldview, written down."
          />
        ) : (
          <ul className="divide-y divide-border">
            {books.slice(0, 8).map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{b.title ?? "Untitled"}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.finished_at ? `Finished ${formatDate(b.finished_at)}` : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {b.rating !== null && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {b.rating}/5
                    </span>
                  )}
                  <StatusBadge tone={toneForStatus(b.status)}>{b.status ?? "—"}</StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DetailCard>
    </div>
  )
}
