"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Search,
  Upload,
  Star,
  Trash2,
  Download,
  LayoutGrid,
  List,
  FileText,
  Table2,
  Image,
  Archive,
  Code,
  File,
  ArrowUpDown,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FileRecord {
  id: string
  name: string
  file_type: string | null
  mime_type: string | null
  size_bytes: number
  storage_path: string | null
  public_url: string | null
  category: string
  tags: string[]
  uploaded_by: string
  folder: string
  is_starred: boolean
  created_at: string
}

type FileCategory = "all" | "documents" | "images" | "exports" | "reports" | "templates"
type SortField = "name" | "created_at" | "size_bytes"
type ViewMode = "grid" | "list"

/* ------------------------------------------------------------------ */
/*  File type icon mapping                                             */
/* ------------------------------------------------------------------ */

const FILE_ICONS: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  pdf:  { icon: FileText, color: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  csv:  { icon: Table2,   color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  xlsx: { icon: Table2,   color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  png:  { icon: Image,    color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
  jpg:  { icon: Image,    color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
  zip:  { icon: Archive,  color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  docx: { icon: FileText, color: "#6366F1", bg: "rgba(99,102,241,0.1)" },
  html: { icon: Code,     color: "#EC4899", bg: "rgba(236,72,153,0.1)" },
}

const DEFAULT_ICON = { icon: File, color: "#64748b", bg: "rgba(100,116,139,0.1)" }

function getFileIcon(fileType: string | null) {
  if (!fileType) return DEFAULT_ICON
  return FILE_ICONS[fileType] ?? DEFAULT_ICON
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const val = bytes / Math.pow(1024, i)
  return `${val % 1 === 0 ? val : val.toFixed(1)} ${units[i]}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const CATEGORY_LABELS: Record<FileCategory, string> = {
  all: "All",
  documents: "Documents",
  images: "Images",
  exports: "Exports",
  reports: "Reports",
  templates: "Templates",
}

const CATEGORIES: FileCategory[] = ["all", "documents", "images", "exports", "reports", "templates"]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function FilesPage() {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<FileCategory>("all")
  const [sortField, setSortField] = useState<SortField>("created_at")
  const [sortAsc, setSortAsc] = useState(false)
  const [view, setView] = useState<ViewMode>("grid")

  /* ---- fetch ---- */
  const fetchFiles = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("fetchFiles:", error)
      setFiles([])
    } else {
      setFiles(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  /* ---- filter + sort ---- */
  const filtered = useMemo(() => {
    let result = files

    // category filter
    if (activeCategory !== "all") {
      result = result.filter((f) => f.category === activeCategory)
    }

    // search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.tags.some((t) => t.toLowerCase().includes(q)) ||
          f.uploaded_by.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
      )
    }

    // sort
    return [...result].sort((a, b) => {
      // starred always first
      if (a.is_starred && !b.is_starred) return -1
      if (!a.is_starred && b.is_starred) return 1

      let cmp = 0
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name)
      } else if (sortField === "size_bytes") {
        cmp = a.size_bytes - b.size_bytes
      } else {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      return sortAsc ? cmp : -cmp
    })
  }, [files, activeCategory, search, sortField, sortAsc])

  /* ---- actions ---- */
  async function toggleStar(file: FileRecord) {
    await supabase
      .from("files")
      .update({ is_starred: !file.is_starred })
      .eq("id", file.id)
    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, is_starred: !f.is_starred } : f))
    )
  }

  async function deleteFile(id: string) {
    await supabase.from("files").delete().eq("id", id)
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  function cycleSort() {
    const order: SortField[] = ["created_at", "name", "size_bytes"]
    const idx = order.indexOf(sortField)
    const next = order[(idx + 1) % order.length]
    if (next === sortField) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(next)
      setSortAsc(next === "name")
    }
  }

  const sortLabel =
    sortField === "name" ? "Name" : sortField === "size_bytes" ? "Size" : "Date"

  /* ---- loading skeleton ---- */
  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-[60px] rounded-md bg-muted animate-pulse" />
        <div className="h-[40px] rounded-md bg-muted animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-[160px] rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Files</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage and browse uploaded files
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
            <button
              onClick={() => setView("grid")}
              className={`p-1.5 rounded-md transition-colors ${
                view === "grid"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded-md transition-colors ${
                view === "list"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button>
            <Upload className="h-4 w-4" data-icon="inline-start" />
            Upload
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="pl-8"
          />
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Sort */}
        <button
          onClick={cycleSort}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md border bg-card transition-colors ml-auto"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortLabel}
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="rounded-md border bg-card p-12 text-center">
          <File className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No files found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {files.length === 0
              ? "Upload your first file to get started."
              : "No files match the current filters."}
          </p>
        </div>
      ) : view === "grid" ? (
        /* ---- Grid View ---- */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((file) => {
            const fi = getFileIcon(file.file_type)
            const Icon = fi.icon
            return (
              <div
                key={file.id}
                className="group rounded-md border bg-card p-4 hover:shadow-sm transition-shadow relative flex flex-col"
              >
                {/* Star button */}
                <button
                  onClick={() => toggleStar(file)}
                  className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted transition-colors"
                >
                  <Star
                    className={`h-3.5 w-3.5 ${
                      file.is_starred
                        ? "fill-amber-400 text-amber-400"
                        : "fill-none text-muted-foreground/40 opacity-0 group-hover:opacity-100"
                    } transition-opacity`}
                  />
                </button>

                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center mb-3"
                  style={{ backgroundColor: fi.bg }}
                >
                  <Icon className="h-5 w-5" style={{ color: fi.color }} />
                </div>

                {/* Name */}
                <h3 className="text-sm font-semibold text-foreground truncate pr-6">
                  {file.name}
                </h3>

                {/* Meta */}
                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                  <span>{formatSize(file.size_bytes)}</span>
                  <span className="text-muted-foreground/30">|</span>
                  <span>{formatDate(file.created_at)}</span>
                </div>

                {/* Tags */}
                {file.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {file.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-3">
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full capitalize"
                    style={{ backgroundColor: fi.bg, color: fi.color }}
                  >
                    {file.category}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {file.uploaded_by}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ---- List View ---- */
        <div className="rounded-md border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-8" />
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Size</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Tags</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Uploaded By</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((file) => {
                const fi = getFileIcon(file.file_type)
                const Icon = fi.icon
                return (
                  <tr
                    key={file.id}
                    className="border-b last:border-0 hover:bg-muted/20 transition-colors group"
                  >
                    {/* Icon */}
                    <td className="px-4 py-2.5">
                      <div
                        className="w-7 h-7 rounded flex items-center justify-center"
                        style={{ backgroundColor: fi.bg }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color: fi.color }} />
                      </div>
                    </td>
                    {/* Name */}
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-foreground">{file.name}</span>
                    </td>
                    {/* Type */}
                    <td className="px-4 py-2.5 uppercase text-xs text-muted-foreground">
                      {file.file_type ?? "-"}
                    </td>
                    {/* Size */}
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {formatSize(file.size_bytes)}
                    </td>
                    {/* Category */}
                    <td className="px-4 py-2.5">
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full capitalize"
                        style={{ backgroundColor: fi.bg, color: fi.color }}
                      >
                        {file.category}
                      </span>
                    </td>
                    {/* Tags */}
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {file.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    {/* Uploaded By */}
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {file.uploaded_by}
                    </td>
                    {/* Date */}
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {formatDate(file.created_at)}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleStar(file)}
                          className="p-1 rounded-md hover:bg-muted transition-colors"
                          title={file.is_starred ? "Unstar" : "Star"}
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${
                              file.is_starred
                                ? "fill-amber-400 text-amber-400"
                                : "fill-none text-muted-foreground"
                            }`}
                          />
                        </button>
                        <button
                          className="p-1 rounded-md hover:bg-muted transition-colors"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => deleteFile(file.id)}
                          className="p-1 rounded-md hover:bg-muted transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
        <span>
          {filtered.length} file{filtered.length !== 1 ? "s" : ""}{" "}
          {activeCategory !== "all" && `in ${CATEGORY_LABELS[activeCategory]}`}
        </span>
        <span>
          Total: {formatSize(filtered.reduce((sum, f) => sum + f.size_bytes, 0))}
        </span>
      </div>
    </div>
  )
}
