import { ListChecks, Star, Activity, CheckCircle2 } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { BucketClient, type BucketRow } from "./bucket-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Bucket list — Life | Suprans" }

async function fetchBucket() {
  const { data, error } = await supabaseLife
    .from("bucket_list")
    .select("id, title, category, priority, status, completed_at, created_at")
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(200)
  if (error) console.error("life.bucket_list:", error.message)
  return (data ?? []) as BucketRow[]
}

export default async function LifeBucketListPage() {
  const rows = await fetchBucket()
  const dreaming = rows.filter((r) => r.status === "dreaming").length
  const inProgress = rows.filter((r) => r.status === "in_progress").length
  const done = rows.filter((r) => r.status === "complete").length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Bucket list"
        subtitle={`${rows.length.toLocaleString("en-IN")} entr${rows.length === 1 ? "y" : "ies"}`}
        actions={
          <GenericAddLauncher
            table="bucket_list"
            listHref="/life/plans/bucket-list"
            title="New bucket-list item"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Dreaming" value={dreaming} icon={Star} iconTone="amber" />
        <MetricCard label="In progress" value={inProgress} icon={Activity} iconTone="blue" />
        <MetricCard label="Complete" value={done} icon={CheckCircle2} iconTone="emerald" />
        <MetricCard label="Total" value={rows.length} icon={ListChecks} iconTone="violet" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Bucket list is empty"
          description="Things you want to do before the road runs out — write them down so they're real, not vague."
        />
      ) : (
        <BucketClient rows={rows} />
      )}
    </div>
  )
}
