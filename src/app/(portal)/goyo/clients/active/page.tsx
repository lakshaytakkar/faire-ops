import Link from "next/link"
import { UserCircle, CheckCircle2, Crown, Wallet } from "lucide-react"
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
import { formatDate } from "@/lib/format"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { clientStatusTone, formatINR } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Active clients — Goyo | Suprans" }

interface ClientRow {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  passport_no: string | null
  passport_expiry: string | null
  nationality: string | null
  status: string | null
  total_bookings: number | null
  total_spent: number | null
  last_booking_at: string | null
  created_at: string | null
}

function passportExpiryWarning(expiry: string | null): boolean {
  if (!expiry) return false
  const days = (new Date(expiry).getTime() - Date.now()) / 86_400_000
  return days >= 0 && days < 60
}

export default async function GoyoActiveClientsPage() {
  const { data, error } = await supabaseGoyo
    .from("clients")
    .select(
      "id, name, phone, email, passport_no, passport_expiry, nationality, status, total_bookings, total_spent, last_booking_at, created_at",
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })

  if (error) console.error("goyo.clients:", error.message)
  const rows = (data ?? []) as ClientRow[]

  const total = rows.length
  const activeCount = rows.length
  const vipCount = rows.filter((r) => r.status === "vip").length
  const totalSpent = rows.reduce((s, r) => s + (Number(r.total_spent) || 0), 0)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Active clients"
        subtitle={`${total.toLocaleString("en-IN")} active`}
        actions={
          <GenericAddLauncher
            table="clients"
            listHref="/goyo/clients"
            title="New client"
            size="lg"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total"
          value={total}
          icon={UserCircle}
          iconTone="slate"
        />
        <MetricCard
          label="Active"
          value={activeCount}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="VIP"
          value={vipCount}
          icon={Crown}
          iconTone="violet"
        />
        <MetricCard
          label="Total spent (₹)"
          value={formatINR(totalSpent)}
          icon={Wallet}
          iconTone="blue"
        />
      </KPIGrid>

      <DetailCard title="Active clients">
        {rows.length === 0 ? (
          <EmptyState
            icon={UserCircle}
            title="No active clients"
            description="Mark a client as active when they confirm their first booking."
          />
        ) : (
          <Card className="overflow-hidden p-0 gap-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="w-[200px]">Passport</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[100px] text-right">Bookings</TableHead>
                  <TableHead className="w-[140px] text-right">Total spent</TableHead>
                  <TableHead className="w-[130px]">Last booking</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const warn = passportExpiryWarning(r.passport_expiry)
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link
                          href={`/goyo/clients/${r.id}`}
                          className="hover:text-primary font-medium"
                        >
                          {r.name ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.email ?? r.phone ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {r.passport_no ? (
                          <span>
                            {r.passport_no}
                            {r.passport_expiry && (
                              <span
                                className={
                                  warn
                                    ? "ml-1 text-amber-600 font-medium"
                                    : "ml-1 text-muted-foreground"
                                }
                              >
                                · {formatDate(r.passport_expiry)}
                              </span>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={clientStatusTone(r.status)}>
                          {r.status ?? "—"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {r.total_bookings ?? 0}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {formatINR(r.total_spent)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {formatDate(r.last_booking_at)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </DetailCard>
    </div>
  )
}
