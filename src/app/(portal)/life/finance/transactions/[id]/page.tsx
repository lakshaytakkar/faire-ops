import { notFound } from "next/navigation"
import { Receipt, Tag, Landmark, CalendarDays } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatDate, formatCurrency } from "@/lib/format"
import { GenericEditLauncher } from "../../../_components/GenericEditLauncher"

export const dynamic = "force-dynamic"

type Params = { id: string }

export default async function LifeTransactionDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const { data } = await supabaseLife
    .from("life_transactions")
    .select(
      "id, date, type, category, sub_category, amount, currency, account, narration, notes, receipt_url, tags, itr_relevant, created_at",
    )
    .eq("id", id)
    .maybeSingle()
  if (!data) notFound()
  const t = data as {
    id: string
    date: string | null
    type: string | null
    category: string | null
    sub_category: string | null
    amount: number | null
    currency: string | null
    account: string | null
    narration: string | null
    notes: string | null
    receipt_url: string | null
    tags: string[] | null
    itr_relevant: boolean | null
    created_at: string | null
  }

  const tags = Array.isArray(t.tags) ? t.tags : []
  const title = t.narration ?? `${t.type ?? "Transaction"} — ${formatCurrency(t.amount, t.currency ?? "₹")}`

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title={title}
        subtitle={[t.category, t.sub_category].filter(Boolean).join(" / ") || undefined}
        breadcrumbs={[
          { label: "Life", href: "/life" },
          { label: "Transactions", href: "/life/finance/transactions" },
          { label: title },
        ]}
        actions={
          <GenericEditLauncher
            table="life_transactions"
            row={t}
            title="Edit transaction"
            listHref="/life/finance/transactions"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Amount"
          value={formatCurrency(t.amount, t.currency ?? "₹")}
          icon={Receipt}
          iconTone={t.type === "income" ? "emerald" : t.type === "expense" ? "red" : "blue"}
        />
        <MetricCard
          label="Type"
          value={t.type ?? "—"}
          icon={Tag}
          iconTone="violet"
        />
        <MetricCard
          label="Account"
          value={t.account ?? "—"}
          icon={Landmark}
          iconTone="amber"
        />
        <MetricCard
          label="Date"
          value={formatDate(t.date)}
          icon={CalendarDays}
          iconTone="blue"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <DetailCard title="Transaction" className="lg:col-span-2">
          <div className="divide-y divide-border">
            <InfoRow
              label="Type"
              value={
                <StatusBadge tone={toneForStatus(t.type)}>
                  {t.type ?? "—"}
                </StatusBadge>
              }
            />
            <InfoRow label="Category" value={t.category ?? "—"} />
            <InfoRow label="Sub-category" value={t.sub_category ?? "—"} />
            <InfoRow
              label="Amount"
              value={formatCurrency(t.amount, t.currency ?? "₹")}
            />
            <InfoRow label="Currency" value={t.currency ?? "—"} />
            <InfoRow label="Account" value={t.account ?? "—"} />
            <InfoRow label="ITR relevant" value={t.itr_relevant ? "Yes" : "No"} />
            <InfoRow label="Logged" value={formatDate(t.created_at)} />
          </div>
        </DetailCard>

        <DetailCard title="Details">
          {t.narration && (
            <div>
              <h4 className="text-sm font-semibold">Narration</h4>
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                {t.narration}
              </p>
            </div>
          )}
          {t.notes && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold">Notes</h4>
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                {t.notes}
              </p>
            </div>
          )}
          {tags.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold">Tags</h4>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {tags.map((tg, i) => (
                  <StatusBadge key={i} tone="slate">
                    {tg}
                  </StatusBadge>
                ))}
              </div>
            </div>
          )}
          {t.receipt_url && (
            <div className="mt-4">
              <a
                href={t.receipt_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View receipt
              </a>
            </div>
          )}
        </DetailCard>
      </div>
    </div>
  )
}
