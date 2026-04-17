"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mic, FileText, Sparkles, Archive, Trash2, Loader2, Inbox } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/format"
import {
  transcribeCapture,
  suggestExtraction,
  applyExtraction,
  archiveCapture,
  deleteCapture,
  reopenCapture,
  type ProposedRow,
} from "../_actions/ai"

export interface CaptureRowLite {
  id: string
  kind: "text" | "voice" | "prompt"
  status: "inbox" | "processed" | "archived"
  content: string | null
  category: string | null
  audio_url: string | null
  audio_signed_url: string | null   // resolved server-side before render
  audio_duration_secs: number | null
  transcript: string | null
  summary: string | null
  captured_at: string | null
}

export function CaptureCard({
  capture,
  showActions = true,
  initialProposed,
}: {
  capture: CaptureRowLite
  showActions?: boolean
  initialProposed?: ProposedRow[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [proposed, setProposed] = useState<ProposedRow[]>(initialProposed ?? [])
  const [picked, setPicked] = useState<Set<number>>(new Set())

  function refresh() {
    router.refresh()
  }

  function onTranscribe() {
    start(async () => {
      const res = await transcribeCapture(capture.id)
      if (!res.ok) toast.error(res.error)
      else {
        toast.success("Transcribed")
        refresh()
      }
    })
  }
  function onSuggest() {
    start(async () => {
      const res = await suggestExtraction(capture.id)
      if (!res.ok) toast.error(res.error)
      else {
        setProposed(res.proposed)
        setPicked(new Set(res.proposed.map((_, i) => i)))
        if (res.proposed.length === 0) toast.message("No structured rows suggested")
      }
    })
  }
  function onApply() {
    if (proposed.length === 0) {
      toast.error("Nothing to apply — click Suggest first")
      return
    }
    const rows = proposed.filter((_, i) => picked.has(i))
    if (rows.length === 0) {
      toast.error("Pick at least one row")
      return
    }
    start(async () => {
      const res = await applyExtraction(capture.id, rows)
      if (!res.ok) toast.error(res.error)
      else {
        toast.success(`Applied ${rows.length} row(s)`)
        setProposed([])
        setPicked(new Set())
        refresh()
      }
    })
  }
  function onArchive() {
    start(async () => {
      const res = await archiveCapture(capture.id)
      if (!res.ok) toast.error(res.error)
      else {
        toast.success("Archived")
        refresh()
      }
    })
  }
  function onReopen() {
    start(async () => {
      const res = await reopenCapture(capture.id)
      if (!res.ok) toast.error(res.error)
      else {
        toast.success("Re-opened")
        refresh()
      }
    })
  }
  function onDelete() {
    if (!confirm("Delete this capture? This cannot be undone.")) return
    start(async () => {
      const res = await deleteCapture(capture.id)
      if (!res.ok) toast.error(res.error)
      else {
        toast.success("Deleted")
        refresh()
      }
    })
  }

  const text = capture.transcript ?? capture.content ?? null
  const showTranscribeBtn = capture.kind === "voice" && !capture.transcript

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {capture.kind === "voice" ? (
            <Mic className="size-4 text-violet-600" />
          ) : (
            <FileText className="size-4 text-blue-600" />
          )}
          <Link
            href={`/life/inbox/${capture.id}`}
            className="text-sm font-medium hover:text-primary"
          >
            {capture.summary ?? (text ? text.slice(0, 80) : "(empty capture)")}
          </Link>
          {capture.category && <StatusBadge tone="slate">{capture.category}</StatusBadge>}
          <StatusBadge tone={statusTone(capture.status)}>{capture.status}</StatusBadge>
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">
          {capture.captured_at ? formatDateTime(capture.captured_at) : "—"}
        </span>
      </div>

      {capture.audio_signed_url && (
        <audio controls src={capture.audio_signed_url} className="w-full h-9" preload="none" />
      )}

      {text && (
        <p className="text-sm whitespace-pre-line text-foreground">{text}</p>
      )}
      {capture.kind === "voice" && !text && (
        <p className="text-sm text-muted-foreground italic">[needs transcription]</p>
      )}

      {showActions && (
        <div className="flex flex-wrap gap-2 pt-1">
          {showTranscribeBtn && (
            <Button type="button" size="sm" variant="outline" onClick={onTranscribe} disabled={pending}>
              {pending ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <FileText className="size-3.5 mr-1.5" />}
              Transcribe
            </Button>
          )}
          {capture.status === "inbox" && (
            <>
              <Button type="button" size="sm" variant="outline" onClick={onSuggest} disabled={pending}>
                {pending ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Sparkles className="size-3.5 mr-1.5" />}
                Suggest
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onArchive} disabled={pending}>
                <Archive className="size-3.5 mr-1.5" />
                Archive
              </Button>
            </>
          )}
          {capture.status !== "inbox" && (
            <Button type="button" size="sm" variant="outline" onClick={onReopen} disabled={pending}>
              <Inbox className="size-3.5 mr-1.5" />
              Re-open
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onDelete}
            disabled={pending}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-3.5 mr-1.5" />
            Delete
          </Button>
        </div>
      )}

      {proposed.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Proposed rows</p>
            <Button type="button" size="sm" onClick={onApply} disabled={pending}>
              Apply {picked.size}
            </Button>
          </div>
          <ol className="space-y-2">
            {proposed.map((p, i) => (
              <li key={i} className="rounded border bg-background p-2.5 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={picked.has(i)}
                  onChange={(e) => {
                    const next = new Set(picked)
                    if (e.target.checked) next.add(i)
                    else next.delete(i)
                    setPicked(next)
                  }}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-semibold">{p.table}</code>
                    {p.reason && <span className="text-sm text-muted-foreground">{p.reason}</span>}
                  </div>
                  <pre className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap break-words">
{JSON.stringify(p.values, null, 2)}
                  </pre>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function statusTone(s: string): StatusTone {
  switch (s) {
    case "inbox": return "amber"
    case "processed": return "emerald"
    case "archived": return "slate"
    default: return "slate"
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${formatDate(iso)} · ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
}
