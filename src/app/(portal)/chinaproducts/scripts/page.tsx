import Link from "next/link"
import { FileText, MessageSquare } from "lucide-react"
import { supabaseChinaproducts } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { intentLabel, intentTone } from "../_components/queue-labels"

export const dynamic = "force-dynamic"
export const metadata = { title: "Script library — chinaproducts.in | Suprans" }

interface ScriptRow {
  id: string
  intent: string
  language: string
  title: string
  opener: string | null
  is_active: boolean
}

interface ObjectionRow {
  id: string
  intent: string
  objection_text: string
  response_text: string
  category: string | null
}

async function fetchLibrary() {
  const [scriptsRes, objectionsRes] = await Promise.all([
    supabaseChinaproducts
      .from("call_scripts")
      .select("id, intent, language, title, opener, is_active")
      .order("intent", { ascending: true }),
    supabaseChinaproducts
      .from("objection_handlers")
      .select("id, intent, objection_text, response_text, category")
      .eq("is_active", true)
      .order("intent", { ascending: true })
      .order("sort_order", { ascending: true }),
  ])
  return {
    scripts: (scriptsRes.data ?? []) as ScriptRow[],
    objections: (objectionsRes.data ?? []) as ObjectionRow[],
  }
}

export default async function ChinaproductsScriptsPage() {
  const { scripts, objections } = await fetchLibrary()

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Script library"
        subtitle="Hinglish call scripts + objection responses the rep team uses live on customer calls."
      />

      <KPIGrid>
        <MetricCard label="Call scripts"      value={scripts.length}    icon={FileText}       iconTone="blue" />
        <MetricCard label="Objection handlers" value={objections.length} icon={MessageSquare}  iconTone="violet" />
        <MetricCard label="Active scripts"    value={scripts.filter((s) => s.is_active).length} icon={FileText} iconTone="emerald" />
        <MetricCard label="Intents covered"   value={new Set(scripts.map((s) => s.intent)).size} icon={FileText} iconTone="amber" />
      </KPIGrid>

      <DetailCard title="Call scripts">
        {scripts.length === 0 ? (
          <EmptyState icon={FileText} title="No scripts yet" description="Add intent-specific scripts so the rep team can pick them up mid-call." />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-y">
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Title</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Intent</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Language</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Opener</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {scripts.map((s) => (
                  <tr key={s.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/chinaproducts/scripts/${s.id}`} className="text-sm font-semibold hover:text-primary">
                        {s.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3"><StatusBadge tone={intentTone(s.intent)}>{intentLabel(s.intent)}</StatusBadge></td>
                    <td className="px-5 py-3"><StatusBadge tone="amber">{s.language}</StatusBadge></td>
                    <td className="px-5 py-3 text-sm text-muted-foreground max-w-[520px] truncate italic">
                      {s.opener ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={s.is_active ? "emerald" : "slate"}>
                        {s.is_active ? "Active" : "Archived"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>

      <DetailCard title="Objection handlers">
        {objections.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No objection templates" />
        ) : (
          <div className="space-y-2">
            {objections.map((o) => (
              <div key={o.id} className="grid grid-cols-1 md:grid-cols-[180px_1fr_1fr] gap-2 items-stretch">
                <div className="flex flex-col justify-center">
                  <StatusBadge tone={intentTone(o.intent)}>{intentLabel(o.intent)}</StatusBadge>
                  {o.category && (
                    <span className="mt-1 text-xs text-muted-foreground">{o.category}</span>
                  )}
                </div>
                <div className="rounded-md bg-red-50 border border-red-200 p-3">
                  <p className="text-sm italic text-red-900">“{o.objection_text}”</p>
                </div>
                <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
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
