import Link from "next/link"
import { Compass } from "lucide-react"
import { supabaseGoyo } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatMoney, tourStatusTone } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Tours — by type | Goyo | Suprans" }

interface TourRow {
  id: string
  name: string | null
  type: string | null
  destination: string | null
  duration_days: number | null
  base_price: number | string | null
  currency: string | null
  status: string | null
  highlights: string | null
}

export default async function GoyoToursByTypePage() {
  const toursRes = await supabaseGoyo
    .from("tours")
    .select(
      "id, name, type, destination, duration_days, base_price, currency, status, highlights",
    )
    .order("name", { ascending: true })

  const tours = (toursRes.data ?? []) as TourRow[]

  const groups = new Map<string, TourRow[]>()
  for (const t of tours) {
    const key = t.type && t.type.trim() ? t.type : "Uncategorised"
    const list = groups.get(key) ?? []
    list.push(t)
    groups.set(key, list)
  }
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Tours — by type"
        subtitle={`${tours.length.toLocaleString("en-IN")} tour${tours.length === 1 ? "" : "s"} across ${sorted.length.toLocaleString("en-IN")} type${sorted.length === 1 ? "" : "s"}`}
      />

      {tours.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No tours yet"
          description="Add your first tour to start grouping by type."
        />
      ) : (
        <div className="space-y-4">
          {sorted.map(([type, items]) => (
            <DetailCard key={type} title={`${type} (${items.length})`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((t) => (
                  <Link key={t.id} href={`/goyo/tours/${t.id}`}>
                    <div className="rounded-lg border bg-card p-4 hover:border-foreground/20 hover:shadow-sm transition space-y-2 h-full">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug">
                          {t.name ?? "Untitled tour"}
                        </p>
                        {t.status && (
                          <StatusBadge tone={tourStatusTone(t.status)}>
                            {t.status}
                          </StatusBadge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground tabular-nums">
                        {t.destination ?? "—"}
                        {t.duration_days
                          ? ` · ${t.duration_days}d`
                          : ""}
                      </div>
                      <div className="text-sm font-semibold tabular-nums">
                        {t.base_price !== null
                          ? formatMoney(Number(t.base_price), t.currency)
                          : "—"}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </DetailCard>
          ))}
        </div>
      )}
    </div>
  )
}
