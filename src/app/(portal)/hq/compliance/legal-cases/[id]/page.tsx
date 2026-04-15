import { notFound } from "next/navigation"
import { Gavel, CalendarDays } from "lucide-react"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus, type StatusTone } from "@/components/shared/status-badge"
import { supabaseHq } from "@/lib/supabase"
import { formatDate } from "@/lib/format"

// HQ → Compliance → Legal case detail.

export const dynamic = "force-dynamic"

type Params = { id: string }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params
  return { title: `Case ${id.slice(0, 8)} — HQ | Suprans` }
}

interface LegalCaseRow {
  id: string
  case_code: string | null
  description: string | null
  court: string | null
  status: string | null
  opposing_party: string | null
  lawyer: string | null
  urgency: string | null
  next_hearing_at: string | null
}

interface HearingRow {
  id: string
  hearing_date: string | null
  outcome: string | null
  notes: string | null
}

const URGENCY_TONE: Record<string, StatusTone> = {
  low: "slate",
  medium: "blue",
  high: "amber",
  critical: "red",
}

async function fetchCase(id: string) {
  const [caseRes, hearingsRes] = await Promise.all([
    supabaseHq
      .from("legal_cases")
      .select(
        "id, case_code, description, court, status, opposing_party, lawyer, urgency, next_hearing_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseHq
      .from("case_hearings")
      .select("id, hearing_date, outcome, notes")
      .eq("case_id", id)
      .order("hearing_date", { ascending: false }),
  ])
  if (!caseRes.data) return null
  return {
    legalCase: caseRes.data as LegalCaseRow,
    hearings: (hearingsRes.data ?? []) as HearingRow[],
  }
}

export default async function HqLegalCaseDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const data = await fetchCase(id)
  if (!data) notFound()
  const { legalCase, hearings } = data

  const subtitleParts = [legalCase.court, legalCase.opposing_party].filter(Boolean) as string[]
  const status = legalCase.status ?? "—"

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/hq/compliance/legal-cases" label="All cases" />

      <HeroCard
        title={legalCase.case_code ?? "Untitled case"}
        subtitle={subtitleParts.length ? subtitleParts.join(" · ") : undefined}
        icon={Gavel}
        tone="red"
        meta={
          <>
            <StatusBadge tone={toneForStatus(status)}>{status}</StatusBadge>
            {legalCase.urgency && (
              <StatusBadge tone={URGENCY_TONE[legalCase.urgency] ?? "slate"}>
                {legalCase.urgency}
              </StatusBadge>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Case details">
            <InfoRow label="Case code" value={legalCase.case_code ?? "—"} />
            <InfoRow label="Description" value={legalCase.description ?? "—"} />
            <InfoRow label="Court" value={legalCase.court ?? "—"} />
            <InfoRow label="Opposing party" value={legalCase.opposing_party ?? "—"} />
            <InfoRow label="Our lawyer" value={legalCase.lawyer ?? "—"} />
            <InfoRow label="Next hearing" value={formatDate(legalCase.next_hearing_at)} />
          </DetailCard>

          <DetailCard title="Hearings timeline">
            {hearings.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No hearings recorded"
                description="Hearing dates, outcomes and notes will accumulate here."
              />
            ) : (
              <div className="space-y-4">
                {hearings.map((h) => (
                  <div
                    key={h.id}
                    className="border-l-2 border-border pl-4 py-1"
                  >
                    <div className="text-sm font-semibold">
                      {formatDate(h.hearing_date)}
                    </div>
                    {h.outcome && (
                      <div className="text-sm text-foreground mt-0.5">{h.outcome}</div>
                    )}
                    {h.notes && (
                      <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                        {h.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </DetailCard>
        </div>
        <div className="space-y-5">
          <DetailCard title="Meta">
            <InfoRow label="Case ID" value={legalCase.id.slice(0, 8)} />
            <InfoRow label="Hearings on file" value={hearings.length} />
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
