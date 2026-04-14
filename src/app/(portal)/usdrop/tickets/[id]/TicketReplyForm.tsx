"use client"

import { useState, useTransition } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { replyToTicket } from "@/app/(portal)/usdrop/_actions/crud"

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const [content, setContent] = useState("")
  const [isInternal, setIsInternal] = useState(false)
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  function submit() {
    if (!content.trim()) return
    setErr(null)
    start(async () => {
      const res = await replyToTicket(ticketId, null, content.trim(), isInternal)
      if (!res.ok) setErr(res.error)
      else setContent("")
    })
  }

  return (
    <div className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={isInternal ? "Add an internal note…" : "Reply to the user…"}
        rows={4}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isInternal}
            onChange={(e) => setIsInternal(e.target.checked)}
          />
          Internal note (not shown to user)
        </label>
        <div className="flex items-center gap-3">
          {err && <span className="text-sm text-destructive">{err}</span>}
          <Button onClick={submit} disabled={pending || !content.trim()}>
            <Send className="size-3.5" />
            <span className="ml-1.5">{pending ? "Sending…" : "Send reply"}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
