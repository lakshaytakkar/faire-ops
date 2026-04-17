import { notFound } from "next/navigation"
import { Users, Phone, Calendar, MessageCircle } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDate } from "@/lib/format"
import { PersonEditLauncher } from "./PersonEditLauncher"
import { InteractionLauncher } from "./InteractionLauncher"

export const dynamic = "force-dynamic"

type Params = { id: string }

export default async function LifePersonDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params

  const [personRes, logsRes] = await Promise.all([
    supabaseLife
      .from("people")
      .select(
        "id, name, category, phone, email, birthday, location, how_we_met, frequency_target, last_contact, contact_health, notes, active, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseLife
      .from("interaction_logs")
      .select("id, date, mode, summary, created_at")
      .eq("person_id", id)
      .order("date", { ascending: false })
      .limit(200),
  ])

  if (!personRes.data) notFound()
  const person = personRes.data as {
    id: string
    name: string | null
    category: string | null
    phone: string | null
    email: string | null
    birthday: string | null
    location: string | null
    how_we_met: string | null
    frequency_target: string | null
    last_contact: string | null
    contact_health: string | null
    notes: string | null
    active: boolean | null
    created_at: string | null
  }
  const logs = logsRes.data ?? []

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title={person.name ?? "Unnamed"}
        subtitle={person.category ?? undefined}
        breadcrumbs={[
          { label: "Life", href: "/life" },
          { label: "People", href: "/life/people" },
          { label: person.name ?? "Person" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <InteractionLauncher personId={person.id} />
            <PersonEditLauncher person={person} />
          </div>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Category"
          value={person.category ?? "—"}
          icon={Users}
          iconTone="blue"
        />
        <MetricCard
          label="Contact health"
          value={person.contact_health ?? "—"}
          icon={MessageCircle}
          iconTone="emerald"
        />
        <MetricCard
          label="Last contact"
          value={person.last_contact ? formatDate(person.last_contact) : "—"}
          icon={Calendar}
          iconTone="amber"
        />
        <MetricCard
          label="Interactions"
          value={logs.length}
          icon={MessageCircle}
          iconTone="violet"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <DetailCard title="Contact info" className="lg:col-span-2">
          <div className="divide-y divide-border">
            <InfoRow label="Phone" value={person.phone ?? "—"} />
            <InfoRow label="Email" value={person.email ?? "—"} />
            <InfoRow label="Location" value={person.location ?? "—"} />
            <InfoRow label="Birthday" value={formatDate(person.birthday)} />
            <InfoRow
              label="Contact frequency"
              value={person.frequency_target ?? "—"}
            />
            <InfoRow
              label="Health"
              value={
                <StatusBadge tone={toneForStatus(person.contact_health)}>
                  {person.contact_health ?? "—"}
                </StatusBadge>
              }
            />
            <InfoRow
              label="Active"
              value={person.active ? "Yes" : "No"}
            />
            <InfoRow label="Added" value={formatDate(person.created_at)} />
          </div>
        </DetailCard>

        <DetailCard title="How we met">
          {person.how_we_met ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {person.how_we_met}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
          {person.notes && (
            <>
              <h4 className="mt-4 text-sm font-semibold">Notes</h4>
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                {person.notes}
              </p>
            </>
          )}
        </DetailCard>
      </div>

      <DetailCard title={`Interactions (${logs.length})`}>
        {logs.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No interactions logged"
            description="Log a call, meet, or message to start tracking this relationship."
          />
        ) : (
          <ul className="divide-y divide-border">
            {logs.map((l) => (
              <li key={l.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium tabular-nums">
                      {formatDate(l.date)}
                    </span>
                    {l.mode && (
                      <StatusBadge tone="slate">{l.mode}</StatusBadge>
                    )}
                  </div>
                  {l.summary && (
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                      {l.summary}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DetailCard>
    </div>
  )
}
