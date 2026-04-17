import { notFound } from "next/navigation"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { BackLink } from "@/components/shared/back-link"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { CaptureCard, type CaptureRowLite } from "../../_components/CaptureCard"
import { resolveSignedAudioUrl } from "../../_lib/signed-url"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Capture — Inbox | Life" }

export default async function LifeCaptureDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data } = await supabaseLife
    .from("captures")
    .select("id, kind, status, content, category, audio_url, audio_duration_secs, transcript, summary, captured_at, extracted_rows, extracted_at, action_item")
    .eq("id", id)
    .maybeSingle()

  if (!data) notFound()

  const capture: CaptureRowLite = {
    id: data.id as string,
    kind: (data.kind as "text" | "voice" | "prompt") ?? "text",
    status: (data.status as "inbox" | "processed" | "archived") ?? "inbox",
    content: (data.content as string | null) ?? null,
    category: (data.category as string | null) ?? null,
    audio_url: (data.audio_url as string | null) ?? null,
    audio_signed_url: data.audio_url ? await resolveSignedAudioUrl(data.audio_url as string) : null,
    audio_duration_secs: (data.audio_duration_secs as number | null) ?? null,
    transcript: (data.transcript as string | null) ?? null,
    summary: (data.summary as string | null) ?? null,
    captured_at: (data.captured_at as string | null) ?? null,
  }

  const extractedRows = (data.extracted_rows as unknown[] | null) ?? null

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/life/inbox" label="All inbox" />
      <PageHeader title="Capture" subtitle={capture.summary ?? undefined} />

      <CaptureCard capture={capture} showActions />

      <DetailCard title="Metadata">
        <div className="space-y-0">
          <InfoRow label="Kind" value={capture.kind} />
          <InfoRow label="Status" value={capture.status} />
          <InfoRow label="Category" value={capture.category ?? "—"} />
          <InfoRow label="Captured" value={capture.captured_at ? formatDate(capture.captured_at) : "—"} />
          <InfoRow label="Duration" value={capture.audio_duration_secs ? `${capture.audio_duration_secs}s` : "—"} />
          <InfoRow label="Action item" value={(data.action_item as string | null) ?? "—"} />
          <InfoRow label="Extracted at" value={data.extracted_at ? formatDate(data.extracted_at as string) : "—"} />
        </div>
      </DetailCard>

      {extractedRows && extractedRows.length > 0 && (
        <DetailCard title={`Extracted rows (${extractedRows.length})`}>
          <pre className="text-sm whitespace-pre-wrap break-words">
{JSON.stringify(extractedRows, null, 2)}
          </pre>
        </DetailCard>
      )}
    </div>
  )
}
