"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { deleteCourse } from "../../_actions/course-actions"

export function DeleteCourseButton({
  courseId,
  courseTitle,
}: {
  courseId: string
  courseTitle: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCourse(courseId)
      if (!result.ok) {
        alert(`Failed to delete: ${result.error}`)
        setShowConfirm(false)
        return
      }
      router.push("/usdrop/courses")
    })
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="size-4" /> Delete
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        Delete &ldquo;{courseTitle}&rdquo;?
      </span>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        Confirm
      </button>
      <button
        onClick={() => setShowConfirm(false)}
        disabled={isPending}
        className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
