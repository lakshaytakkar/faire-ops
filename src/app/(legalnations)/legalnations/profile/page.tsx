import { supabaseLegal } from "@/lib/supabase"
import { LnTopbar } from "@/components/legalnations/ln-topbar"
import { User } from "lucide-react"

export const dynamic = "force-dynamic"

const PLAN_BADGE: Record<string, string> = {
  Elite: "bg-[hsl(42_80%_92%)] text-[hsl(42_60%_30%)] border-[hsl(42_60%_70%)]",
  Pro: "bg-emerald-50 text-[hsl(160_45%_22%)] border-emerald-200",
  Starter: "bg-blue-50 text-blue-700 border-blue-200",
  Basic: "bg-slate-100 text-slate-600 border-slate-300",
}

const LLC_STATUS_BADGE: Record<string, string> = {
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
}

function formatCurrency(v: number | null | undefined) {
  if (v == null) return "--"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v)
}

function formatDate(d: string | null | undefined) {
  if (!d) return "--"
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatStatus(s: string) {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function maskValue(val: string | null | undefined) {
  if (!val) return null
  const last4 = val.slice(-4)
  return `\u2022\u2022\u2022\u2022 ${last4}`
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-[hsl(40_10%_92%)] last:border-0">
      <span className="text-sm text-[hsl(200_8%_46%)]">{label}</span>
      <span className="text-sm font-medium">{value ?? "--"}</span>
    </div>
  )
}

export default async function ProfilePage() {
  const { data: clients } = await supabaseLegal
    .from("clients")
    .select("*")
    .limit(1)
  const client = clients?.[0] as Record<string, unknown> | undefined

  const clientName = (client?.client_name as string) ?? "Client"
  const initials = clientName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const plan = (client?.plan as string) ?? ""
  const planBadge = PLAN_BADGE[plan] ?? "bg-slate-100 text-slate-600 border-slate-300"

  const llcStatus = (client?.llc_status as string) ?? ""
  const llcBadge =
    LLC_STATUS_BADGE[llcStatus.toLowerCase()] ??
    "bg-slate-100 text-slate-600 border-slate-300"

  const amountReceived = client?.amount_received as number | null | undefined
  const remainingPayment = client?.remaining_payment as number | null | undefined

  const bankName = client?.bank_name as string | null | undefined
  const bankAccount = client?.bank_account_number as string | null | undefined
  const routingNumber = client?.routing_number as string | null | undefined
  const hasBanking = bankName || bankAccount || routingNumber

  return (
    <div className="min-h-screen bg-[hsl(0_0%_99%)]">
      <LnTopbar />

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-[hsl(200_15%_12%)]">
            My Profile
          </h1>
          <p className="text-sm text-[hsl(200_8%_46%)] mt-1">
            View your account and LLC details
          </p>
        </div>

        {/* 2-col layout */}
        <div className="grid md:grid-cols-[2fr_1fr] gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-5">
              <h2 className="text-[0.9375rem] font-semibold tracking-tight text-[hsl(200_15%_12%)] mb-3">
                Personal Information
              </h2>
              <InfoRow label="Full Name" value={client?.client_name as string} />
              <InfoRow label="Email" value={client?.email as string} />
              <InfoRow label="Phone" value={client?.contact_number as string} />
              <InfoRow label="Country" value={client?.country as string} />
              <InfoRow
                label="Plan"
                value={
                  plan ? (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${planBadge}`}
                    >
                      {plan}
                    </span>
                  ) : (
                    "--"
                  )
                }
              />
              <InfoRow
                label="Client Code"
                value={
                  client?.client_code ? (
                    <span className="font-mono text-sm">
                      {client.client_code as string}
                    </span>
                  ) : (
                    "--"
                  )
                }
              />
            </div>

            {/* LLC Details */}
            <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-5">
              <h2 className="text-[0.9375rem] font-semibold tracking-tight text-[hsl(200_15%_12%)] mb-3">
                LLC Details
              </h2>
              <InfoRow label="LLC Name" value={client?.llc_name as string} />
              <InfoRow
                label="LLC Status"
                value={
                  llcStatus ? (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${llcBadge}`}
                    >
                      {formatStatus(llcStatus)}
                    </span>
                  ) : (
                    "--"
                  )
                }
              />
              <InfoRow
                label="EIN"
                value={
                  client?.ein ? (
                    <span className="font-mono text-sm">
                      {client.ein as string}
                    </span>
                  ) : (
                    <span className="text-amber-600 text-sm">Pending</span>
                  )
                }
              />
              <InfoRow label="LLC Email" value={client?.llc_email as string} />
              <InfoRow label="LLC Address" value={client?.llc_address as string} />
              <InfoRow
                label="Website"
                value={
                  client?.website_url ? (
                    <a
                      href={client.website_url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[hsl(160_45%_22%)] hover:underline"
                    >
                      {client.website_url as string}
                    </a>
                  ) : (
                    "--"
                  )
                }
              />
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Account Summary */}
            <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-5">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="size-16 rounded-full bg-[hsl(160_45%_22%)] flex items-center justify-center text-white text-lg font-bold mb-2">
                  {initials}
                </div>
                <p className="text-sm font-semibold text-[hsl(200_15%_12%)]">
                  {clientName}
                </p>
                {plan && (
                  <span
                    className={`mt-1 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${planBadge}`}
                  >
                    {plan}
                  </span>
                )}
              </div>

              <div className="border-t border-[hsl(40_10%_92%)] pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-[hsl(200_8%_46%)]">
                    Amount Received
                  </span>
                  <span className="text-sm font-semibold text-[hsl(160_45%_22%)]">
                    {formatCurrency(amountReceived)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[hsl(200_8%_46%)]">
                    Remaining Payment
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      remainingPayment && remainingPayment > 0
                        ? "text-amber-600"
                        : "text-[hsl(200_15%_12%)]"
                    }`}
                  >
                    {formatCurrency(remainingPayment)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[hsl(200_8%_46%)]">
                    Member since
                  </span>
                  <span className="text-sm font-medium">
                    {formatDate(client?.date_of_onboarding as string)}
                  </span>
                </div>
              </div>
            </div>

            {/* Banking Details */}
            <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-5">
              <h2 className="text-[0.9375rem] font-semibold tracking-tight text-[hsl(200_15%_12%)] mb-3">
                Banking Details
              </h2>
              {hasBanking ? (
                <>
                  <InfoRow label="Bank Name" value={bankName} />
                  <InfoRow
                    label="Account"
                    value={maskValue(bankAccount as string) ?? "--"}
                  />
                  <InfoRow
                    label="Routing"
                    value={maskValue(routingNumber as string) ?? "--"}
                  />
                </>
              ) : (
                <p className="text-sm text-[hsl(200_8%_46%)] py-2">
                  Not yet configured
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
