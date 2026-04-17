"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Video,
  FileText,
  HelpCircle,
  ClipboardList,
  FolderOpen,
} from "lucide-react"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import {
  updateCourse,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
} from "../../../_actions/course-actions"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface BuilderCourse {
  id: string
  title: string | null
  slug: string | null
  description: string | null
  published: boolean | null
  featured: boolean | null
  is_onboarding: boolean | null
  level: string | null
  students_count: number | null
  thumbnail_url: string | null
  learning_objectives: string[] | null
  prerequisites: string[] | null
}

export interface BuilderModule {
  id: string
  title: string | null
  description: string | null
  order_index: number | null
  content_type: string | null
  video_url: string | null
  video_duration: number | null
  content: unknown
  duration_minutes: number | null
  is_preview: boolean | null
}

const CONTENT_TYPES = [
  { value: "video", label: "Video", icon: Video },
  { value: "text", label: "Text", icon: FileText },
  { value: "quiz", label: "Quiz", icon: HelpCircle },
  { value: "assignment", label: "Assignment", icon: ClipboardList },
  { value: "resource", label: "Resource", icon: FolderOpen },
] as const

/* ------------------------------------------------------------------ */
/*  Main builder                                                       */
/* ------------------------------------------------------------------ */

export function CourseBuilderClient({
  course,
  initialModules,
}: {
  course: BuilderCourse
  initialModules: BuilderModule[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modules, setModules] = useState<BuilderModule[]>(initialModules)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialModules[0]?.id ?? null,
  )
  const [coursePublished, setCoursePublished] = useState(course.published ?? false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const selectedModule = modules.find((m) => m.id === selectedId) ?? null

  /* ---- toggle published ---- */
  function togglePublished() {
    const next = !coursePublished
    setCoursePublished(next)
    startTransition(async () => {
      const result = await updateCourse(course.id, { published: next })
      if (!result.ok) {
        setError(result.error)
        setCoursePublished(!next)
      }
    })
  }

  /* ---- add module ---- */
  function handleAddModule() {
    startTransition(async () => {
      setError(null)
      const nextOrder = modules.length
      const result = await createModule(course.id, {
        title: `Module ${nextOrder + 1}`,
        order_index: nextOrder,
        content_type: "video",
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      const newModule: BuilderModule = {
        id: result.id!,
        title: `Module ${nextOrder + 1}`,
        description: null,
        order_index: nextOrder,
        content_type: "video",
        video_url: null,
        video_duration: null,
        content: null,
        duration_minutes: null,
        is_preview: null,
      }
      setModules((prev) => [...prev, newModule])
      setSelectedId(newModule.id)
      setSuccess("Module added")
      setTimeout(() => setSuccess(null), 2000)
    })
  }

  /* ---- delete module ---- */
  function handleDeleteModule(moduleId: string) {
    if (!confirm("Delete this module? This cannot be undone.")) return
    startTransition(async () => {
      setError(null)
      const result = await deleteModule(moduleId, course.id)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setModules((prev) => prev.filter((m) => m.id !== moduleId))
      if (selectedId === moduleId) setSelectedId(null)
      setSuccess("Module deleted")
      setTimeout(() => setSuccess(null), 2000)
    })
  }

  /* ---- save module ---- */
  function handleSaveModule(mod: BuilderModule) {
    startTransition(async () => {
      setError(null)
      const patch: Record<string, unknown> = {
        title: mod.title,
        description: mod.description,
        content_type: mod.content_type,
        video_url: mod.video_url,
        video_duration: mod.video_duration,
        content: mod.content,
        duration_minutes: mod.duration_minutes,
        is_preview: mod.is_preview,
      }
      const result = await updateModule(mod.id, course.id, patch)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccess("Module saved")
      setTimeout(() => setSuccess(null), 2000)
    })
  }

  /* ---- drag reorder ---- */
  function handleDragStart(idx: number) {
    setDragIdx(idx)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    setModules((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(idx, 0, moved)
      return next
    })
    setDragIdx(idx)
  }

  function handleDragEnd() {
    if (dragIdx === null) return
    setDragIdx(null)
    const ids = modules.map((m) => m.id)
    startTransition(async () => {
      const result = await reorderModules(course.id, ids)
      if (!result.ok) setError(result.error)
    })
  }

  /* ---- local module state update ---- */
  const updateLocalModule = useCallback(
    (id: string, patch: Partial<BuilderModule>) => {
      setModules((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      )
    },
    [],
  )

  return (
    <div className="space-y-4">
      {/* Course header bar */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-[0.9375rem] font-semibold tracking-tight truncate">
            {course.title ?? "Untitled course"}
          </h2>
          <StatusBadge tone={toneForStatus(coursePublished ? "live" : "inactive")}>
            {coursePublished ? "Live" : "Draft"}
          </StatusBadge>
          <span className="text-sm text-muted-foreground tabular-nums">
            {(course.students_count ?? 0).toLocaleString("en-IN")} students
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={togglePublished}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            {coursePublished ? (
              <>
                <EyeOff className="size-4" /> Unpublish
              </>
            ) : (
              <>
                <Eye className="size-4" /> Publish
              </>
            )}
          </button>
          <button
            onClick={() => router.push(`/usdrop/courses/${course.id}`)}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            View Detail
          </button>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
          {success}
        </div>
      )}

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Left: Module list */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Modules ({modules.length})
            </h3>
            <button
              onClick={handleAddModule}
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Plus className="size-3.5" /> Add
            </button>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {modules.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No modules yet. Click "Add" to create one.
              </div>
            ) : (
              <ul>
                {modules.map((mod, idx) => {
                  const Icon =
                    CONTENT_TYPES.find((ct) => ct.value === mod.content_type)
                      ?.icon ?? FileText
                  return (
                    <li
                      key={mod.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedId(mod.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 border-b last:border-b-0 cursor-pointer transition-colors ${
                        selectedId === mod.id
                          ? "bg-primary/5 border-l-2 border-l-primary"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <GripVertical className="size-4 text-muted-foreground shrink-0 cursor-grab" />
                      <Icon className="size-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {mod.title || "Untitled"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {mod.content_type ?? "video"}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteModule(mod.id)
                        }}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right: Module editor */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          {selectedModule ? (
            <ModuleEditor
              key={selectedModule.id}
              module={selectedModule}
              isPending={isPending}
              onUpdate={(patch) => updateLocalModule(selectedModule.id, patch)}
              onSave={() => {
                const current = modules.find((m) => m.id === selectedId)
                if (current) handleSaveModule(current)
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-[400px] text-sm text-muted-foreground">
              {modules.length === 0
                ? "Add a module to get started"
                : "Select a module to edit"}
            </div>
          )}
        </div>
      </div>

      {isPending && (
        <div className="fixed bottom-4 right-4 rounded-full bg-card border border-border shadow-lg p-3">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Module editor panel                                                */
/* ------------------------------------------------------------------ */

function ModuleEditor({
  module: mod,
  isPending,
  onUpdate,
  onSave,
}: {
  module: BuilderModule
  isPending: boolean
  onUpdate: (patch: Partial<BuilderModule>) => void
  onSave: () => void
}) {
  const inputCls =
    "w-full rounded-md border border-border/80 bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
  const labelCls = "block text-sm font-medium text-foreground mb-1.5"

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[0.9375rem] font-semibold tracking-tight">
          Edit Module
        </h3>
        <button
          onClick={onSave}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Save className="size-4" /> Save Module
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className={labelCls}>Title</label>
          <input
            className={inputCls}
            value={mod.title ?? ""}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Module title"
          />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea
            className={`${inputCls} min-h-[80px] resize-y`}
            value={mod.description ?? ""}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Brief description of this module..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Content Type</label>
            <select
              className={inputCls}
              value={mod.content_type ?? "video"}
              onChange={(e) => onUpdate({ content_type: e.target.value })}
            >
              {CONTENT_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>
                  {ct.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Duration (minutes)</label>
            <input
              type="number"
              className={inputCls}
              value={mod.duration_minutes ?? ""}
              onChange={(e) =>
                onUpdate({
                  duration_minutes: e.target.value
                    ? parseInt(e.target.value)
                    : null,
                })
              }
              placeholder="0"
              min={0}
            />
          </div>
        </div>

        {(mod.content_type === "video" || !mod.content_type) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Video URL</label>
              <input
                className={inputCls}
                value={mod.video_url ?? ""}
                onChange={(e) => onUpdate({ video_url: e.target.value || null })}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className={labelCls}>Video Duration (seconds)</label>
              <input
                type="number"
                className={inputCls}
                value={mod.video_duration ?? ""}
                onChange={(e) =>
                  onUpdate({
                    video_duration: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
                placeholder="0"
                min={0}
              />
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Content (JSON or rich text)</label>
          <textarea
            className={`${inputCls} min-h-[120px] resize-y font-mono text-sm`}
            value={
              mod.content
                ? typeof mod.content === "string"
                  ? mod.content
                  : JSON.stringify(mod.content, null, 2)
                : ""
            }
            onChange={(e) => {
              const raw = e.target.value
              try {
                onUpdate({ content: JSON.parse(raw) })
              } catch {
                onUpdate({ content: raw })
              }
            }}
            placeholder='Text content or JSON (e.g. {"blocks":[...]})'
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={mod.is_preview ?? false}
            onChange={(e) => onUpdate({ is_preview: e.target.checked })}
            className="rounded border-border"
          />
          Preview module (free for non-enrolled users)
        </label>
      </div>
    </div>
  )
}
