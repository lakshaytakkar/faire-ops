export const dynamic = "force-dynamic"

import { supabaseLegal } from "@/lib/supabase"
import { LnTopbar } from "@/components/legalnations/ln-topbar"
import { Building2, CheckCircle2, Circle } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
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
  if (!d) return null
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function OnboardingPage() {
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

  const { data: steps } = await supabaseLegal
    .from("onboarding_checklist")
    .select("*")
    .eq("client_id", client.id)
    .order("sort_order")

  const allSteps = steps ?? []
  const completedCount = allSteps.filter((s: any) => s.completed).length
  const totalCount = allSteps.length
  const overallPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  /* Group steps by phase */
  const phaseData = PHASES.map((phase) => {
    const phaseSteps = allSteps.filter((s: any) => s.phase === phase)
    const done = phaseSteps.filter((s: any) => s.completed).length
    const total = phaseSteps.length
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    const isComplete = total > 0 && done === total
    const isActive = !isComplete && done > 0
    return { phase, steps: phaseSteps, done, total, pct, isComplete, isActive }
  })

  /* Determine the first active phase index for the stepper */
  const activePhaseIdx = phaseData.findIndex((p) => p.isActive)

  /* -------- render -------- */
  return (
    <>
      <LnTopbar />
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* ---- Page header ---- */}
        <div>
          <h1 className="text-xl font-semibold">Onboarding Progress</h1>
          <p className="text-sm text-[hsl(200_8%_46%)] mt-1">
            {completedCount} of {totalCount} steps completed ({overallPct}%)
          </p>
        </div>

        {/* ---- Horizontal phase stepper (prominent) ---- */}
        <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-6">
          <div className="flex items-center justify-between">
            {phaseData.map((p, i) => (
              <div
                key={p.phase}
                className="flex items-center flex-1 last:flex-none"
              >
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      p.isComplete
                        ? "bg-emerald-600 border-emerald-600"
                        : p.isActive
                        ? "bg-[hsl(42_80%_55%)] border-[hsl(42_80%_55%)]"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    {p.isComplete && (
                      <svg
                        className="h-2.5 w-2.5 text-white"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M2.5 6L5 8.5L9.5 3.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs text-center leading-tight max-w-[72px] ${
                      p.isComplete
                        ? "text-emerald-700 font-medium"
                        : p.isActive
                        ? "text-[hsl(42_70%_40%)] font-medium"
                        : "text-[hsl(200_8%_46%)]"
                    }`}
                  >
                    {p.phase}
                  </span>
                </div>
                {i < phaseData.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded ${
                      p.isComplete ? "bg-emerald-400" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ---- Phase cards ---- */}
        <div className="space-y-4">
          {phaseData.map((p, idx) => {
            const isPending = !p.isComplete && !p.isActive
            return (
              <div
                key={p.phase}
                className={`bg-white rounded-lg border overflow-hidden ${
                  p.isActive
                    ? "border-l-4 border-l-[hsl(42_80%_55%)] border-[hsl(40_10%_88%)] bg-[hsl(42_90%_97%)]"
                    : p.isComplete
                    ? "border-l-4 border-l-emerald-500 border-[hsl(40_10%_88%)]"
                    : "border-[hsl(40_10%_88%)]"
                } ${isPending ? "opacity-60" : ""}`}
              >
                <div className="p-5">
                  {/* Phase header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        p.isComplete
                          ? "bg-emerald-600 text-white"
                          : p.isActive
                          ? "bg-[hsl(42_80%_55%)] text-[hsl(30_50%_12%)]"
                          : "bg-gray-200 text-[hsl(200_8%_46%)]"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[0.9375rem] font-semibold">
                        {p.phase}
                      </h3>
                      <p className="text-sm text-[hsl(200_8%_46%)]">
                        {p.done} of {p.total} steps completed
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-medium ${
                        p.isComplete
                          ? "text-emerald-600"
                          : p.isActive
                          ? "text-[hsl(42_70%_40%)]"
                          : "text-[hsl(200_8%_46%)]"
                      }`}
                    >
                      {p.pct}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-4">
                    <div
                      className={`h-full rounded-full transition-all ${
                        p.isComplete
                          ? "bg-emerald-500"
                          : p.isActive
                          ? "bg-[hsl(42_80%_55%)]"
                          : "bg-gray-300"
                      }`}
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>

                  {/* Step list */}
                  {p.steps.length > 0 && (
                    <ul className="space-y-2">
                      {p.steps.map((step: any) => (
                        <li key={step.id} className="flex items-center gap-2.5">
                          {step.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-300 shrink-0" />
                          )}
                          <span
                            className={`text-sm flex-1 ${
                              step.completed
                                ? "text-[hsl(200_15%_12%)]"
                                : "text-[hsl(200_8%_46%)]"
                            }`}
                          >
                            {step.step_name ?? step.title ?? "Step"}
                          </span>
                          {step.completed && step.completed_at && (
                            <span className="text-[11px] text-[hsl(200_8%_46%)] shrink-0">
                              {fmtDate(step.completed_at)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {p.total === 0 && (
                    <p className="text-sm text-[hsl(200_8%_46%)] italic">
                      No steps defined for this phase yet.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </>
  )
}
