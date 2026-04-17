"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Mic, Square, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { uploadVoiceNote } from "../_actions/voice"

/**
 * Native voice recorder. Records with MediaRecorder, then POSTs the blob
 * to the `uploadVoiceNote` server action (FormData). The server uploads
 * via service-role — browser needs no storage permissions.
 */
export function VoiceRecorder({
  onSaved,
  className,
}: {
  onSaved?: (captureId?: string) => void
  className?: string
}) {
  const [recording, setRecording] = useState(false)
  const [pending, start] = useTransition()
  const [seconds, setSeconds] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef<number>(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop()
      }
    }
  }, [])

  async function startRecording() {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Recording not supported in this browser")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickMimeType()
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const elapsed = (Date.now() - startedAtRef.current) / 1000
        const type = mr.mimeType || "audio/webm"
        const blob = new Blob(chunksRef.current, { type })
        void send(blob, elapsed, type)
      }
      recorderRef.current = mr
      startedAtRef.current = Date.now()
      mr.start()
      setRecording(true)
      setSeconds(0)
      tickRef.current = setInterval(() => {
        setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }, 250)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start recording")
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop()
    }
    setRecording(false)
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }

  function send(blob: Blob, durationSecs: number, mime: string) {
    if (blob.size === 0) {
      toast.error("Empty recording")
      return
    }
    start(async () => {
      const ext = mime.includes("mp4") ? "mp4" : "webm"
      const fd = new FormData()
      fd.append("audio", new File([blob], `voice.${ext}`, { type: mime }))
      fd.append("duration", String(durationSecs))
      const res = await uploadVoiceNote(fd)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Voice note saved to inbox")
      onSaved?.(res.id)
    })
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!recording && !pending && (
        <Button type="button" variant="outline" size="sm" onClick={startRecording}>
          <Mic className="size-4 mr-1.5" />
          Record voice note
        </Button>
      )}
      {recording && (
        <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
          <Square className="size-4 mr-1.5" />
          Stop · <span className="tabular-nums ml-1">{formatSecs(seconds)}</span>
        </Button>
      )}
      {pending && (
        <span className="inline-flex items-center text-sm text-muted-foreground">
          <Loader2 className="size-4 mr-1.5 animate-spin" /> Saving…
        </span>
      )}
    </div>
  )
}

function pickMimeType(): string | null {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return null
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c
  }
  return null
}

function formatSecs(s: number) {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, "0")}`
}
