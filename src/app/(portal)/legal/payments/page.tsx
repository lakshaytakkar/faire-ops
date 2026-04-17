import { CreditCard, Wallet, Hash, TrendingUp } from "lucide-react"
import { supabaseLegal } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { GenericAddLauncher } from "../_components/GenericEditLauncher"
import { formatINR } from "../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Payments — Legal | Suprans" }

interface PaymentRow {
  id: string
  client_id: string | null
  amount: number | null
  currency: string | null
  payment_date: string | null
  payment_method: string | null
  reference: string | null
  created_at: string | null
}

interface ClientLookup {
  id: string
  client_name: string | null
}

export default async function PaymentsPage() {
  const [payRes, clientRes] = await Promise.all([
    supabaseLegal
      .from("payments")
      .select(
        "id, client_id, amount, currency, payment_date, payment_method, reference, created_at",
      )
      .order("created_at", { ascending: false }),
    supabaseLegal.from("clients").select("id, client_name"),
  ])

  if (payRes.error) console.error("legal.payments:", payRes.error.message)
  if (clientRes.error) console.error("legal.clients lookup:", clientRes.error.message)

  const rows = (payRes.data ?? []) as PaymentRow[]
  const clients = (clientRes.data ?? []) as ClientLookup[]
  const clientMap = new Map(clients.map((c) => [c.id, c.client_name ?? "—"]))

  const totalCollected = rows.reduce((s, r) => s + (r.amount ?? 0), 0)
  const avgPayment = rows.length > 0 ? totalCollected / rows.length : 0

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Payments"
        subtitle={`${rows.length.toLocaleString("en-IN")} payment${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="payments"
            listHref="/legal/payments"
            title="New payment"
            size="lg"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total Collected"
          value={formatINR(totalCollected)}
          icon={Wallet}
          iconTone="emerald"
        />
        <MetricCard
          label="Payment Count"
          value={rows.length}
          icon={Hash}
          iconTone="blue"
        />
        <MetricCard
          label="Avg Payment"
          value={formatINR(avgPayment)}
          icon={TrendingUp}
          iconTone="amber"
        />
      </KPIGrid>

      <DetailCard title="Payment ledger">
        {rows.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payments recorded"
            description="Add your first payment to start tracking the ledger."
          />
        ) : (
          <Card className="overflow-hidden p-0 gap-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right w-[140px]">Amount</TableHead>
                  <TableHead className="w-[80px]">Currency</TableHead>
                  <TableHead className="w-[140px]">Payment Date</TableHead>
                  <TableHead className="w-[120px]">Method</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm font-medium">
                      {r.client_id ? clientMap.get(r.client_id) ?? r.client_id : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {formatINR(r.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.currency ?? "INR"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {r.payment_date ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.payment_method ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.reference ?? "—"}
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
