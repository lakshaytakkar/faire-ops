"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Map, FileUp, Trash2, ExternalLink } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import { EtsEmptyState, formatDate } from "@/app/(portal)/ets/_components/ets-ui"
import { ChannelEmbed } from "@/components/chat/channel-embed"

interface ProjectFile {
  id: string
  filename: string
  storage_path: string
  mime_type: string | null
  version: number
  uploaded_at: string
}

const LAYOUT_SLOTS = [
  "Floor plan v1 (empty)",
  "Floor plan v2 (with shelves)",
  "Zone overlay",
  "3D rendering — entrance",
  "3D rendering — interior",
  "Reference photo — exterior",
  "Reference photo — interior",
  "Reference photo — checkout",
  "Reference photo — display",
]

export default function ProjectLayoutGuidePage() {
  const params = useParams<{ id: string }>()
  const clientId = params?.id as string
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: f } = await supabaseEts
      .from("project_files")
      .select("id, filename, storage_path, mime_type, version, uploaded_at")
      .eq("client_id", clientId)
      .eq("category", "layout")
      .order("uploaded_at", { ascending: false })
    setFiles((f ?? []) as ProjectFile[])
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    if (clientId) load()
  }, [clientId, load])

  async function attachUrl() {
    const url = prompt("Paste asset URL (any public-accessible link):")?.trim()
    if (!url) return
    const filename = url.split("/").pop() ?? "asset"
    const slot = prompt(`Asset name [${LAYOUT_SLOTS[0]}]:`, LAYOUT_SLOTS[0])?.trim() || filename
    const { data } = await supabaseEts
      .from("project_files")
      .insert({
        client_id: clientId,
        category: "layout",
        filename: slot,
        storage_path: url,
        notes: filename,
      })
      .select("id, filename, storage_path, mime_type, version, uploaded_at")
      .single()
    if (data) setFiles((fs) => [data as ProjectFile, ...fs])
  }

  async function removeFile(id: string) {
    if (!confirm("Remove this asset?")) return
    setFiles((fs) => fs.filter((f) => f.id !== id))
    await supabaseEts.from("project_files").delete().eq("id", id)
  }

  if (loading) return <div className="h-64 rounded-lg bg-muted animate-pulse" />

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Floor plans & store visuals</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {files.length} of {LAYOUT_SLOTS.length} slots filled
              </p>
            </div>
            <button
              onClick={attachUrl}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <FileUp className="size-3.5" /> Attach asset
            </button>
          </div>
          {files.length === 0 ? (
            <div className="p-8">
              <EtsEmptyState
                icon={Map}
                title="No floor plans yet"
                description="Attach floor plans, 3D renderings, zone overlays, and reference photos. They appear on the client's layout guide."
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
              {files.map((f) => (
                <div key={f.id} className="rounded-md border bg-background overflow-hidden">
                  <a href={f.storage_path} target="_blank" rel="noreferrer" className="block aspect-video bg-muted">
                    {f.mime_type?.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.storage_path) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.storage_path} alt={f.filename} className="size-full object-cover" />
                    ) : (
                      <div className="size-full flex items-center justify-center text-muted-foreground">
                        <FileUp className="size-8" />
                      </div>
                    )}
                  </a>
                  <div className="p-2 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{f.filename}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(f.uploaded_at)} · v{f.version}</div>
                    </div>
                    <a href={f.storage_path} target="_blank" rel="noreferrer" className="size-6 rounded hover:bg-muted text-muted-foreground flex items-center justify-center">
                      <ExternalLink className="size-3" />
                    </a>
                    <button onClick={() => removeFile(f.id)} className="size-6 rounded hover:bg-muted text-muted-foreground flex items-center justify-center">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card shadow-sm p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Slot reference</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {LAYOUT_SLOTS.map((slot) => (
              <div key={slot} className="px-2 py-1.5 rounded border bg-background">{slot}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: "600px" }}>
        <ChannelEmbed
          projectId={clientId}
          channelKind="project-layout"
          height="100%"
          showHeader
          emptyHint="No messages yet — discuss layout changes with the client."
        />
      </div>
    </div>
  )
}
