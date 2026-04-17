"use client"

import { useRef, useState } from "react"
import { Upload, ImageOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Field } from "./field"
import { IMAGE_QUALITY_OPTIONS, type ProductRow } from "./product-row"
import { type AutosaveHandle } from "./use-autosave"

const BUCKET = "product-images"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""

export function MediaTab({
  row,
  patch,
  autosave,
}: {
  row: ProductRow
  patch: (p: Partial<ProductRow>) => void
  autosave: AutosaveHandle
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5 items-start">
        <ImagePreview url={row.image_url} />
        <div className="space-y-3">
          <Field
            label="Image URL"
            state={autosave.statuses.image_url}
            onRetry={() => autosave.save("image_url", row.image_url)}
          >
            <Input
              defaultValue={row.image_url ?? ""}
              onChange={(e) => patch({ image_url: e.target.value })}
              onBlur={(e) => autosave.save("image_url", e.target.value || null)}
            />
          </Field>
          <UploadButton
            productId={row.id}
            onUploaded={(url) => {
              patch({ image_url: url })
              autosave.save("image_url", url)
            }}
          />
        </div>
      </div>

      <Field
        label="Image quality"
        hint="Controls how the image pipeline treats this row. Changes sync to the client portal."
        state={autosave.statuses.image_quality}
        onRetry={() => autosave.save("image_quality", row.image_quality)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {IMAGE_QUALITY_OPTIONS.map((opt) => {
            const active = row.image_quality === opt.value
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => {
                  patch({ image_quality: opt.value })
                  autosave.save("image_quality", opt.value)
                }}
                className={cn(
                  "text-left rounded-lg border px-3 py-2 transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border/80 bg-card hover:bg-muted/40",
                )}
              >
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {opt.help}
                </div>
              </button>
            )
          })}
        </div>
      </Field>
    </div>
  )
}

function ImagePreview({ url }: { url: string | null }) {
  if (!url) {
    return (
      <div className="size-[200px] rounded-lg border bg-muted flex items-center justify-center">
        <ImageOff className="size-8 text-muted-foreground" />
      </div>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block size-[200px] rounded-lg border bg-muted overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="size-full object-cover" />
    </a>
  )
}

export function UploadButton({
  productId,
  onUploaded,
}: {
  productId: string
  onUploaded: (publicUrl: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleFile(file: File) {
    setBusy(true)
    setErr(null)
    try {
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase()
      const path = `products/${productId}.${ext}`
      const form = new FormData()
      form.append("file", file)
      form.append("bucket", BUCKET)
      form.append("path", path)
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Upload failed")
      onUploaded(`${json.url}?v=${Date.now()}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload />
        {busy ? "Uploading…" : "Upload new"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
          e.target.value = ""
        }}
      />
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  )
}
