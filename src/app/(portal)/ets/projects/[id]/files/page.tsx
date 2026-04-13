"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams } from "next/navigation"
import { FileUp, Trash2, ExternalLink, FolderOpen } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import { EtsEmptyState, formatDate } from "@/app/(portal)/ets/_components/ets-ui"

interface ProjectFile {
  id: string
  category: string
  filename: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  version: number
  uploaded_by: string | null
  notes: string | null
  uploaded_at: string
}

const CATEGORY_ORDER = ["brand", "layout", "legal", "onboarding", "deliverable", "chat-attachment", "other"]

export default function ProjectFilesPage() {
  const params = useParams<{ id: string }>()
  const clientId = params?.id as string
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabaseEts
      .from("project_files")
      .select("*")
      .eq("client_id", clientId)
      .order("uploaded_at", { ascending: false })
    setFiles((data ?? []) as ProjectFile[])
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    if (clientId) load()
  }, [clientId, load])

  const grouped = useMemo(() => {
    const map = new Map<string, ProjectFile[]>()
    files.forEach((f) => {
      const list = map.get(f.category) ?? []
      list.push(f)
      map.set(f.category, list)
    })
    return map
  }, [files])

  async function attachUrl() {
    const url = prompt("Paste file URL (any public-accessible link):")?.trim()
    if (!url) return
    const filename = url.split("/").pop() ?? "file"
    const category = prompt("Category (brand/layout/legal/onboarding/deliverable):", "deliverable")?.trim() || "deliverable"
    const { data } = await supabaseEts
      .from("project_files")
      .insert({
        client_id: clientId,
        category,
        filename,
        storage_path: url,
      })
      .select()
      .single()
    if (data) setFiles((fs) => [data as ProjectFile, ...fs])
  }

  async function removeFile(id: string) {
    if (!confirm("Remove this file?")) return
    setFiles((fs) => fs.filter((f) => f.id !== id))
    await supabaseEts.from("project_files").delete().eq("id", id)
  }

  if (loading) return <div className="h-64 rounded-lg bg-muted animate-pulse" />

  if (files.length === 0) {
    return (
      <EtsEmptyState
        icon={FolderOpen}
        title="No files yet"
        description="All files exchanged with the client appear here, grouped by category."
        cta={
          <button
            onClick={attachUrl}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <FileUp className="size-4" /> Attach file
          </button>
        }
      />
    )
  }

  const categories = CATEGORY_ORDER.filter((c) => grouped.has(c))
  Array.from(grouped.keys()).forEach((c) => {
    if (!CATEGORY_ORDER.includes(c)) categories.push(c)
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{files.length} files across {categories.length} categories</p>
        <button
          onClick={attachUrl}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <FileUp className="size-4" /> Attach file
        </button>
      </div>
      {categories.map((cat) => {
        const items = grouped.get(cat) ?? []
        return (
          <div key={cat} className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-semibold capitalize">{cat.replace(/-/g, " ")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{items.length} file{items.length === 1 ? "" : "s"}</p>
            </div>
            <ul className="divide-y">
              {items.map((f) => (
                <li key={f.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="size-9 rounded bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                    <FileUp className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{f.filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(f.uploaded_at)} · v{f.version}
                      {f.uploaded_by && ` · by ${f.uploaded_by}`}
                    </div>
                  </div>
                  <a
                    href={f.storage_path}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded text-xs font-medium border hover:bg-muted"
                  >
                    <ExternalLink className="size-3" /> Open
                  </a>
                  <button
                    onClick={() => removeFile(f.id)}
                    className="size-8 rounded hover:bg-muted text-muted-foreground flex items-center justify-center"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
