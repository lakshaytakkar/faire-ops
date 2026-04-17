import { Sparkles, Trophy, CalendarRange, Layers } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { TimelineList, type TimelineItem } from "@/components/shared/timeline-list"
import { type StatusTone } from "@/components/shared/status-badge"

export const dynamic = "force-dynamic"
export const metadata = { title: "Wins — Life | Suprans" }

interface WinRow {
  id: string
  title: string | null
  domain: string | null
  notes: string | null
  date: string | null
}

async function fetchWins() {
  const { data, error } = await supabaseLife
    .from("wins")
    .select("id, title, domain, notes, date")
    .order("date", { ascending: false })
    .limit(200)
  if (error) console.error("life.wins:", error.message)
  return (data ?? []) as WinRow[]
}

function domainTone(d: string | null): StatusTone {
  const key = (d ?? "").toLowerCase()
  if (key === "health") return "emerald"
  if (key === "wealth") return "amber"
  if (key === "career") return "blue"
  return "slate"
}

export default async function LifeWinsPage() {
  const rows = await fetchWins()

  const now = new Date()
  const thisMonth = rows.filter((r) => {
    if (!r.date) return false
    const d = new Date(r.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  const byDomain = rows.reduce<Record<string, number>>((acc, r) => {
    const k = r.domain ?? "other"
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
  const domainCount = Object.keys(byDomain).length
  const topDomain =
    Object.entries(byDomain).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"

  const items: TimelineItem[] = rows
    .filter((r) => r.date)
    .map((r) => ({
      id: r.id,
      date: r.date as string,
      title: r.title ?? "Untitled",
      body: r.notes ?? undefined,
      badge: r.domain ? { label: r.domain, tone: domainTone(r.domain) } : undefined,
    }))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        actions={
          <GenericAddLauncher
            table="wins"
            listHref="/life/journal/wins"
            title="New win"
          />
        }
        title="Wins"
        subtitle={`${rows.length.toLocaleString("en-IN")} win${rows.length === 1 ? "" : "s"}`}
      />

      <KPIGrid>
        <MetricCard label="Total wins" value={rows.length} icon={Trophy} iconTone="emerald" />
        <MetricCard label="This month" value={thisMonth} icon={CalendarRange} iconTone="amber" />
        <MetricCard label="Domains covered" value={domainCount} icon={Layers} iconTone="blue" />
        <MetricCard label="Top domain" value={topDomain} icon={Sparkles} iconTone="violet" />
      </KPIGrid>

      <TimelineList
        items={items}
        emptyMessage="No wins captured yet. Small, medium, big — log the things that went right. On rough days, the list is the proof."
      />
    </div>
  )
}
