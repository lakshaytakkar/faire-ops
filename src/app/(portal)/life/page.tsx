import Link from "next/link"
import { Inbox, CheckCircle2, BookOpen, Banknote, Heart } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { CaptureComposer } from "./_components/CaptureComposer"
import { DailyJournalForm, type JournalToday } from "./_components/DailyJournalForm"
import { CaptureCard, type CaptureRowLite } from "./_components/CaptureCard"
import { resolveSignedAudioUrl } from "./_lib/signed-url"

export const dynamic = "force-dynamic"
export const metadata = { title: "Today — Life | Suprans" }

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export default async function LifeTodayPage() {
  const today = todayISO()
  const [{ data: journalRow }, { data: capturesRaw }] = await Promise.all([
    supabaseLife
      .from("journal_entries")
      .select("date, brain_dump, best_part, change_one_thing, grateful_for, worried_about, one_learning, mood, energy, day_rating")
      .eq("date", today)
      .maybeSingle(),
    supabaseLife
      .from("captures")
      .select("id, kind, status, content, category, audio_url, audio_duration_secs, transcript, summary, captured_at")
      .gte("captured_at", `${today}T00:00:00.000Z`)
      .order("captured_at", { ascending: false })
      .limit(50),
  ])

  const initial: JournalToday = {
    date: today,
    brain_dump:       (journalRow?.brain_dump       as string | null) ?? null,
    best_part:        (journalRow?.best_part        as string | null) ?? null,
    change_one_thing: (journalRow?.change_one_thing as string | null) ?? null,
    grateful_for:     (journalRow?.grateful_for     as string | null) ?? null,
    worried_about:    (journalRow?.worried_about    as string | null) ?? null,
    one_learning:     (journalRow?.one_learning     as string | null) ?? null,
    mood:       (journalRow?.mood       as number | null) ?? null,
    energy:     (journalRow?.energy     as number | null) ?? null,
    day_rating: (journalRow?.day_rating as number | null) ?? null,
  }

  const captures: CaptureRowLite[] = await Promise.all(
    (capturesRaw ?? []).map(async (c) => ({
      id: c.id as string,
      kind: (c.kind as "text" | "voice" | "prompt") ?? "text",
      status: (c.status as "inbox" | "processed" | "archived") ?? "inbox",
      content: (c.content as string | null) ?? null,
      category: (c.category as string | null) ?? null,
      audio_url: (c.audio_url as string | null) ?? null,
      audio_signed_url: c.audio_url ? await resolveSignedAudioUrl(c.audio_url as string) : null,
      audio_duration_secs: (c.audio_duration_secs as number | null) ?? null,
      transcript: (c.transcript as string | null) ?? null,
      summary: (c.summary as string | null) ?? null,
      captured_at: (c.captured_at as string | null) ?? null,
    })),
  )

  const inbox = captures.filter((c) => c.status === "inbox")
  const processed = captures.filter((c) => c.status === "processed")

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Hero gradient banner */}
      <div className="relative isolate overflow-hidden rounded-2xl"
           style={{ background: "linear-gradient(135deg, hsl(270,50%,12%) 0%, hsl(265,60%,30%) 100%)" }}>
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-300/80">Life OS</p>
          <h1 className="mt-1 text-2xl font-bold font-heading text-white">Daily Journal &amp; Captures</h1>
          <p className="mt-1 text-sm text-white/70">Personal tracking &amp; quick capture</p>
          <div className="mt-6 grid grid-cols-3 gap-6">
            <div>
              <p className="text-2xl font-bold tabular-nums text-white">{journalRow ? "1" : "0"}</p>
              <p className="text-sm text-white/60">Journal today</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-white">{captures.length}</p>
              <p className="text-sm text-white/60">Total captures</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-white">{inbox.length}</p>
              <p className="text-sm text-white/60">Pending inbox</p>
            </div>
          </div>
        </div>
      </div>

      <CaptureComposer />

      <DailyJournalForm initial={initial} />

      <DetailCard
        title={`Today's captures (${captures.length})`}
        actions={
          inbox.length > 0 ? (
            <a href="/life/inbox" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
              <Inbox className="size-3.5" /> Triage {inbox.length}
            </a>
          ) : undefined
        }
      >
        {captures.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Nothing captured yet"
            description="Type a note above or record a voice note. Each capture lands in your inbox for AI to structure."
          />
        ) : (
          <div className="space-y-3">
            {inbox.map((c) => (
              <CaptureCard key={c.id} capture={c} showActions />
            ))}
            {processed.length > 0 && (
              <>
                <p className="text-sm font-semibold text-muted-foreground pt-2">Processed</p>
                {processed.map((c) => (
                  <CaptureCard key={c.id} capture={c} showActions />
                ))}
              </>
            )}
          </div>
        )}
      </DetailCard>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/life/journal" className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all">
          <BookOpen className="size-5 text-purple-500 mb-2" />
          <p className="text-sm font-semibold text-foreground group-hover:text-primary">Journal</p>
          <p className="text-sm text-muted-foreground">Past entries &amp; reflections</p>
        </Link>
        <Link href="/life/finances" className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all">
          <Banknote className="size-5 text-emerald-500 mb-2" />
          <p className="text-sm font-semibold text-foreground group-hover:text-primary">Finances</p>
          <p className="text-sm text-muted-foreground">Personal finance tracking</p>
        </Link>
        <Link href="/life/health" className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all">
          <Heart className="size-5 text-rose-500 mb-2" />
          <p className="text-sm font-semibold text-foreground group-hover:text-primary">Health</p>
          <p className="text-sm text-muted-foreground">Wellness &amp; fitness logs</p>
        </Link>
      </div>
    </div>
  )
}
