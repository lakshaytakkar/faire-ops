import Link from "next/link"
import { Users, CheckCircle2, Briefcase, Star } from "lucide-react"
import { supabaseGoyo } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { formatMoney, guideStatusTone } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Guides — active | Goyo | Suprans" }

interface GuideRow {
  id: string
  name: string | null
  languages: string[] | null
  cities: string[] | null
  daily_rate: number | string | null
  currency: string | null
  status: string | null
  rating: number | string | null
  total_tours: number | null
}

export default async function GoyoGuidesActivePage() {
  const guidesRes = await supabaseGoyo
    .from("guides")
    .select(
      "id, name, languages, cities, daily_rate, currency, status, rating, total_tours",
    )
    .eq("status", "active")
    .order("rating", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true })

  const guides = (guidesRes.data ?? []) as GuideRow[]

  const onAssignmentRes = await supabaseGoyo
    .from("guides")
    .select("id", { count: "exact", head: true })
    .eq("status", "on_assignment")
  const onAssignment = onAssignmentRes.count ?? 0

  const totalRes = await supabaseGoyo
    .from("guides")
    .select("id", { count: "exact", head: true })
  const total = totalRes.count ?? 0

  const ratings = guides
    .map((g) => Number(g.rating))
    .filter((n) => Number.isFinite(n) && n > 0)
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((s, n) => s + n, 0) / ratings.length
      : 0

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Guides — active"
        subtitle={`${guides.length.toLocaleString("en-IN")} active guide${guides.length === 1 ? "" : "s"}`}
      />

      <KPIGrid>
        <MetricCard
          label="Total"
          value={total.toLocaleString("en-IN")}
          icon={Users}
          iconTone="blue"
        />
        <MetricCard
          label="Active"
          value={guides.length.toLocaleString("en-IN")}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="On assignment"
          value={onAssignment.toLocaleString("en-IN")}
          icon={Briefcase}
          iconTone="amber"
        />
        <MetricCard
          label="Avg rating (active)"
          value={
            <span className="tabular-nums">
              {avgRating ? avgRating.toFixed(1) : "—"}
            </span>
          }
          hint={avgRating ? "/ 5" : undefined}
          icon={Star}
          iconTone="violet"
        />
      </KPIGrid>

      <DetailCard title="Active guides">
        {guides.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No active guides"
            description="Set a guide's status to active to see them here."
          />
        ) : (
          <Card className="p-0" size="sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Languages</TableHead>
                  <TableHead>Cities</TableHead>
                  <TableHead className="w-[160px] text-right">
                    Daily rate
                  </TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[100px] text-right">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guides.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="text-sm font-medium">
                      <Link
                        href={`/goyo/guides/${g.id}`}
                        className="hover:underline"
                      >
                        {g.name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(g.languages ?? []).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(g.cities ?? []).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {g.daily_rate !== null
                        ? formatMoney(Number(g.daily_rate), g.currency)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={guideStatusTone(g.status)}>
                        {g.status ?? "—"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {g.rating !== null && g.rating !== undefined
                        ? `${Number(g.rating).toFixed(1)} / 5`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </DetailCard>
    </div>
  )
}
