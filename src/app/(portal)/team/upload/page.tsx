"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Camera, CheckCircle2, Loader2, Upload, AlertCircle } from "lucide-react"
import { EtsListShell } from "@/app/(portal)/ets/_components/ets-ui"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IMAGE_SLOTS, SECTIONS, type ImageSlot, publicUrlFor } from "@/lib/landing-image-slots"
import { cn } from "@/lib/utils"

type SlotState = {
  status: "idle" | "uploading" | "done" | "error"
  message?: string
  /** Public URL after a successful upload, with cache-buster. */
  freshUrl?: string
}

export default function TeamUploadPage() {
  const [section, setSection] = useState<string>("All")
  const [states, setStates] = useState<Record<string, SlotState>>({})

  const visible = useMemo(
    () => (section === "All" ? IMAGE_SLOTS : IMAGE_SLOTS.filter((s) => s.section === section)),
    [section],
  )

  const doneCount = Object.values(states).filter((s) => s.status === "done").length

  async function handleFile(slot: ImageSlot, file: File) {
    setStates((prev) => ({ ...prev, [slot.key]: { status: "uploading" } }))
    try {
      const fd = new FormData()
      fd.append("slot", slot.key)
      fd.append("file", file)
      const res = await fetch("/api/team/upload-image", { method: "POST", body: fd })
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string }
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `${res.status}`)
      }
      setStates((prev) => ({
        ...prev,
        [slot.key]: { status: "done", freshUrl: data.url },
      }))
    } catch (err: any) {
      setStates((prev) => ({
        ...prev,
        [slot.key]: { status: "error", message: err?.message ?? "Upload failed" },
      }))
    }
  }

  return (
    <EtsListShell
      title="Team — Image upload"
      subtitle={`Upload real photos for the public Suprans.in site. ${IMAGE_SLOTS.length} named slots, organized by page. Uploads resize automatically — send the highest-resolution original you have.`}
    >
      {/* Section filter */}
      <div className="flex flex-wrap gap-2">
        {(["All", ...SECTIONS] as const).map((s) => (
          <Button
            key={s}
            variant={section === s ? "default" : "outline"}
            size="sm"
            onClick={() => setSection(s)}
          >
            {s}
            {s !== "All" && (
              <Badge variant="outline" className="ml-1.5">
                {IMAGE_SLOTS.filter((x) => x.section === s).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* How-to */}
      <Card className="p-5 max-w-3xl">
        <h2 className="text-base font-semibold mb-2">How to use this page</h2>
        <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
          <li>Pick a slot below. Each one tells you what photo to send and how to frame it.</li>
          <li>Tap the upload area. On phone you can pick from gallery or take a fresh photo.</li>
          <li>The server resizes and saves to the right place automatically — no need to crop yourself.</li>
          <li>The new image goes live on suprans.in within a few seconds.</li>
        </ol>
        <div className="mt-3 text-sm">
          Progress: <span className="font-semibold">{doneCount}</span> of {IMAGE_SLOTS.length} replaced this session.
        </div>
      </Card>

      {/* Slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((slot) => {
          const state = states[slot.key] ?? { status: "idle" as const }
          const previewUrl = state.freshUrl ?? slot.current
          return (
            <Card key={slot.key} className="overflow-hidden">
              <div className="relative aspect-[3/2] bg-muted">
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={slot.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                {state.status === "done" && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="size-3" /> Replaced
                    </Badge>
                  </div>
                )}
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{slot.section}</Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {slot.width}×{slot.height} {slot.format.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold leading-snug">{slot.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{slot.brief}</p>
                <p className="text-xs text-muted-foreground italic">{slot.composition}</p>

                <UploadInput slot={slot} state={state} onFile={(f) => handleFile(slot, f)} />

                {state.status === "error" && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="size-3" /> {state.message}
                  </p>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </EtsListShell>
  )
}

function UploadInput({
  slot,
  state,
  onFile,
}: {
  slot: ImageSlot
  state: SlotState
  onFile: (file: File) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const inputId = `upload-${slot.key}`
  const cameraId = `camera-${slot.key}`
  const isUploading = state.status === "uploading"

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files[0]
          if (f) onFile(f)
        }}
        className={cn(
          "flex items-center justify-center gap-2 rounded-md border border-dashed px-3 py-3 text-sm cursor-pointer transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30",
          isUploading && "opacity-60 pointer-events-none",
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Uploading…
          </>
        ) : (
          <>
            <Upload className="size-4" />
            <span>Pick photo</span>
          </>
        )}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ""
        }}
      />

      {/* Phone-friendly camera capture (separate input so iOS shows two clear actions) */}
      <label
        htmlFor={cameraId}
        className={cn(
          "md:hidden flex items-center justify-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors",
          isUploading && "opacity-60 pointer-events-none",
        )}
      >
        <Camera className="size-4" />
        <span>Take new photo</span>
      </label>
      <input
        id={cameraId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ""
        }}
      />
    </div>
  )
}
