/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseLegal } from "@/lib/supabase"
import { LnTopbar } from "@/components/legalnations/ln-topbar"
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  Receipt,
} from "lucide-react"

export const dynamic = "force-dynamic"

const STATUS_COLORS: Record<string, string> = {
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Filed: "bg-blue-50 text-blue-700 border-blue-200",
  "In progress": "bg-amber-50 text-amber-700 border-amber-200",
  "Document Collection": "bg-violet-50 text-violet-700 border-violet-200",
  Pending: "bg-slate-100 text-slate-700 border-slate-200",
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount)
}

function BoolIcon({ value }: { value: boolean }) {
  return value ? (
    <CheckCircle2 className="size-4 text-emerald-500" />
  ) : (
    <XCircle className="size-4 text-slate-300" />
  )
}

export default async function TaxFilingsPage() {
  const { data: clients } = await supabaseLegal
    .from("clients")
    .select("id")
    .limit(1)
  const clientId = clients?.[0]?.id
  const { data: filings } = await supabaseLegal
    .from("tax_filings")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  const allFilings = (filings ?? []) as any[]
  const totalCount = allFilings.length
  const completedCount = allFilings.filter(
    (f: Record<string, unknown>) =>
      f.filing_done === true || f.status === "Completed"
  ).length
  const inProgressCount = allFilings.filter(
    (f: Record<string, unknown>) =>
      ["In progress", "Document Collection", "Pending"].includes(
        f.status as string
      )
  ).length

  return (
    <div className="min-h-screen bg-[hsl(0_0%_99%)]">
      <LnTopbar />

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-[hsl(200_15%_12%)]">
            Tax Filings
          </h1>
          <p className="text-sm text-[hsl(200_8%_46%)] mt-1">
            Track your Form 1120 and 5472 submissions
          </p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Total Filings",
              value: totalCount,
              icon: FileText,
              color: "text-[hsl(200_8%_46%)]",
            },
            {
              label: "Completed",
              value: completedCount,
              icon: CheckCircle2,
              color: "text-emerald-600",
            },
            {
              label: "In Progress",
              value: inProgressCount,
              icon: Clock,
              color: "text-amber-600",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`size-4 ${kpi.color}`} />
                <span className="text-xs font-medium text-[hsl(200_8%_46%)] uppercase tracking-wide">
                  {kpi.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-[hsl(200_15%_12%)] tabular-nums">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filing cards */}
        {allFilings.length > 0 ? (
          <div className="space-y-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {allFilings.map((filing: any) => {
              const status = (filing.status as string) || "Pending"
              const badgeClass =
                STATUS_COLORS[status] || STATUS_COLORS.Pending

              return (
                <div
                  key={filing.id as string}
                  className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-5"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h3 className="text-sm font-semibold text-[hsl(200_15%_12%)]">
                      {(filing.llc_name as string) || "Untitled LLC"}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-medium rounded border whitespace-nowrap ${badgeClass}`}
                    >
                      {status}
                    </span>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div>
                      <span className="text-[hsl(200_8%_46%)] text-xs">
                        Filing Stage
                      </span>
                      <p className="text-[hsl(200_15%_12%)] font-medium mt-0.5">
                        {(filing.filing_stage as string) || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[hsl(200_8%_46%)] text-xs">
                        EIN Number
                      </span>
                      <p className="text-[hsl(200_15%_12%)] font-medium mt-0.5">
                        {(filing.ein_number as string) || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[hsl(200_8%_46%)] text-xs">
                        Form 1120
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <BoolIcon value={!!filing.form_1120} />
                        <span className="text-[hsl(200_15%_12%)] font-medium">
                          {filing.form_1120 ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[hsl(200_8%_46%)] text-xs">
                        Form 5472
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <BoolIcon value={!!filing.form_5472} />
                        <span className="text-[hsl(200_15%_12%)] font-medium">
                          {filing.form_5472 ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[hsl(200_8%_46%)] text-xs">
                        Annual Report
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <BoolIcon value={!!filing.annual_report_filed} />
                        <span className="text-[hsl(200_15%_12%)] font-medium">
                          {filing.annual_report_filed ? "Filed" : "Not Filed"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[hsl(200_8%_46%)] text-xs">
                        State Report Due
                      </span>
                      <p className="text-[hsl(200_15%_12%)] font-medium mt-0.5">
                        {formatDate(filing.state_report_due as string | null)}
                      </p>
                    </div>
                  </div>

                  {/* Amount & notes */}
                  {!!filing.amount_received && (
                    <div className="mt-4 pt-3 border-t border-[hsl(40_10%_92%)]">
                      <span className="text-xs text-[hsl(200_8%_46%)]">
                        Amount Received
                      </span>
                      <p className="text-sm font-semibold text-emerald-700 mt-0.5 tabular-nums">
                        {formatINR(filing.amount_received as number)}
                      </p>
                    </div>
                  )}
                  {!!filing.notes && (
                    <p className="mt-3 text-xs text-[hsl(200_8%_56%)] leading-relaxed">
                      {filing.notes as string}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-10 text-center">
            <Receipt className="mx-auto size-10 text-[hsl(200_8%_78%)] mb-3" />
            <p className="text-sm text-[hsl(200_8%_46%)]">
              No tax filings yet — filings will appear here once your LLC is
              active
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
