"use client"

import { useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { DetailCard } from "@/components/shared/detail-views"
import { Button } from "@/components/ui/button"

type Result = {
  videoUrl: string
  requestId: string
  model: string
  contentType: string
  fileSize: number | null
  seed: number | null
}

export default function VideoTestPage() {
  const [prompt, setPrompt] = useState(
    "B-roll of a minimalist Suprans office at sunset, slow camera push through an open workspace, warm tones, cinematic, 10 seconds",
  )
  const [duration, setDuration] = useState<5 | 10>(5)
  const [aspect, setAspect] = useState<"16:9" | "9:16" | "1:1">("16:9")
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onGenerate() {
    setLoading(true)
    setError(null)
    setResult(null)
    setElapsed(0)
    const start = Date.now()
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 500)

    try {
      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, duration, aspectRatio: aspect }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      setResult((await res.json()) as Result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      clearInterval(tick)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Video test — Kling via FAL"
        description="Smoke-test the AI video pipeline. Each call costs real money; prefer 5s clips for experimentation."
      />

      <DetailCard title="Prompt">
        <div className="space-y-3 text-sm">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full min-h-[120px] rounded border px-3 py-2 font-sans text-sm"
            placeholder="Describe the video you want…"
          />
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2">
              Duration
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) as 5 | 10)}
                className="rounded border px-2 py-1"
              >
                <option value={5}>5 s</option>
                <option value={10}>10 s</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              Aspect
              <select
                value={aspect}
                onChange={(e) => setAspect(e.target.value as "16:9" | "9:16" | "1:1")}
                className="rounded border px-2 py-1"
              >
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
              </select>
            </label>
            <Button onClick={onGenerate} disabled={loading || prompt.trim().length < 3}>
              {loading ? `Generating… ${elapsed}s` : "Generate"}
            </Button>
          </div>
        </div>
      </DetailCard>

      {error && (
        <DetailCard title="Error">
          <pre className="text-sm text-red-600 whitespace-pre-wrap">{error}</pre>
        </DetailCard>
      )}

      {result && (
        <DetailCard title="Result">
          <div className="space-y-4 text-sm">
            <video
              src={result.videoUrl}
              controls
              playsInline
              className="w-full max-w-3xl rounded"
            />
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[0.8125rem]">
              <dt className="font-semibold">URL</dt>
              <dd className="break-all">
                <a
                  href={result.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {result.videoUrl}
                </a>
              </dd>
              <dt className="font-semibold">Model</dt>
              <dd>{result.model}</dd>
              <dt className="font-semibold">Request ID</dt>
              <dd className="font-mono">{result.requestId}</dd>
              <dt className="font-semibold">Content type</dt>
              <dd>{result.contentType}</dd>
              <dt className="font-semibold">File size</dt>
              <dd>{result.fileSize != null ? `${(result.fileSize / 1024).toFixed(1)} KB` : "—"}</dd>
              <dt className="font-semibold">Seed</dt>
              <dd>{result.seed ?? "—"}</dd>
            </dl>
          </div>
        </DetailCard>
      )}
    </div>
  )
}
