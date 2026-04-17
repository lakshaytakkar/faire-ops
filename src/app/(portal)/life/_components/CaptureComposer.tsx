"use client"

import { useState, useTransition } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createTextCapture } from "../_actions/voice"
import { VoiceRecorder } from "./VoiceRecorder"
import { useRouter } from "next/navigation"

const TAGS = [
  { value: "transaction", label: "Transaction" },
  { value: "workout",     label: "Workout" },
  { value: "mood",        label: "Mood" },
  { value: "win",         label: "Win" },
  { value: "decision",    label: "Decision" },
  { value: "thought",     label: "Thought" },
] as const

/**
 * Composer pinned at the top of /life/today. One-line text input + tag
 * chips + voice recorder. Each capture lands in `life.captures` with
 * status='inbox' for later AI/manual triage.
 */
export function CaptureComposer({ className }: { className?: string }) {
  const [content, setContent] = useState("")
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()

  function submit() {
    const trimmed = content.trim()
    if (!trimmed) return
    start(async () => {
      const res = await createTextCapture({ content: trimmed, category: activeTag ?? undefined })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Captured to inbox")
      setContent("")
      setActiveTag(null)
      router.refresh()
    })
  }

  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-3", className)}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="What just happened? Type a 1-2 line note (Enter to save)…"
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          disabled={pending}
        />
        <Button type="button" size="sm" onClick={submit} disabled={pending || !content.trim()}>
          <Plus className="size-4 mr-1.5" />
          Add note
        </Button>
        <VoiceRecorder onSaved={() => router.refresh()} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="text-sm text-muted-foreground mr-1">Tag:</span>
        {TAGS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setActiveTag(activeTag === t.value ? null : t.value)}
            className={cn(
              "px-2 py-0.5 rounded-full text-sm border transition-colors",
              activeTag === t.value
                ? "bg-primary text-white border-primary"
                : "bg-background text-foreground border-border hover:border-foreground/30",
            )}
          >
            {t.label}
          </button>
        ))}
        {activeTag && (
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className="text-sm text-muted-foreground hover:text-foreground ml-1"
          >
            clear
          </button>
        )}
      </div>
    </div>
  )
}
