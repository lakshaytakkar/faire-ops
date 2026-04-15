import { notFound } from "next/navigation"
import { ScrollText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { supabaseHq } from "@/lib/supabase"
import { formatCurrency, formatDate } from "@/lib/format"

// HQ → Assets → Vendor Contracts → [id] (detail). Spec §5.3.

export const dynamic = "force-dynamic"

type Params = { id: string }

const CONTRACT_STATUS_TONE: Record<string, StatusTone> = {
  active: "emerald",
  expiring: "amber",
  expired: "red",
  cancelled: "slate",
  pending: "amber",
  draft: "slate",
}

interface ContractDetail {
  id: string
  vendor: string | null
  service: string | null
  contract_type: string | null
  start_date: string | null
  end_date: string | null
  value: number | null
  currency: string | null
  status: string | null
  owner: string | null
  document_url: string | null
}

function currencySymbol(code: string | null | undefined): string {
  if (!code) return "₹"
  const c = code.toUpperCase()
  if (c === "INR") return "₹"
  if (c === "USD") return "$"
  if (c === "EUR") return "€"
  if (c === "GBP") return "£"
  return `${c} `
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params
  return { title: `Contract ${id.slice(0, 8)} — HQ | Suprans` }
}

async function fetchContract(id: string): Promise<ContractDetail | null> {
  const { data } = await supabaseHq
    .from("vendor_contracts")
    .select(
      "id, vendor, service, contract_type, start_date, end_date, value, currency, status, owner, document_url",
    )
    .eq("id", id)
    .maybeSingle()
  return (data as ContractDetail | null) ?? null
}

export default async function HqVendorContractDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const contract = await fetchContract(id)
  if (!contract) notFound()

  const sym = currencySymbol(contract.currency)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/hq/assets/contracts" label="All contracts" />

      <HeroCard
        title={contract.vendor ?? "Untitled contract"}
        subtitle={contract.service ?? undefined}
        icon={ScrollText}
        tone="blue"
        meta={
          contract.status ? (
            <StatusBadge
              tone={CONTRACT_STATUS_TONE[contract.status] ?? "slate"}
            >
              {contract.status}
            </StatusBadge>
          ) : undefined
        }
        actions={
          <>
            <Button size="sm" variant="outline" disabled>
              Edit
            </Button>
            <Button size="sm" variant="outline" disabled>
              Renew
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Contract info">
            <div className="divide-y">
              <InfoRow label="Vendor" value={contract.vendor ?? "—"} />
              <InfoRow label="Service" value={contract.service ?? "—"} />
              <InfoRow label="Type" value={contract.contract_type ?? "—"} />
              <InfoRow label="Start Date" value={formatDate(contract.start_date)} />
              <InfoRow label="End Date" value={formatDate(contract.end_date)} />
              <InfoRow
                label="Value"
                value={formatCurrency(contract.value, sym)}
              />
              <InfoRow label="Currency" value={contract.currency ?? "—"} />
            </div>
          </DetailCard>
        </div>

        <div className="space-y-5">
          <DetailCard title="Ownership & documents">
            <div className="divide-y">
              <InfoRow label="Owner" value={contract.owner ?? "—"} />
              <InfoRow label="Status" value={contract.status ?? "—"} />
              <InfoRow
                label="Document"
                value={
                  contract.document_url ? (
                    <a
                      href={contract.document_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      View
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
