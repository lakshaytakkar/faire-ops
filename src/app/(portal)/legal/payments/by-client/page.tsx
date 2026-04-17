import { CreditCard } from "lucide-react"
import { supabaseLegal } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
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
import { formatINR } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Payments by Client — Legal | Suprans" }

interface PaymentRow {
  id: string
  client_id: string | null
  amount: number | null
  currency: string | null
  payment_date: string | null
  payment_method: string | null
  reference: string | null
}

interface ClientLookup {
  id: string
  client_name: string | null
}

export default async function PaymentsByClientPage() {
  const [payRes, clientRes] = await Promise.all([
    supabaseLegal
      .from("payments")
      .select("id, client_id, amount, currency, payment_date, payment_method, reference")
      .order("payment_date", { ascending: false }),
    supabaseLegal.from("clients").select("id, client_name"),
  ])

  if (payRes.error) console.error("legal.payments by-client:", payRes.error.message)
  if (clientRes.error) console.error("legal.clients lookup:", clientRes.error.message)

  const rows = (payRes.data ?? []) as PaymentRow[]
  const clients = (clientRes.data ?? []) as ClientLookup[]
  const clientMap = new Map(clients.map((c) => [c.id, c.client_name ?? "—"]))

  // Group by client_id
  const grouped = new Map<string, PaymentRow[]>()
  for (const r of rows) {
    const key = r.client_id ?? "unknown"
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(r)
  }

  const sortedGroups = Array.from(grouped.entries()).sort(
    ([, a], [, b]) =>
      b.reduce((s, r) => s + (r.amount ?? 0), 0) -
      a.reduce((s, r) => s + (r.amount ?? 0), 0),
  )

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Payments by Client"
        subtitle={`${sortedGroups.length} client${sortedGroups.length === 1 ? "" : "s"} with payments`}
      />

      {sortedGroups.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments recorded"
          description="Payments grouped by client will appear here."
        />
      ) : (
        sortedGroups.map(([clientId, payments]) => {
          const clientName = clientMap.get(clientId) ?? clientId
          const total = payments.reduce((s, r) => s + (r.amount ?? 0), 0)

          return (
            <DetailCard
              key={clientId}
              title={`${clientName} — ${formatINR(total)}`}
            >
              <Card className="overflow-hidden p-0 gap-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right w-[140px]">Amount</TableHead>
                      <TableHead className="w-[80px]">Currency</TableHead>
                      <TableHead className="w-[140px]">Payment Date</TableHead>
                      <TableHead className="w-[120px]">Method</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((r) => (
                      <TableRow key={r.id}>
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
            </DetailCard>
          )
        })
      )}
    </div>
  )
}
