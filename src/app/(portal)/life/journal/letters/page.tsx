import { Mail, MailOpen, Lock, Send } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { TimelineList, type TimelineItem } from "@/components/shared/timeline-list"
import { type StatusTone } from "@/components/shared/status-badge"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Letters to self — Life | Suprans" }

interface LetterRow {
  id: string
  subject: string | null
  content: string | null
  written_on: string | null
  open_on: string | null
  status: string | null
}

async function fetchLetters() {
  const { data, error } = await supabaseLife
    .from("letters_to_self")
    .select("id, subject, content, written_on, open_on, status")
    .order("written_on", { ascending: false })
    .limit(200)
  if (error) console.error("life.letters_to_self:", error.message)
  return (data ?? []) as LetterRow[]
}

function preview(s: string | null, n = 200): string | undefined {
  if (!s) return undefined
  const trimmed = s.trim()
  return trimmed.length > n ? `${trimmed.slice(0, n).trimEnd()}…` : trimmed
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default async function LifeLettersPage() {
  const rows = await fetchLetters()
  const today = todayISO()

  const opened = rows.filter((r) => r.status === "opened").length
  const sealed = rows.filter((r) => r.status !== "opened").length
  const readyToOpen = rows.filter((r) => r.status !== "opened" && r.open_on && r.open_on <= today).length
  const stillWaiting = rows.filter((r) => r.status !== "opened" && (!r.open_on || r.open_on > today)).length

  const items: TimelineItem[] = rows
    .filter((r) => r.written_on)
    .map((r) => {
      const isOpened = r.status === "opened"
      const ready = !isOpened && r.open_on && r.open_on <= today
      const state: "opened" | "ready" | "sealed" = isOpened ? "opened" : ready ? "ready" : "sealed"
      const tone: StatusTone = state === "opened" ? "emerald" : state === "ready" ? "amber" : "slate"
      const body = isOpened
        ? preview(r.content)
        : `(sealed — opens ${r.open_on ? formatDate(r.open_on) : "—"})`
      const meta = !isOpened && r.open_on ? `Open on ${formatDate(r.open_on)}` : undefined
      return {
        id: r.id,
        date: r.written_on as string,
        title: r.subject ?? "Untitled",
        body,
        badge: { label: state, tone },
        meta,
      }
    })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        actions={
          <GenericAddLauncher
            table="letters_to_self"
            listHref="/life/journal/letters"
            title="New letter"
          />
        }
        title="Letters to self"
        subtitle={`${rows.length.toLocaleString("en-IN")} letter${rows.length === 1 ? "" : "s"}`}
      />

      <KPIGrid>
        <MetricCard label="Sealed" value={sealed} icon={Lock} iconTone="slate" />
        <MetricCard label="Ready to open" value={readyToOpen} icon={Send} iconTone="emerald" />
        <MetricCard label="Still waiting" value={stillWaiting} icon={Mail} iconTone="amber" />
        <MetricCard label="Opened" value={opened} icon={MailOpen} iconTone="blue" />
      </KPIGrid>

      <TimelineList
        items={items}
        emptyMessage="No letters yet. Write a note to your future self. Seal it with an open date. Reread when the day arrives."
      />
    </div>
  )
}
