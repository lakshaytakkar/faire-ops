import { Bookmark, Eye, CheckCheck, Inbox } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { CapturesClient, type CaptureRow } from "./captures-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Captures — Life | Suprans" }

async function fetchCaptures() {
  const { data, error } = await supabaseLife
    .from("captures")
    .select("id, content, source, category, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500)
  if (error) console.error("life.captures:", error.message)
  return (data ?? []) as CaptureRow[]
}

export default async function LifeCapturesPage() {
  const rows = await fetchCaptures()
  const saved = rows.filter((r) => r.status === "saved").length
  const reviewed = rows.filter((r) => r.status === "reviewed").length
  const actioned = rows.filter((r) => r.status === "actioned").length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Captures"
        subtitle={`${rows.length.toLocaleString("en-IN")} item${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="captures"
            listHref="/life/growth/captures"
            title="New capture"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Total" value={rows.length} icon={Inbox} iconTone="slate" />
        <MetricCard label="Saved" value={saved} icon={Bookmark} iconTone="amber" />
        <MetricCard label="Reviewed" value={reviewed} icon={Eye} iconTone="blue" />
        <MetricCard label="Actioned" value={actioned} icon={CheckCheck} iconTone="emerald" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing captured yet"
          description="Anything worth a second look — articles, tweets, ideas — comes here first. Review weekly."
        />
      ) : (
        <CapturesClient rows={rows} />
      )}
    </div>
  )
}
