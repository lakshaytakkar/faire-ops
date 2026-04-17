import { supabaseLegal } from "@/lib/supabase"
import { LnTopbar } from "@/components/legalnations/ln-topbar"
import { CreditCard, Wallet, MessageSquare } from "lucide-react"

export const dynamic = "force-dynamic"

const METHOD_COLORS: Record<string, string> = {
  UPI: "bg-violet-50 text-violet-700 border-violet-200",
  upi: "bg-violet-50 text-violet-700 border-violet-200",
  bank_transfer: "bg-blue-50 text-blue-700 border-blue-200",
  cash: "bg-slate-100 text-slate-700 border-slate-200",
  card: "bg-emerald-50 text-emerald-700 border-emerald-200",
  other: "bg-gray-50 text-gray-600 border-gray-200",
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount)
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatMethod(m: string) {
  return m
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function PaymentsPage() {
  const { data: clients } = await supabaseLegal
    .from("clients")
    .select("*")
    .limit(1)
  const client = clients?.[0] as Record<string, unknown> | undefined
  const { data: payments } = await supabaseLegal
    .from("payments")
    .select("*")
    .eq("client_id", client?.id)
    .order("payment_date", { ascending: false })

  const allPayments = (payments ?? []) as Record<string, unknown>[]
  const totalPaid =
    (client?.amount_received as number) ||
    allPayments.reduce((sum, p) => sum + ((p.amount as number) || 0), 0)
  const remaining = (client?.remaining_payment as number) || 0
  const plan = (client?.plan as string) || "—"
  const totalSum = allPayments.reduce(
    (sum, p) => sum + ((p.amount as number) || 0),
    0
  )

  return (
    <div className="min-h-screen bg-[hsl(0_0%_99%)]">
      <LnTopbar />

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-[hsl(200_15%_12%)]">
            Payments
          </h1>
          <p className="text-sm text-[hsl(200_8%_46%)] mt-1">
            Your payment history and balance
          </p>
        </div>

        {/* Summary card */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Balance card */}
          <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-5 space-y-4">
            <div>
              <span className="text-xs font-medium text-[hsl(200_8%_46%)] uppercase tracking-wide">
                Total Paid
              </span>
              <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
                {formatINR(totalPaid)}
              </p>
            </div>

            <div>
              <span className="text-xs font-medium text-[hsl(200_8%_46%)] uppercase tracking-wide">
                Remaining Balance
              </span>
              <p
                className={`text-lg font-semibold tabular-nums mt-0.5 ${
                  remaining > 0
                    ? "text-amber-600"
                    : "text-[hsl(200_15%_12%)]"
                }`}
              >
                {formatINR(remaining)}
              </p>
            </div>

            <div>
              <span className="text-xs font-medium text-[hsl(200_8%_46%)] uppercase tracking-wide">
                Plan
              </span>
              <div className="mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded bg-[hsl(42_80%_55%)] text-[hsl(30_50%_12%)] border border-[hsl(42_60%_50%)]">
                  {plan}
                </span>
              </div>
            </div>
          </div>

          {/* CTA card */}
          {remaining > 0 && (
            <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-5 flex flex-col items-center justify-center text-center">
              <Wallet className="size-8 text-[hsl(42_80%_55%)] mb-3" />
              <p className="text-sm text-[hsl(200_8%_46%)] mb-4">
                You have an outstanding balance of{" "}
                <span className="font-semibold text-amber-600 tabular-nums">
                  {formatINR(remaining)}
                </span>
              </p>
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[hsl(42_80%_55%)] text-[hsl(30_50%_12%)] text-sm font-semibold hover:bg-[hsl(42_80%_48%)] transition-colors cursor-default">
                <MessageSquare className="size-4" />
                Contact to arrange payment
              </button>
            </div>
          )}
        </div>

        {/* Payment ledger */}
        {allPayments.length > 0 ? (
          <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(40_10%_88%)] bg-[hsl(40_8%_97%)]">
                    <th className="text-left px-5 py-3 text-xs font-medium text-[hsl(200_8%_46%)] uppercase tracking-wide">
                      Date
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-[hsl(200_8%_46%)] uppercase tracking-wide">
                      Amount
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[hsl(200_8%_46%)] uppercase tracking-wide">
                      Method
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[hsl(200_8%_46%)] uppercase tracking-wide">
                      Reference
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(40_10%_92%)]">
                  {allPayments.map((p) => {
                    const method = (p.method as string) || "other"
                    const methodClass =
                      METHOD_COLORS[method] || METHOD_COLORS.other

                    return (
                      <tr
                        key={p.id as string}
                        className="hover:bg-[hsl(40_8%_98%)] transition-colors"
                      >
                        <td className="px-5 py-3 text-[hsl(200_15%_12%)] whitespace-nowrap">
                          {formatDate(p.payment_date as string | null)}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-[hsl(200_15%_12%)] tabular-nums whitespace-nowrap">
                          {formatINR((p.amount as number) || 0)}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border ${methodClass}`}
                          >
                            {formatMethod(method)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[hsl(200_8%_46%)] truncate max-w-[200px]">
                          {(p.reference as string) || "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t border-[hsl(40_10%_88%)] px-5 py-3 flex items-center justify-between bg-[hsl(40_8%_97%)]">
              <span className="text-xs text-[hsl(200_8%_46%)]">
                {allPayments.length} payment{allPayments.length !== 1 && "s"}
              </span>
              <span className="text-sm font-semibold text-[hsl(200_15%_12%)] tabular-nums">
                {formatINR(totalSum)}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-10 text-center">
            <CreditCard className="mx-auto size-10 text-[hsl(200_8%_78%)] mb-3" />
            <p className="text-sm text-[hsl(200_8%_46%)]">
              No payments recorded yet
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
