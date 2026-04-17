import { notFound } from "next/navigation"
import { Shield, Wallet, CalendarDays, Package } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDate, formatCurrency } from "@/lib/format"
import { GenericEditLauncher } from "../../../_components/GenericEditLauncher"

export const dynamic = "force-dynamic"

type Params = { id: string }

export default async function LifeInsuranceDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const [policyRes, assetsRes] = await Promise.all([
    supabaseLife
      .from("insurance_policies")
      .select(
        "id, type, provider, policy_number, insured_amount, premium, premium_frequency, next_due, status, document_url, notes, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseLife
      .from("physical_assets")
      .select("id, name, category, current_value")
      .eq("insurance_policy_id", id),
  ])
  if (!policyRes.data) notFound()
  const p = policyRes.data as {
    id: string
    type: string | null
    provider: string | null
    policy_number: string | null
    insured_amount: number | null
    premium: number | null
    premium_frequency: string | null
    next_due: string | null
    status: string | null
    document_url: string | null
    notes: string | null
    created_at: string | null
  }
  const assets = (assetsRes.data ?? []) as Array<{
    id: string
    name: string | null
    category: string | null
    current_value: number | null
  }>

  const title = [p.provider, p.type].filter(Boolean).join(" — ") || "Insurance policy"

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title={title}
        subtitle={p.policy_number ?? undefined}
        breadcrumbs={[
          { label: "Life", href: "/life" },
          { label: "Insurance", href: "/life/finance/insurance" },
          { label: title },
        ]}
        actions={
          <GenericEditLauncher
            table="insurance_policies"
            row={p}
            title="Edit policy"
            listHref="/life/finance/insurance"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Coverage"
          value={formatCurrency(p.insured_amount)}
          icon={Shield}
          iconTone="blue"
        />
        <MetricCard
          label="Premium"
          value={`${formatCurrency(p.premium)}${p.premium_frequency ? ` / ${p.premium_frequency}` : ""}`}
          icon={Wallet}
          iconTone="emerald"
        />
        <MetricCard
          label="Next due"
          value={formatDate(p.next_due)}
          icon={CalendarDays}
          iconTone="amber"
        />
        <MetricCard
          label="Type"
          value={p.type ?? "—"}
          icon={Package}
          iconTone="violet"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <DetailCard title="Policy" className="lg:col-span-2">
          <div className="divide-y divide-border">
            <InfoRow
              label="Status"
              value={
                <StatusBadge tone={toneForStatus(p.status)}>
                  {p.status ?? "—"}
                </StatusBadge>
              }
            />
            <InfoRow label="Provider" value={p.provider ?? "—"} />
            <InfoRow label="Policy #" value={p.policy_number ?? "—"} />
            <InfoRow label="Coverage" value={formatCurrency(p.insured_amount)} />
            <InfoRow label="Premium" value={formatCurrency(p.premium)} />
            <InfoRow
              label="Frequency"
              value={p.premium_frequency ?? "—"}
            />
            <InfoRow label="Next due" value={formatDate(p.next_due)} />
            <InfoRow
              label="Document"
              value={
                p.document_url ? (
                  <a
                    href={p.document_url}
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
            <InfoRow label="Added" value={formatDate(p.created_at)} />
          </div>
        </DetailCard>

        <DetailCard title="Notes">
          {p.notes ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{p.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </DetailCard>
      </div>

      <DetailCard title={`Covered assets (${assets.length})`}>
        {assets.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No assets linked"
            description="Link physical assets to this policy to see what it covers."
          />
        ) : (
          <ul className="divide-y divide-border">
            {assets.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {a.name ?? "Unnamed asset"}
                  </div>
                  {a.category && (
                    <div className="text-sm text-muted-foreground">
                      {a.category}
                    </div>
                  )}
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">
                  {formatCurrency(a.current_value)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DetailCard>
    </div>
  )
}
