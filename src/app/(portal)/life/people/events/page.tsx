import { Cake, Calendar, Gift, Bell } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Events — Life | Suprans" }

interface EventRow {
  id: string
  title: string | null
  date: string | null
  category: string | null
  location: string | null
  notes: string | null
}

async function fetchEvents() {
  const { data, error } = await supabaseLife
    .from("relationship_events")
    .select("id, title, date, category, location, notes")
    .order("date", { ascending: true })
    .limit(500)
  if (error) console.error("life.relationship_events:", error.message)
  return (data ?? []) as EventRow[]
}

export default async function LifeEventsPage() {
  const rows = await fetchEvents()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcoming = rows.filter((r) => {
    if (!r.date) return false
    return new Date(r.date) >= today
  })
  const next30 = rows.filter((r) => {
    if (!r.date) return false
    const d = new Date(r.date)
    const in30 = new Date(today.getTime() + 30 * 86400000)
    return d >= today && d <= in30
  })
  const categories = new Set(rows.map((r) => r.category).filter(Boolean)).size

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        actions={
          <GenericAddLauncher
            table="relationship_events"
            listHref="/life/people/events"
            title="New event"
          />
        }
        title="Events"
        subtitle={`${rows.length.toLocaleString("en-IN")} event${rows.length === 1 ? "" : "s"}`}
      />

      <KPIGrid>
        <MetricCard label="Upcoming" value={upcoming.length} icon={Calendar} iconTone="blue" />
        <MetricCard label="Next 30 days" value={next30.length} icon={Bell} iconTone="amber" />
        <MetricCard label="Categories" value={categories} icon={Cake} iconTone="violet" />
        <MetricCard label="All-time" value={rows.length} icon={Gift} iconTone="slate" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Cake}
          title="No events tracked"
          description="Birthdays, anniversaries, milestones — the dates that matter to people who matter."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.title ?? "—"}</TableCell>
                  <TableCell className="text-sm">{formatDate(r.date)}</TableCell>
                  <TableCell>
                    {r.category ? <StatusBadge tone="violet">{r.category}</StatusBadge> : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.location ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                    {r.notes ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
