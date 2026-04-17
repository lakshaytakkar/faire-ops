"use client"

import { useRef, useState } from "react"
import { ImageOff, RotateCcw, Sparkles, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { polishImage } from "@/lib/bhagwati/studio-api"
import type { ImagePolishStatus } from "@/lib/bhagwati/types"

import type { useProductPatch } from "./use-product-patch"

type Handle = ReturnType<typeof useProductPatch>

const BUCKET = "product-images"

export function TabsImage({ handle }: { handle: Handle }) {
  const { product, save, flipChecklist, error: saveError } = handle
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [skipped, setSkipped] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function runPolish(force = false) {
    setBusy(true)
    setReason(null)
    setSkipped(false)
    setError(null)
    try {
      const res = await polishImage({ productId: product.id, force })
      if (res.status === "done" && res.image_url) {
        await save({
          image_url: res.image_url,
          image_polish_status: "done",
        })
        await flipChecklist("image_polished", true)
      } else if (res.status === "skipped") {
        setSkipped(true)
        setReason(res.reason ?? "Source image is already publish-ready.")
        await save({ image_polish_status: "skipped" })
      } else {
        setError(res.reason ?? "Polish failed")
        await save({ image_polish_status: "failed" })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function onUpload(file: File) {
    setBusy(true)
    setError(null)
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
      const path = `products/${product.id}.${ext}`
      const form = new FormData()
      form.append("file", file)
      form.append("bucket", BUCKET)
      form.append("path", path)
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Upload failed")
      await save({
        image_url: json.url,
        image_polish_status: "done" as ImagePolishStatus,
      })
      await flipChecklist("image_polished", true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-[0.9375rem] font-semibold tracking-tight">Image</h2>
          <p className="text-xs text-muted-foreground">
            Polish the supplier image with Gemini, or upload a manual replacement.
          </p>
        </div>
        <StatusBadge tone={toneForStatus(product.image_polish_status ?? "pending")}>
          {product.image_polish_status ?? "pending"}
        </StatusBadge>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ImageCard label="Raw" url={product.image_raw_url} />
        <ImageCard label="Polished" url={product.image_url} highlight />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button type="button" onClick={() => runPolish(false)} disabled={busy}>
          <Sparkles /> {busy ? "Polishing…" : "Polish image"}
        </Button>
        {(skipped || product.image_polish_status === "skipped" || product.image_polish_status === "done") && (
          <Button
            type="button"
            variant="outline"
            onClick={() => runPolish(true)}
            disabled={busy}
          >
            <RotateCcw /> Force regenerate
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onUpload(f)
            e.target.value = ""
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          <Upload /> Upload manual
        </Button>
      </div>

      {reason && (
        <div className="text-xs text-amber-800 bg-amber-50 ring-1 ring-amber-200 rounded-md px-3 py-2">
          Skipped — {reason}
        </div>
      )}
      {(error || saveError) && (
        <div className="text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-md px-3 py-2">
          {error ?? saveError}
        </div>
      )}
    </div>
  )
}

function ImageCard({
  label,
  url,
  highlight,
}: {
  label: string
  url: string | null
  highlight?: boolean
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-lg border-2 border-emerald-300 bg-emerald-50/30 overflow-hidden"
          : "rounded-lg border border-border/80 bg-card overflow-hidden"
      }
    >
      <div className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
        <span>{label}</span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Open
          </a>
        )}
      </div>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={label}
          className="w-full aspect-square object-cover bg-muted"
        />
      ) : (
        <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground">
          <ImageOff className="size-8" />
        </div>
      )}
    </div>
  )
}
