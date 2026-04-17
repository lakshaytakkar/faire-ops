import { notFound } from "next/navigation"
import { KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { supabaseHq } from "@/lib/supabase"
import { formatCurrency, formatDate } from "@/lib/format"

// HQ → Assets → Licenses → [id] (detail). Spec §5.2 + SPACE_PATTERN.md §4.

export const dynamic = "force-dynamic"

type Params = { id: string }

const LICENSE_STATUS_TONE: Record<string, StatusTone> = {
  active: "emerald",
  cancelled: "red",
  expired: "red",
  trialing: "amber",
  pending: "amber",
}

interface LicenseDetail {
  id: string
  tool: string | null
  category: string | null
  login_email: string | null
  seats_total: number | null
  seats_used: number | null
  renewal_date: string | null
  monthly_cost: number | null
  annual_cost: number | null
  currency: string | null
  status: string | null
  billing_entity_id: string | null
  notes: string | null
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
  return { title: `License ${id.slice(0, 8)} — HQ | Suprans` }
}

async function fetchLicense(id: string) {
  const { data } = await supabaseHq
    .from("licenses")
    .select(
      "id, tool, category, login_email, seats_total, seats_used, renewal_date, monthly_cost, annual_cost, currency, status, billing_entity_id, notes",
    )
    .eq("id", id)
    .maybeSingle()

  if (!data) return null
  const license = data as LicenseDetail

  let entityName: string | null = null
  if (license.billing_entity_id) {
    const { data: entity } = await supabaseHq
      .from("entities")
      .select("id, name")
      .eq("id", license.billing_entity_id)
      .maybeSingle()
    entityName = (entity as { name: string | null } | null)?.name ?? null
  }

  return { license, entityName }
}

export default async function HqLicenseDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const data = await fetchLicense(id)
  if (!data) notFound()
  const { license, entityName } = data

  const sym = currencySymbol(license.currency)
  const seatsTotal = license.seats_total ?? 0
  const seatsUsed = license.seats_used ?? 0
  const seatsAvailable = Math.max(0, seatsTotal - seatsUsed)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/hq/assets/ip" label="IP & Intangibles" />

      <HeroCard
        title={license.tool ?? "Untitled license"}
        subtitle={license.category ?? undefined}
        icon={KeyRound}
        tone="blue"
        meta={
          license.status ? (
            <StatusBadge tone={LICENSE_STATUS_TONE[license.status] ?? "slate"}>
              {license.status}
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
            <Button size="sm" variant="outline" disabled>
              Cancel
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="License info">
            <div className="divide-y">
              <InfoRow label="Tool" value={license.tool ?? "—"} />
              <InfoRow label="Category" value={license.category ?? "—"} />
              <InfoRow label="Login Email" value={license.login_email ?? "—"} />
              <InfoRow
                label="Seats"
                value={`${seatsUsed} used / ${seatsTotal} total (${seatsAvailable} free)`}
              />
              <InfoRow
                label="Renewal Date"
                value={formatDate(license.renewal_date)}
              />
              <InfoRow
                label="Monthly Cost"
                value={formatCurrency(license.monthly_cost, sym)}
              />
              <InfoRow
                label="Annual Cost"
                value={formatCurrency(license.annual_cost, sym)}
              />
              <InfoRow label="Currency" value={license.currency ?? "—"} />
            </div>
          </DetailCard>
        </div>

        <div className="space-y-5">
          <DetailCard title="Billing & notes">
            <div className="divide-y">
              <InfoRow label="Billing Entity" value={entityName ?? "—"} />
              <InfoRow
                label="Status"
                value={license.status ?? "—"}
              />
            </div>
            {license.notes && (
              <div className="mt-3 rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                {license.notes}
              </div>
            )}
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
