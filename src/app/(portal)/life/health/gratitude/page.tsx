import { Heart, Flame, CalendarDays, Sparkles } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
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
export const metadata = { title: "Gratitude — Life | Suprans" }

interface GratitudeRow {
  id: string
  date: string | null
  item_1: string | null
  item_2: string | null
  item_3: string | null
}

async function fetchGratitude() {
  const { data, error } = await supabaseLife
    .from("gratitude_logs")
    .select("id, date, item_1, item_2, item_3")
    .order("date", { ascending: false })
    .limit(200)
  if (error) console.error("life.gratitude_logs:", error.message)
  return (data ?? []) as GratitudeRow[]
}

function streak(rows: GratitudeRow[]): number {
  const dates = new Set(
    rows.map((r) => r.date).filter((d): d is string => typeof d === "string"),
  )
  let count = 0
  const cur = new Date()
  for (;;) {
    const k = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`
    if (dates.has(k)) {
      count++
      cur.setDate(cur.getDate() - 1)
    } else {
      break
    }
  }
  return count
}

export default async function LifeGratitudePage() {
  const rows = await fetchGratitude()
  const now = new Date()
  const monthRows = rows.filter((r) => {
    if (!r.date) return false
    const d = new Date(r.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Gratitude"
        subtitle={`${rows.length.toLocaleString("en-IN")} entr${rows.length === 1 ? "y" : "ies"}`}
        actions={
          <GenericAddLauncher
            table="gratitude_logs"
            listHref="/life/health/gratitude"
            title="Log gratitude"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Current streak" value={`${streak(rows)} days`} icon={Flame} iconTone="amber" />
        <MetricCard label="Entries this month" value={monthRows.length} icon={CalendarDays} iconTone="blue" />
        <MetricCard label="Total entries" value={rows.length} icon={Heart} iconTone="red" />
        <MetricCard
          label="Last entry"
          value={rows[0]?.date ? formatDate(rows[0].date) : "—"}
          icon={Sparkles}
          iconTone="emerald"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No gratitude entries"
          description="Three things, daily. Boring practice, outsized return — keeps perspective when noise is loud."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item 1</TableHead>
                <TableHead>Item 2</TableHead>
                <TableHead>Item 3</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{formatDate(r.date)}</TableCell>
                  <TableCell className="text-sm max-w-md truncate">{r.item_1 ?? "—"}</TableCell>
                  <TableCell className="text-sm max-w-md truncate">{r.item_2 ?? "—"}</TableCell>
                  <TableCell className="text-sm max-w-md truncate">{r.item_3 ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
