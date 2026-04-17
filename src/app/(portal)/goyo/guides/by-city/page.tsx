import Link from "next/link"
import { Users } from "lucide-react"
import { supabaseGoyo } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
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
export const metadata = { title: "Guides — by city | Goyo | Suprans" }

interface GuideRow {
  id: string
  name: string | null
  languages: string[] | null
  cities: string[] | null
  daily_rate: number | string | null
  currency: string | null
  status: string | null
  rating: number | string | null
}

export default async function GoyoGuidesByCityPage() {
  const guidesRes = await supabaseGoyo
    .from("guides")
    .select(
      "id, name, languages, cities, daily_rate, currency, status, rating",
    )
    .order("name", { ascending: true })

  const guides = (guidesRes.data ?? []) as GuideRow[]

  const groups = new Map<string, GuideRow[]>()
  for (const g of guides) {
    const cities =
      g.cities && g.cities.length > 0 ? g.cities : ["Unassigned"]
    for (const city of cities) {
      const key = city && city.trim() ? city : "Unassigned"
      const list = groups.get(key) ?? []
      list.push(g)
      groups.set(key, list)
    }
  }
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Guides — by city"
        subtitle={`${guides.length.toLocaleString("en-IN")} guide${guides.length === 1 ? "" : "s"} across ${sorted.length.toLocaleString("en-IN")} cit${sorted.length === 1 ? "y" : "ies"}`}
      />

      {guides.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No guides yet"
          description="Add a guide with a list of cities to see them grouped here."
        />
      ) : (
        <div className="space-y-4">
          {sorted.map(([city, items]) => (
            <DetailCard key={city} title={`${city} (${items.length})`}>
              <Card className="p-0" size="sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Languages</TableHead>
                      <TableHead className="w-[160px] text-right">
                        Daily rate
                      </TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[100px] text-right">
                        Rating
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((g) => (
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
            </DetailCard>
          ))}
        </div>
      )}
    </div>
  )
}
