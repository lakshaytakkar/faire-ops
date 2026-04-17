import { notFound } from "next/navigation"
import {
  Wallet,
  CreditCard,
  ClipboardCheck,
  Package,
  Check,
  Minus,
} from "lucide-react"
import { supabaseLegal } from "@/lib/supabase"
import { BackLink } from "@/components/shared/back-link"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import { GenericEditLauncher } from "../../_components/GenericEditLauncher"
import {
  clientHealthTone,
  llcStatusTone,
  planTone,
  formatINR,
} from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Client — Legal | Suprans" }

interface ClientRow {
  id: string
  client_code: string | null
  client_name: string | null
  email: string | null
  contact_number: string | null
  country: string | null
  plan: string | null
  website_included: boolean | null
  client_health: string | null
  llc_name: string | null
  llc_status: string | null
  llc_email: string | null
  ein: string | null
  llc_address: string | null
  website_url: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_routing_number: string | null
  date_of_payment: string | null
  date_of_onboarding: string | null
  amount_received: number | null
  remaining_payment: number | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

interface ChecklistRow {
  id: string
  phase: string | null
  step_name: string | null
  is_completed: boolean | null
  completed_at: string | null
  sort_order: number | null
}

export default async function LegalClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [clientRes, checklistRes] = await Promise.all([
    supabaseLegal.from("clients").select("*").eq("id", id).maybeSingle(),
    supabaseLegal
      .from("onboarding_checklist")
      .select("id, phase, step_name, is_completed, completed_at, sort_order")
      .eq("client_id", id)
      .order("sort_order", { ascending: true }),
  ])

  if (clientRes.error) console.error("legal.clients:", clientRes.error.message)
  if (!clientRes.data) notFound()
  const client = clientRes.data as ClientRow

  const checklist = (checklistRes.data ?? []) as ChecklistRow[]
  const completedSteps = checklist.filter((c) => c.is_completed).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/legal/clients" label="All clients" />

      <PageHeader
        title={client.client_name ?? "Untitled client"}
        subtitle={`${client.client_code ?? "—"} · ${client.plan ?? "—"} · ${client.client_health ?? "—"}`}
        actions={
          <GenericEditLauncher
            table="clients"
            row={client as unknown as Record<string, unknown> & { id: string }}
            listHref="/legal/clients"
            title="Edit client"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Amount received"
          value={formatINR(client.amount_received)}
          icon={Wallet}
          iconTone="emerald"
        />
        <MetricCard
          label="Remaining payment"
          value={formatINR(client.remaining_payment)}
          icon={CreditCard}
          iconTone="amber"
        />
        <MetricCard
          label="Onboarding steps"
          value={`${completedSteps}/${checklist.length}`}
          icon={ClipboardCheck}
          iconTone="blue"
        />
        <MetricCard
          label="LLC Status"
          value={
            <StatusBadge tone={llcStatusTone(client.llc_status)}>
              {client.llc_status ?? "—"}
            </StatusBadge>
          }
          icon={Package}
          iconTone="violet"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="LLC Details">
            <div className="divide-y divide-border">
              <InfoRow label="LLC Name" value={client.llc_name ?? "—"} />
              <InfoRow
                label="LLC Status"
                value={
                  <StatusBadge tone={llcStatusTone(client.llc_status)}>
                    {client.llc_status ?? "—"}
                  </StatusBadge>
                }
              />
              <InfoRow label="LLC Email" value={client.llc_email ?? "—"} />
              <InfoRow label="EIN" value={client.ein ?? "—"} />
              <InfoRow label="LLC Address" value={client.llc_address ?? "—"} />
              <InfoRow
                label="Website URL"
                value={
                  client.website_url ? (
                    <a
                      href={client.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary underline"
                    >
                      {client.website_url}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          </DetailCard>

          <DetailCard title="Banking">
            <div className="divide-y divide-border">
              <InfoRow label="Bank Name" value={client.bank_name ?? "—"} />
              <InfoRow
                label="Account Number"
                value={client.bank_account_number ?? "—"}
              />
              <InfoRow
                label="Routing Number"
                value={client.bank_routing_number ?? "—"}
              />
            </div>
          </DetailCard>

          <DetailCard
            title={`Onboarding Checklist (${completedSteps}/${checklist.length})`}
          >
            {checklist.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No checklist items yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phase</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead className="w-[80px] text-center">
                      Done
                    </TableHead>
                    <TableHead className="w-[140px]">Completed at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checklist.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.phase ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {c.step_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {c.is_completed ? (
                          <Check className="inline-block h-4 w-4 text-emerald-600" />
                        ) : (
                          <Minus className="inline-block h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {formatDate(c.completed_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DetailCard>
        </div>

        <div className="space-y-5">
          <DetailCard title="Contact">
            <div className="divide-y divide-border">
              <InfoRow label="Email" value={client.email ?? "—"} />
              <InfoRow
                label="Phone"
                value={client.contact_number ?? "—"}
              />
              <InfoRow label="Country" value={client.country ?? "—"} />
            </div>
          </DetailCard>

          <DetailCard title="Payment Info">
            <div className="divide-y divide-border">
              <InfoRow
                label="Date of payment"
                value={formatDate(client.date_of_payment)}
              />
              <InfoRow
                label="Date of onboarding"
                value={formatDate(client.date_of_onboarding)}
              />
              <InfoRow
                label="Amount received"
                value={
                  <span className="tabular-nums font-semibold">
                    {formatINR(client.amount_received)}
                  </span>
                }
              />
              <InfoRow
                label="Remaining payment"
                value={
                  <span className="tabular-nums font-semibold">
                    {formatINR(client.remaining_payment)}
                  </span>
                }
              />
            </div>
          </DetailCard>

          <DetailCard title="Notes">
            {client.notes ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {client.notes}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes.</p>
            )}
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
