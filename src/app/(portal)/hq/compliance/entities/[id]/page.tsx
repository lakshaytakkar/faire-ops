import { notFound } from "next/navigation"
import { Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { supabaseHq } from "@/lib/supabase"
import { formatDate } from "@/lib/format"
import {
  EntityDetailTabs,
  type EntityDetail,
  type EntityFilingRow,
} from "./entity-detail-tabs"

// HQ → Compliance → Entity detail. Server component; fetches entity + its
// filings and hands them to the client tabs component.

export const dynamic = "force-dynamic"

type Params = { id: string }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params
  return { title: `Entity ${id.slice(0, 8)} — HQ | Suprans` }
}

async function fetchEntity(id: string) {
  const [entRes, filingsRes] = await Promise.all([
    supabaseHq
      .from("entities")
      .select("id, name, country, type, reg_no, currency, incorporated_at, is_active")
      .eq("id", id)
      .maybeSingle(),
    supabaseHq
      .from("filings")
      .select("id, filing_type, period, due_date, filed_date, status")
      .eq("entity_id", id)
      .order("due_date", { ascending: false }),
  ])

  if (!entRes.data) return null
  return {
    entity: entRes.data as EntityDetail,
    filings: (filingsRes.data ?? []) as EntityFilingRow[],
  }
}

export default async function HqEntityDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const data = await fetchEntity(id)
  if (!data) notFound()
  const { entity, filings } = data

  const subtitleParts = [entity.country, entity.type, entity.reg_no].filter(
    Boolean,
  ) as string[]

  const status = entity.is_active === false ? "inactive" : "active"

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/hq/compliance/entities" label="All entities" />

      <HeroCard
        title={entity.name ?? "Untitled entity"}
        subtitle={subtitleParts.length ? subtitleParts.join(" · ") : undefined}
        icon={Building2}
        tone="blue"
        meta={
          <>
            <StatusBadge tone={toneForStatus(status)}>{status}</StatusBadge>
            {entity.incorporated_at && (
              <span className="text-xs text-muted-foreground">
                Incorporated {formatDate(entity.incorporated_at)}
              </span>
            )}
          </>
        }
        actions={
          <>
            <Button size="sm" variant="outline" disabled>
              Edit
            </Button>
            <Button size="sm" variant="outline" disabled>
              Archive
            </Button>
          </>
        }
      />

      <EntityDetailTabs entity={entity} filings={filings} />
    </div>
  )
}
