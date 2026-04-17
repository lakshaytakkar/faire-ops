"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, X } from "lucide-react"
import { createCourse } from "../../_actions/course-actions"

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function CreateCourseForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [slugManual, setSlugManual] = useState(false)
  const [description, setDescription] = useState("")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [level, setLevel] = useState<string>("beginner")
  const [published, setPublished] = useState(false)
  const [featured, setFeatured] = useState(false)
  const [isOnboarding, setIsOnboarding] = useState(false)
  const [objectives, setObjectives] = useState<string[]>([])
  const [newObjective, setNewObjective] = useState("")
  const [prerequisites, setPrerequisites] = useState<string[]>([])
  const [newPrerequisite, setNewPrerequisite] = useState("")

  function handleTitleChange(val: string) {
    setTitle(val)
    if (!slugManual) setSlug(slugify(val))
  }

  function addObjective() {
    const trimmed = newObjective.trim()
    if (!trimmed) return
    setObjectives((prev) => [...prev, trimmed])
    setNewObjective("")
  }

  function removeObjective(idx: number) {
    setObjectives((prev) => prev.filter((_, i) => i !== idx))
  }

  function addPrerequisite() {
    const trimmed = newPrerequisite.trim()
    if (!trimmed) return
    setPrerequisites((prev) => [...prev, trimmed])
    setNewPrerequisite("")
  }

  function removePrerequisite(idx: number) {
    setPrerequisites((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    setError(null)

    startTransition(async () => {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        slug: slug || slugify(title),
        description: description.trim() || null,
        thumbnail_url: thumbnailUrl.trim() || null,
        level,
        published,
        featured,
        is_onboarding: isOnboarding,
        learning_objectives: objectives.length > 0 ? objectives : null,
        prerequisites: prerequisites.length > 0 ? prerequisites : null,
      }
      const result = await createCourse(payload)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push(`/usdrop/courses/${result.id}/builder`)
    })
  }

  const inputCls =
    "w-full rounded-md border border-border/80 bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
  const labelCls = "block text-sm font-medium text-foreground mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 space-y-5">
        <h2 className="text-[0.9375rem] font-semibold tracking-tight">Course Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Title *</label>
            <input
              className={inputCls}
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Dropshipping Fundamentals"
            />
          </div>
          <div>
            <label className={labelCls}>Slug</label>
            <input
              className={inputCls}
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value)
                setSlugManual(true)
              }}
              placeholder="auto-generated-from-title"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Auto-generated from title. Edit to override.
            </p>
          </div>
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea
            className={`${inputCls} min-h-[100px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will students learn in this course?"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Thumbnail URL</label>
            <input
              className={inputCls}
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className={labelCls}>Level</label>
            <select
              className={inputCls}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 space-y-5">
        <h2 className="text-[0.9375rem] font-semibold tracking-tight">Flags</h2>
        <div className="flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="rounded border-border"
            />
            Published
          </label>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="rounded border-border"
            />
            Featured
          </label>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isOnboarding}
              onChange={(e) => setIsOnboarding(e.target.checked)}
              className="rounded border-border"
            />
            Onboarding course
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 space-y-4">
        <h2 className="text-[0.9375rem] font-semibold tracking-tight">
          Learning Objectives
        </h2>
        <div className="flex gap-2">
          <input
            className={`${inputCls} flex-1`}
            value={newObjective}
            onChange={(e) => setNewObjective(e.target.value)}
            placeholder="Add an objective..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addObjective()
              }
            }}
          />
          <button
            type="button"
            onClick={addObjective}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" /> Add
          </button>
        </div>
        {objectives.length > 0 && (
          <ul className="space-y-1.5">
            {objectives.map((obj, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm"
              >
                <span className="flex-1">{obj}</span>
                <button
                  type="button"
                  onClick={() => removeObjective(i)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 space-y-4">
        <h2 className="text-[0.9375rem] font-semibold tracking-tight">Prerequisites</h2>
        <div className="flex gap-2">
          <input
            className={`${inputCls} flex-1`}
            value={newPrerequisite}
            onChange={(e) => setNewPrerequisite(e.target.value)}
            placeholder="Add a prerequisite..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addPrerequisite()
              }
            }}
          />
          <button
            type="button"
            onClick={addPrerequisite}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" /> Add
          </button>
        </div>
        {prerequisites.length > 0 && (
          <ul className="space-y-1.5">
            {prerequisites.map((pre, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm"
              >
                <span className="flex-1">{pre}</span>
                <button
                  type="button"
                  onClick={() => removePrerequisite(i)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/usdrop/courses")}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Create Course
        </button>
      </div>
    </form>
  )
}
