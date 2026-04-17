import Link from "next/link"
import { Users, UserCheck, UserX, Phone } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import {
  ContactGrid,
  type ContactCard,
} from "@/components/shared/contact-grid"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "People — Life | Suprans" }

interface PersonRow {
  id: string
  name: string | null
  category: string | null
  phone: string | null
  email: string | null
  birthday: string | null
  location: string | null
  last_contact: string | null
  contact_health: string | null
  active: boolean | null
}

async function fetchPeople() {
  const { data, error } = await supabaseLife
    .from("people")
    .select(
      "id, name, category, phone, email, birthday, location, last_contact, contact_health, active",
    )
    .order("last_contact", { ascending: false, nullsFirst: false })
    .limit(500)
  if (error) console.error("life.people:", error.message)
  return (data ?? []) as PersonRow[]
}

function healthTone(h: string | null): StatusTone {
  switch (h) {
    case "great":
      return "emerald"
    case "good":
      return "blue"
    case "needs_attention":
      return "amber"
    case "drifting":
      return "red"
    default:
      return "slate"
  }
}

export default async function LifePeoplePage() {
  const rows = await fetchPeople()

  const activeRows = rows.filter((r) => r.active !== false)
  const inactiveRows = rows.filter((r) => r.active === false)

  const fadingOrCold = activeRows.filter(
    (r) => r.contact_health === "needs_attention" || r.contact_health === "drifting",
  ).length

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const contactedThisWeek = activeRows.filter((r) => {
    if (!r.last_contact) return false
    const d = new Date(r.last_contact)
    return d >= weekAgo
  }).length

  const cards: ContactCard[] = activeRows.map((r) => ({
    id: r.id,
    name: r.name ?? "Unnamed",
    role: r.category ?? undefined,
    lastInteraction: r.last_contact ?? undefined,
    badge: r.contact_health
      ? { label: r.contact_health, tone: healthTone(r.contact_health) }
      : undefined,
    href: `/life/people/${r.id}`,
  }))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="People"
        subtitle={`${rows.length.toLocaleString("en-IN")} contact${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="people"
            listHref="/life/people"
            title="New person"
            defaults={{ active: true }}
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Total contacts" value={rows.length} icon={Users} iconTone="slate" />
        <MetricCard
          label="Active"
          value={activeRows.length}
          icon={UserCheck}
          iconTone="emerald"
        />
        <MetricCard
          label="Fading / cold"
          value={fadingOrCold}
          icon={UserX}
          iconTone="amber"
        />
        <MetricCard
          label="Contacted this week"
          value={contactedThisWeek}
          icon={Phone}
          iconTone="blue"
        />
      </KPIGrid>

      <ContactGrid
        contacts={cards}
        emptyMessage="Build your relationship CRM — the most undervalued spreadsheet in your life."
      />

      {inactiveRows.length > 0 && (
        <DetailCard title={`Inactive (${inactiveRows.length})`}>
          <ul className="divide-y">
            {inactiveRows.map((r) => (
              <li key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/life/people/${r.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary truncate block"
                  >
                    {r.name ?? "Unnamed"}
                  </Link>
                  <div className="text-sm text-muted-foreground tabular-nums">
                    {r.category ?? "—"}
                    {r.last_contact ? ` · last ${formatDate(r.last_contact)}` : ""}
                  </div>
                </div>
                {r.contact_health && (
                  <StatusBadge tone={healthTone(r.contact_health)}>
                    {r.contact_health}
                  </StatusBadge>
                )}
              </li>
            ))}
          </ul>
        </DetailCard>
      )}
    </div>
  )
}
