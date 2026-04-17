import { Inbox, Mic, CheckCircle2, Archive } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { CaptureCard, type CaptureRowLite } from "../_components/CaptureCard"
import { resolveSignedAudioUrl } from "../_lib/signed-url"

export const dynamic = "force-dynamic"
export const metadata = { title: "Inbox — Life | Suprans" }

type CaptureDbRow = {
  id: string
  kind: string | null
  status: string | null
  content: string | null
  category: string | null
  audio_url: string | null
  audio_duration_secs: number | null
  transcript: string | null
  summary: string | null
  captured_at: string | null
  extracted_at: string | null
}

export default async function LifeInboxPage() {
  const [{ data: inboxRaw }, { data: recentProcessedRaw }, { data: pendingVoiceRaw }] = await Promise.all([
    supabaseLife
      .from("captures")
      .select("id, kind, status, content, category, audio_url, audio_duration_secs, transcript, summary, captured_at, extracted_at")
      .eq("status", "inbox")
      .order("captured_at", { ascending: false })
      .limit(100),
    supabaseLife
      .from("captures")
      .select("id, kind, status, content, category, audio_url, audio_duration_secs, transcript, summary, captured_at, extracted_at")
      .eq("status", "processed")
      .order("extracted_at", { ascending: false, nullsFirst: false })
      .limit(20),
    supabaseLife
      .from("captures")
      .select("id", { count: "exact", head: true })
      .eq("kind", "voice")
      .is("transcript", null),
  ])

  void pendingVoiceRaw // placeholder, count used via head

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const processedTodayCount = (recentProcessedRaw ?? []).filter((r) => {
    const t = r.extracted_at as string | null
    return t && new Date(t) >= todayStart
  }).length

  const inboxList = await mapCaptures((inboxRaw ?? []) as CaptureDbRow[])
  const processedList = await mapCaptures((recentProcessedRaw ?? []) as CaptureDbRow[])

  const voicePending = inboxList.filter((c) => c.kind === "voice" && !c.transcript).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Inbox"
        subtitle={`${inboxList.length} captures awaiting triage · ${processedList.length} recently processed`}
      />

      <KPIGrid>
        <MetricCard label="Inbox" value={inboxList.length} icon={Inbox} iconTone="amber" />
        <MetricCard label="Voice pending transcription" value={voicePending} icon={Mic} iconTone="violet" />
        <MetricCard label="Processed today" value={processedTodayCount} icon={CheckCircle2} iconTone="emerald" />
        <MetricCard label="Recently processed" value={processedList.length} icon={Archive} iconTone="slate" />
      </KPIGrid>

      {inboxList.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Inbox is clear"
          description="Capture new thoughts on the Today page. Voice notes and quick text both land here for triage."
        />
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Inbox · oldest first will stay on top once triaged</h2>
          {inboxList.map((c) => (
            <CaptureCard key={c.id} capture={c} showActions />
          ))}
        </section>
      )}

      {processedList.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground pt-4">Recently processed</h2>
          {processedList.map((c) => (
            <CaptureCard key={c.id} capture={c} showActions />
          ))}
        </section>
      )}
    </div>
  )
}

async function mapCaptures(rows: CaptureDbRow[]): Promise<CaptureRowLite[]> {
  return Promise.all(
    rows.map(async (c) => ({
      id: c.id,
      kind: (c.kind as "text" | "voice" | "prompt") ?? "text",
      status: (c.status as "inbox" | "processed" | "archived") ?? "inbox",
      content: c.content ?? null,
      category: c.category ?? null,
      audio_url: c.audio_url ?? null,
      audio_signed_url: c.audio_url ? await resolveSignedAudioUrl(c.audio_url) : null,
      audio_duration_secs: c.audio_duration_secs ?? null,
      transcript: c.transcript ?? null,
      summary: c.summary ?? null,
      captured_at: c.captured_at ?? null,
    })),
  )
}
