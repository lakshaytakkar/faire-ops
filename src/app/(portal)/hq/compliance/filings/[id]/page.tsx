import { notFound } from "next/navigation"
import { FileCheck, FileText } from "lucide-react"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { supabaseHq } from "@/lib/supabase"
import { formatDate } from "@/lib/format"

// HQ → Compliance → Filing detail.

export const dynamic = "force-dynamic"

type Params = { id: string }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params
  return { title: `Filing ${id.slice(0, 8)} — HQ | Suprans` }
}

interface FilingRow {
  id: string
  entity_id: string | null
  filing_type: string | null
  period: string | null
  due_date: string | null
  filed_date: string | null
  status: string | null
  filed_by: string | null
  documents_url: string | null
  notes: string | null
}

async function fetchFiling(id: string) {
  const { data } = await supabaseHq
    .from("filings")
    .select(
      "id, entity_id, filing_type, period, due_date, filed_date, status, filed_by, documents_url, notes",
    )
    .eq("id", id)
    .maybeSingle()
  if (!data) return null
  const filing = data as FilingRow

  let entityName: string | null = null
  if (filing.entity_id) {
    const entRes = await supabaseHq
      .from("entities")
      .select("name")
      .eq("id", filing.entity_id)
      .maybeSingle()
    entityName = (entRes.data as { name: string | null } | null)?.name ?? null
  }

  return { filing, entityName }
}

export default async function HqFilingDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const data = await fetchFiling(id)
  if (!data) notFound()
  const { filing, entityName } = data

  const status = filing.status ?? "—"
  const subtitleParts = [entityName, filing.period].filter(Boolean) as string[]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/hq/compliance/filings" label="All filings" />

      <HeroCard
        title={filing.filing_type ?? "Untitled filing"}
        subtitle={subtitleParts.length ? subtitleParts.join(" · ") : undefined}
        icon={FileCheck}
        tone="blue"
        meta={
          <StatusBadge tone={toneForStatus(status)}>{status}</StatusBadge>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Filing details">
            <InfoRow label="Entity" value={entityName ?? "—"} />
            <InfoRow label="Type" value={filing.filing_type ?? "—"} />
            <InfoRow label="Period" value={filing.period ?? "—"} />
            <InfoRow label="Due date" value={formatDate(filing.due_date)} />
            <InfoRow label="Filed date" value={formatDate(filing.filed_date)} />
            <InfoRow label="Filed by" value={filing.filed_by ?? "—"} />
          </DetailCard>
        </div>
        <div className="space-y-5">
          <DetailCard title="Documents">
            {filing.documents_url ? (
              <a
                href={filing.documents_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {filing.documents_url}
              </a>
            ) : (
              <EmptyState
                icon={FileText}
                title="No documents uploaded"
                description="Upload the filed document to keep an audit trail."
              />
            )}
          </DetailCard>
          <DetailCard title="Notes">
            {filing.notes ? (
              <p className="text-sm text-foreground whitespace-pre-wrap">{filing.notes}</p>
            ) : (
              <InfoRow label="Notes" value="—" />
            )}
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
