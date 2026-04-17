import { notFound } from "next/navigation"
import { Headphones, Phone, Mail, Building2 } from "lucide-react"
import { supabaseChinaproducts } from "@/lib/supabase"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatCurrency, formatDateTime, relativeTime } from "@/lib/format"
import { intentLabel, intentTone, priorityTone } from "../../_components/queue-labels"

export const dynamic = "force-dynamic"

interface QueueRow {
  id: string
  buyer_name: string
  buyer_company: string | null
  buyer_phone: string | null
  buyer_email: string | null
  intent: string
  priority: string
  potential_value_inr: number | string | null
  last_activity_at: string | null
  last_activity_summary: string | null
  status: string
  related_product_id: string | null
  related_order_id: string | null
  resolution_note: string | null
  created_at: string | null
}

interface CallScript {
  id: string
  language: string
  title: string
  opener: string
  pitch: string
  close_line: string
}

interface ObjectionRow {
  id: string
  objection_text: string
  response_text: string
  category: string | null
}

export default async function ChinaproductsQueueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: row, error } = await supabaseChinaproducts
    .from("rep_queue")
    .select(
      "id, buyer_name, buyer_company, buyer_phone, buyer_email, intent, priority, potential_value_inr, last_activity_at, last_activity_summary, status, related_product_id, related_order_id, resolution_note, created_at",
    )
    .eq("id", id)
    .maybeSingle<QueueRow>()

  if (error) console.error("chinaproducts.rep_queue detail:", error.message)
  if (!row) notFound()

  const [scriptsRes, objectionsRes] = await Promise.all([
    supabaseChinaproducts
      .from("call_scripts")
      .select("id, language, title, opener, pitch, close_line")
      .eq("intent", row.intent)
      .eq("is_active", true)
      .limit(1),
    supabaseChinaproducts
      .from("objection_handlers")
      .select("id, objection_text, response_text, category")
      .eq("intent", row.intent)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ])

  const script = (scriptsRes.data?.[0] as CallScript | undefined) ?? null
  const objections = (objectionsRes.data ?? []) as ObjectionRow[]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/chinaproducts/queue" label="All queue items" />

      <HeroCard
        title={row.buyer_name}
        subtitle={row.buyer_company ?? "No company on file"}
        icon={Headphones}
        tone="red"
        meta={
          <>
            <StatusBadge tone={intentTone(row.intent)}>{intentLabel(row.intent)}</StatusBadge>
            <StatusBadge tone={priorityTone(row.priority)}>{row.priority} priority</StatusBadge>
            <StatusBadge tone={toneForStatus(row.status)}>{row.status.replace("_", " ")}</StatusBadge>
            <span className="text-sm text-muted-foreground tabular-nums">
              Potential {formatCurrency(row.potential_value_inr)}
            </span>
          </>
        }
        actions={
          <>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-sm font-medium hover:bg-muted/40 transition-colors"
            >
              Send quote link
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-sm font-medium hover:bg-muted/40 transition-colors"
            >
              Send catalog
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-sm font-medium hover:bg-muted/40 transition-colors"
            >
              Mark resolved
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Escalate
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title={script ? `AI call script — ${script.title}` : "AI call script"}>
            {script ? (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <StatusBadge tone="amber">{script.language}</StatusBadge>
                  <span className="text-sm text-muted-foreground">
                    Use verbatim or adapt — tone first, then facts.
                  </span>
                </div>
                <div className="space-y-3">
                  <ScriptBlock label="OPENER (0–30s)" body={script.opener} />
                  <ScriptBlock label="PITCH (30–90s)" body={script.pitch} />
                  <ScriptBlock label="CLOSE (90–120s)" body={script.close_line} />
                </div>
              </>
            ) : (
              <EmptyState
                title="No script on file for this intent"
                description="Add one via /chinaproducts/scripts or fall back to the objection handler below."
              />
            )}
          </DetailCard>

          <DetailCard title="Objection handler">
            {objections.length === 0 ? (
              <EmptyState
                title="No objection templates for this intent"
                description="Capture what the buyer pushed back on and add it to the library."
              />
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  If customer says…
                </p>
                {objections.map((o) => (
                  <div
                    key={o.id}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3"
                  >
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

        <div className="space-y-5">
          <DetailCard title="Customer info">
            <InfoRow
              label="Company"
              value={
                row.buyer_company ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-muted-foreground" />
                    {row.buyer_company}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow
              label="Phone"
              value={
                row.buyer_phone ? (
                  <a
                    href={`tel:${row.buyer_phone}`}
                    className="inline-flex items-center gap-1.5 hover:text-primary"
                  >
                    <Phone className="size-3.5 text-muted-foreground" />
                    {row.buyer_phone}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow
              label="Email"
              value={
                row.buyer_email ? (
                  <a
                    href={`mailto:${row.buyer_email}`}
                    className="inline-flex items-center gap-1.5 hover:text-primary"
                  >
                    <Mail className="size-3.5 text-muted-foreground" />
                    {row.buyer_email}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow label="Potential" value={formatCurrency(row.potential_value_inr)} />
            <InfoRow label="Last activity" value={relativeTime(row.last_activity_at)} />
            <InfoRow label="Opened" value={formatDateTime(row.created_at)} />
            {row.last_activity_summary && (
              <div className="mt-3 rounded-md bg-muted/40 p-3 text-sm text-foreground/90">
                {row.last_activity_summary}
              </div>
            )}
          </DetailCard>

          <DetailCard title="Related">
            <InfoRow
              label="Order"
              value={row.related_order_id ? row.related_order_id.slice(0, 8) + "…" : "—"}
              mono={!!row.related_order_id}
            />
            <InfoRow
              label="Product"
              value={row.related_product_id ? row.related_product_id.slice(0, 8) + "…" : "—"}
              mono={!!row.related_product_id}
            />
            {row.resolution_note && (
              <div className="mt-3 rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1">
                  Resolution note
                </p>
                {row.resolution_note}
              </div>
            )}
          </DetailCard>
        </div>
      </div>
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
