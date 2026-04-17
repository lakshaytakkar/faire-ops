import { notFound } from "next/navigation"
import { FileText } from "lucide-react"
import { supabaseChinaproducts } from "@/lib/supabase"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { intentLabel, intentTone } from "../../_components/queue-labels"

export const dynamic = "force-dynamic"

interface ScriptDetail {
  id: string
  intent: string
  language: string
  title: string
  opener: string
  pitch: string
  close_line: string
  is_active: boolean
}

interface ObjectionRow {
  id: string
  objection_text: string
  response_text: string
  category: string | null
}

export default async function ChinaproductsScriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data, error } = await supabaseChinaproducts
    .from("call_scripts")
    .select("*")
    .eq("id", id)
    .maybeSingle<ScriptDetail>()

  if (error) console.error("chinaproducts.call_scripts detail:", error.message)
  if (!data) notFound()

  const { data: objectionsData } = await supabaseChinaproducts
    .from("objection_handlers")
    .select("id, objection_text, response_text, category")
    .eq("intent", data.intent)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })

  const objections = (objectionsData ?? []) as ObjectionRow[]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/chinaproducts/scripts" label="Script library" />

      <HeroCard
        title={data.title}
        subtitle={`Use when the buyer signals ${intentLabel(data.intent).toLowerCase()}.`}
        icon={FileText}
        tone="red"
        meta={
          <>
            <StatusBadge tone={intentTone(data.intent)}>{intentLabel(data.intent)}</StatusBadge>
            <StatusBadge tone="amber">{data.language}</StatusBadge>
            <StatusBadge tone={data.is_active ? "emerald" : "slate"}>
              {data.is_active ? "Active" : "Archived"}
            </StatusBadge>
          </>
        }
      />

      <DetailCard title="Script">
        <div className="space-y-3">
          <ScriptBlock label="OPENER (0–30s)" body={data.opener} />
          <ScriptBlock label="PITCH (30–90s)" body={data.pitch} />
          <ScriptBlock label="CLOSE (90–120s)" body={data.close_line} />
        </div>
      </DetailCard>

      <DetailCard title={`Objection handlers · ${objections.length}`}>
        {objections.length === 0 ? (
          <EmptyState title="No objection templates for this intent" />
        ) : (
          <div className="space-y-3">
            {objections.map((o) => (
              <div key={o.id} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md bg-red-50 border border-red-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-700 mb-1">
                    Objection
                  </p>
                  <p className="text-sm italic text-red-900">“{o.objection_text}”</p>
                </div>
                <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1">
                    Response
                  </p>
                  <p className="text-sm text-emerald-900">{o.response_text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailCard>
    </div>
  )
}

function ScriptBlock({ label, body }: { label: string; body: string | null }) {
  return (
    <div className="rounded-md bg-card border-l-[3px] border-red-600 pl-4 pr-3 py-3">
      <p className="text-xs font-mono font-semibold uppercase tracking-wider text-red-700 mb-1">
        {label}
      </p>
      <p className="text-sm italic text-foreground leading-relaxed">{body || "—"}</p>
    </div>
  )
}
