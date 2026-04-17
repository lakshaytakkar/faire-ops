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
import { GenericAddLauncher } from "../_components/GenericEditLauncher"
import { clientStatusTone, formatINR } from "../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Clients — Goyo | Suprans" }

interface ClientRow {
  id: string
  client_code: string | null
  name: string | null
  phone: string | null
  email: string | null
  place: string | null
  meal_preference: string | null
  passport_no: string | null
  passport_expiry: string | null
  nationality: string | null
  status: string | null
  total_bookings: number | null
  total_spent: number | null
  last_booking_at: string | null
  pan_gst_received: boolean | null
  documents_received: boolean | null
  source: string | null
  created_at: string | null
}

function passportExpiryWarning(expiry: string | null): boolean {
  if (!expiry) return false
  const days = (new Date(expiry).getTime() - Date.now()) / 86_400_000
  return days >= 0 && days < 60
}

export default async function GoyoClientsPage() {
  const { data, error } = await supabaseGoyo
    .from("clients")
    .select(
      "id, client_code, name, phone, email, place, meal_preference, passport_no, passport_expiry, nationality, status, total_bookings, total_spent, last_booking_at, pan_gst_received, documents_received, source, created_at",
    )
    .order("client_code", { ascending: true })

  if (error) console.error("goyo.clients:", error.message)
  const rows = (data ?? []) as ClientRow[]

  const total = rows.length
  const activeCount = rows.filter((r) => r.status === "active").length
  const churnedCount = rows.filter((r) => r.status === "churned").length
  const totalSpent = rows.reduce((s, r) => s + (Number(r.total_spent) || 0), 0)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Clients"
        subtitle={`${total.toLocaleString("en-IN")} client${total === 1 ? "" : "s"}`}
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
          href="/goyo/clients/active"
        />
        <MetricCard
          label="Cancelled"
          value={churnedCount}
          icon={Crown}
          iconTone="red"
        />
        <MetricCard
          label="Total spent (₹)"
          value={formatINR(totalSpent)}
          icon={Wallet}
          iconTone="blue"
        />
      </KPIGrid>

      <DetailCard title="All clients">
        {rows.length === 0 ? (
          <EmptyState
            icon={UserCircle}
            title="No clients yet"
            description="Add your first client to start tracking bookings, payments, and visas."
          />
        ) : (
          <Card className="overflow-hidden p-0 gap-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Place</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[80px] text-center">Docs</TableHead>
                  <TableHead className="w-[140px] text-right">Total spent</TableHead>
                  <TableHead className="w-[80px]">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm tabular-nums font-medium">
                        <Link
                          href={`/goyo/clients/${r.id}`}
                          className="hover:text-primary"
                        >
                          {r.client_code ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/goyo/clients/${r.id}`}
                          className="hover:text-primary font-medium"
                        >
                          {r.name ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {r.phone ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.place ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={clientStatusTone(r.status)}>
                          {r.status ?? "—"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {r.pan_gst_received && r.documents_received ? "✓" : r.pan_gst_received ? "½" : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {formatINR(r.total_spent)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[100px]">
                        {r.source ? r.source.replace("Canton Fair ", "").replace("Trip", "") : "—"}
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
