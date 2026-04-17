import { ListVideo, Video, FileText, Mic } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { QueueClient, type QueueRow } from "./queue-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Queue — Life | Suprans" }

async function fetchQueue() {
  const { data, error } = await supabaseLife
    .from("queue_items")
    .select("id, title, url, type, status, creator, created_at")
    .order("created_at", { ascending: false })
    .limit(500)
  if (error) console.error("life.queue_items:", error.message)
  return (data ?? []) as QueueRow[]
}

export default async function LifeQueuePage() {
  const rows = await fetchQueue()
  const videos = rows.filter((r) => r.type === "video").length
  const articles = rows.filter((r) => r.type === "article").length
  const podcasts = rows.filter((r) => r.type === "podcast").length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Queue"
        subtitle={`${rows.length.toLocaleString("en-IN")} item${rows.length === 1 ? "" : "s"} to consume`}
        actions={
          <GenericAddLauncher
            table="queue_items"
            listHref="/life/growth/queue"
            title="New queue item"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Total queued" value={rows.length} icon={ListVideo} iconTone="emerald" />
        <MetricCard label="Videos" value={videos} icon={Video} iconTone="red" />
        <MetricCard label="Articles" value={articles} icon={FileText} iconTone="blue" />
        <MetricCard label="Podcasts" value={podcasts} icon={Mic} iconTone="violet" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={ListVideo}
          title="Queue is empty"
          description="Save things to watch, read, listen — but only if you'll actually get to them. Inbox-zero spirit."
        />
      ) : (
        <QueueClient rows={rows} />
      )}
    </div>
  )
}
