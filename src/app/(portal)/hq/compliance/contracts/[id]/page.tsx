import { notFound } from "next/navigation"
import { ScrollText, FileText } from "lucide-react"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { supabaseHq } from "@/lib/supabase"
import { formatCurrency, formatDate } from "@/lib/format"

// HQ → Compliance → Contract detail.

export const dynamic = "force-dynamic"

type Params = { id: string }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params
  return { title: `Contract ${id.slice(0, 8)} — HQ | Suprans` }
}

interface ContractRow {
  id: string
  name: string | null
  parties: string | null
  contract_type: string | null
  start_date: string | null
  end_date: string | null
  value: number | null
  currency: string | null
  status: string | null
  owner: string | null
  tags: string[] | null
  document_url: string | null
}

async function fetchContract(id: string) {
  const { data } = await supabaseHq
    .from("contracts")
    .select(
      "id, name, parties, contract_type, start_date, end_date, value, currency, status, owner, tags, document_url",
    )
    .eq("id", id)
    .maybeSingle()
  if (!data) return null
  return data as ContractRow
}

export default async function HqContractDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const contract = await fetchContract(id)
  if (!contract) notFound()

  const subtitleParts = [contract.parties, contract.contract_type].filter(Boolean) as string[]
  const status = contract.status ?? "—"

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/hq/compliance/contracts" label="All contracts" />

      <HeroCard
        title={contract.name ?? "Untitled contract"}
        subtitle={subtitleParts.length ? subtitleParts.join(" · ") : undefined}
        icon={ScrollText}
        tone="blue"
        meta={
          <StatusBadge tone={toneForStatus(status)}>{status}</StatusBadge>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Contract details">
            <InfoRow label="Parties" value={contract.parties ?? "—"} />
            <InfoRow label="Type" value={contract.contract_type ?? "—"} />
            <InfoRow label="Start date" value={formatDate(contract.start_date)} />
            <InfoRow label="End date" value={formatDate(contract.end_date)} />
            <InfoRow
              label="Value"
              value={
                contract.value !== null
                  ? formatCurrency(
                      contract.value,
                      contract.currency === "INR" || !contract.currency
                        ? "₹"
                        : `${contract.currency} `,
                    )
                  : "—"
              }
            />
            <InfoRow label="Owner" value={contract.owner ?? "—"} />
          </DetailCard>
        </div>
        <div className="space-y-5">
          <DetailCard title="Document">
            {contract.document_url ? (
              <a
                href={contract.document_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {contract.document_url}
              </a>
            ) : (
              <EmptyState
                icon={FileText}
                title="No document attached"
                description="Upload the signed contract PDF to keep it on file."
              />
            )}
          </DetailCard>
          <DetailCard title="Tags">
            {contract.tags && contract.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {contract.tags.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <InfoRow label="Tags" value="—" />
            )}
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
