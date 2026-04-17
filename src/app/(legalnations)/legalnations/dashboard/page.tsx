export const dynamic = "force-dynamic"

import { supabaseLegal } from "@/lib/supabase"
import { LnTopbar } from "@/components/legalnations/ln-topbar"
import {
  Building2,
  FileCheck,
  ArrowRight,
  CreditCard,
  FileText,
  Receipt,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const PHASES = [
  "Onboarding",
  "LLC Filing",
  "EIN",
  "Bank Account",
  "Website",
  "Reseller Permit",
  "ITIN",
] as const

function fmtDate(d: string | null | undefined) {
  if (!d) return "---"
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function fmtCurrency(n: number | null | undefined) {
  if (n == null) return "---"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(n)
}

function statusColor(status: string | null | undefined) {
  switch (status?.toLowerCase()) {
    case "delivered":
    case "approved":
    case "completed":
    case "active":
      return "text-emerald-600"
    case "processing":
    case "in progress":
      return "text-blue-600"
    case "pending":
    case "submitted":
      return "text-amber-600"
    case "on hold":
    case "hold":
      return "text-slate-500"
    default:
      return "text-[hsl(200_8%_46%)]"
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function DashboardPage() {
  /* ---------- data ---------- */
  const { data: clients } = await supabaseLegal
    .from("clients")
    .select("*")
    .limit(1)
  const client = clients?.[0]

  if (!client) {
    return (
      <>
        <LnTopbar />
        <main className="max-w-5xl mx-auto px-4 md:px-6 py-6">
          <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-10 text-center space-y-3">
            <Building2 className="h-10 w-10 mx-auto text-[hsl(200_8%_46%)]" />
            <h2 className="text-xl font-semibold">No account found</h2>
            <p className="text-sm text-[hsl(200_8%_46%)]">
              We couldn&apos;t locate a client record for your account. Please
              contact support if you believe this is an error.
            </p>
          </div>
        </main>
      </>
    )
  }

  const [
    { data: steps },
    { data: filings },
    { data: payments },
    { data: docs },
  ] = await Promise.all([
    supabaseLegal
      .from("onboarding_checklist")
      .select("*")
      .eq("client_id", client.id)
      .order("sort_order"),
    supabaseLegal
      .from("tax_filings")
      .select("*")
      .eq("client_id", client.id)
      .limit(5),
    supabaseLegal
      .from("payments")
      .select("*")
      .eq("client_id", client.id)
      .order("payment_date", { ascending: false })
      .limit(5),
    supabaseLegal
      .from("documents")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const allSteps = steps ?? []
  const completedSteps = allSteps.filter((s: any) => s.completed)
  const onboardingPct =
    allSteps.length > 0
      ? Math.round((completedSteps.length / allSteps.length) * 100)
      : 0

  /* Financials */
  const totalReceived = (payments ?? []).reduce(
    (sum: number, p: any) => sum + (p.amount ?? 0),
    0
  )
  const totalPackage = client.package_price ?? client.total_amount ?? 0
  const remaining = Math.max(0, totalPackage - totalReceived)

  /* Status cards */
  const llcStatus = client.llc_status ?? "Pending"
  const einStatus = (() => {
    const einPhaseSteps = allSteps.filter(
      (s: any) => s.phase === "EIN"
    )
    const einDone = einPhaseSteps.filter((s: any) => s.completed)
    if (einPhaseSteps.length === 0) return "Not Started"
    if (einDone.length === einPhaseSteps.length) return "Completed"
    if (einDone.length > 0) return "In Progress"
    return "Pending"
  })()

  const nextStep = allSteps.find((s: any) => !s.completed)

  /* Phase stepper */
  const phaseMap = new Map<string, { total: number; done: number }>()
  for (const phase of PHASES) {
    phaseMap.set(phase, { total: 0, done: 0 })
  }
  for (const s of allSteps) {
    const entry = phaseMap.get(s.phase)
    if (entry) {
      entry.total++
      if (s.completed) entry.done++
    }
  }

  /* Recent activity — merge docs, payments, filings by date */
  type ActivityItem = { type: string; label: string; date: string }
  const activity: ActivityItem[] = []
  for (const d of docs ?? []) {
    activity.push({
      type: "document",
      label: d.title ?? d.name ?? "Document uploaded",
      date: d.created_at,
    })
  }
  for (const p of payments ?? []) {
    activity.push({
      type: "payment",
      label: `Payment of ${fmtCurrency(p.amount)}`,
      date: p.payment_date ?? p.created_at,
    })
  }
  for (const f of filings ?? []) {
    activity.push({
      type: "filing",
      label: f.filing_type ?? f.type ?? "Tax filing",
      date: f.due_date ?? f.created_at,
    })
  }
  activity.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const recentActivity = activity.slice(0, 5)

  /* -------- render -------- */
  return (
    <>
      <LnTopbar />
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* ---- Hero greeting ---- */}
        <div className="bg-gradient-to-r from-[hsl(160_45%_22%)] to-[hsl(160_40%_28%)] rounded-xl p-6 text-white">
          <p className="text-sm opacity-80">Welcome back,</p>
          <h1 className="text-2xl font-semibold mt-0.5">
            {client.name ?? client.full_name ?? "Client"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm opacity-70">
              {client.llc_name ?? client.company_name ?? "---"}
            </span>
            {client.plan && (
              <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded bg-[hsl(42_80%_55%)] text-[hsl(30_50%_12%)]">
                {client.plan}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-white/10 rounded-lg px-4 py-3">
              <p className="text-sm opacity-70">Amount Received</p>
              <p className="text-lg font-semibold mt-0.5">
                {fmtCurrency(totalReceived)}
              </p>
            </div>
            <div className="bg-white/10 rounded-lg px-4 py-3">
              <p className="text-sm opacity-70">Remaining</p>
              <p className="text-lg font-semibold mt-0.5">
                {fmtCurrency(remaining)}
              </p>
            </div>
            <div className="bg-white/10 rounded-lg px-4 py-3">
              <p className="text-sm opacity-70">Onboarding</p>
              <p className="text-lg font-semibold mt-0.5">{onboardingPct}%</p>
            </div>
          </div>
        </div>

        {/* ---- Status cards ---- */}
        <div className="grid sm:grid-cols-3 gap-4">
          {/* LLC Status */}
          <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-5">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-[hsl(200_8%_46%)]" />
              <span className="text-sm text-[hsl(200_8%_46%)]">
                LLC Status
              </span>
            </div>
            <p className={`text-[0.9375rem] font-semibold ${statusColor(llcStatus)}`}>
              {llcStatus}
            </p>
          </div>

          {/* EIN Status */}
          <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-5">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck className="h-4 w-4 text-[hsl(200_8%_46%)]" />
              <span className="text-sm text-[hsl(200_8%_46%)]">
                EIN Status
              </span>
            </div>
            <p className={`text-[0.9375rem] font-semibold ${statusColor(einStatus)}`}>
              {einStatus}
            </p>
          </div>

          {/* Next Step */}
          <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-5">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="h-4 w-4 text-[hsl(200_8%_46%)]" />
              <span className="text-sm text-[hsl(200_8%_46%)]">Next Step</span>
            </div>
            {nextStep ? (
              <>
                <p className="text-[0.9375rem] font-semibold text-[hsl(200_15%_12%)]">
                  {nextStep.step_name ?? nextStep.title ?? "---"}
                </p>
                <p className="text-sm text-[hsl(200_8%_46%)] mt-0.5">
                  Phase: {nextStep.phase}
                </p>
              </>
            ) : (
              <p className="text-[0.9375rem] font-semibold text-emerald-600">
                All steps complete!
              </p>
            )}
          </div>
        </div>

        {/* ---- Phase stepper ---- */}
        <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-5">
          <h2 className="text-[0.9375rem] font-semibold mb-4">
            Formation Progress
          </h2>
          <div className="flex items-center justify-between">
            {PHASES.map((phase, i) => {
              const info = phaseMap.get(phase)!
              const isComplete = info.total > 0 && info.done === info.total
              const isActive =
                !isComplete &&
                info.done > 0
              const isPending = !isComplete && !isActive

              return (
                <div key={phase} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        isComplete
                          ? "bg-emerald-600"
                          : isActive
                          ? "bg-[hsl(42_80%_55%)]"
                          : "bg-gray-300"
                      }`}
                    />
                    <span
                      className={`text-[11px] text-center leading-tight ${
                        isComplete
                          ? "text-emerald-700 font-medium"
                          : isActive
                          ? "text-[hsl(42_70%_40%)] font-medium"
                          : "text-[hsl(200_8%_46%)]"
                      }`}
                    >
                      {phase}
                    </span>
                  </div>
                  {i < PHASES.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-2 ${
                        isComplete ? "bg-emerald-400" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ---- Recent activity ---- */}
        <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-5">
          <h2 className="text-[0.9375rem] font-semibold mb-4">
            Recent Activity
          </h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-[hsl(200_8%_46%)]">
              No recent activity yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((item, i) => {
                const Icon =
                  item.type === "payment"
                    ? CreditCard
                    : item.type === "document"
                    ? FileText
                    : Receipt
                return (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 h-7 w-7 rounded-full bg-[hsl(160_45%_96%)] flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-[hsl(160_45%_22%)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[hsl(200_15%_12%)] truncate">
                        {item.label}
                      </p>
                      <p className="text-sm text-[hsl(200_8%_46%)]">
                        {fmtDate(item.date)}
                      </p>
                    </div>
                    <span className="shrink-0 inline-block px-2 py-0.5 text-[11px] rounded-full bg-[hsl(40_10%_95%)] text-[hsl(200_8%_46%)] capitalize">
                      {item.type}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  )
}
