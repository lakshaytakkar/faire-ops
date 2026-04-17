import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, GraduationCap, Pencil } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDate } from "@/lib/format"
import { DeleteCourseButton } from "./delete-course-button"

export const dynamic = "force-dynamic"

type Params = { id: string }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params
  return { title: `Course ${id.slice(0, 8)} — USDrop | Suprans` }
}

async function fetchCourse(id: string) {
  const [course, modules, enrollments] = await Promise.all([
    supabaseUsdrop
      .from("courses")
      .select(
        "id, title, slug, description, instructor_id, published, featured, is_onboarding, level, category, lessons_count, students_count, rating, duration_minutes, price, tags, learning_objectives, prerequisites, created_at, published_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseUsdrop
      .from("course_modules")
      .select(
        "id, title, description, order_index, duration_minutes, is_preview, content_type, video_url",
      )
      .eq("course_id", id)
      .order("order_index", { ascending: true }),
    supabaseUsdrop
      .from("course_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("course_id", id),
  ])
  return {
    course: course.data,
    modules: modules.data ?? [],
    enrollmentCount: enrollments.count ?? 0,
  }
}

export default async function CourseDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params
  const { course, modules, enrollmentCount } = await fetchCourse(id)
  if (!course) notFound()

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <Link
        href="/usdrop/courses"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All courses
      </Link>

      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-start gap-4 border-b">
          <div className="size-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <GraduationCap className="size-6 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading text-2xl font-bold truncate">
                {course.title ?? "Untitled course"}
              </h1>
              <StatusBadge tone={toneForStatus(course.published ? "live" : "inactive")}>
                {course.published ? "Live" : "Draft"}
              </StatusBadge>
              {course.is_onboarding && <StatusBadge tone="blue">Onboarding</StatusBadge>}
              {course.featured && <StatusBadge tone="violet">Featured</StatusBadge>}
            </div>
            {course.slug && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate font-mono">
                {course.slug}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/usdrop/courses/${id}/builder`}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Pencil className="size-4" /> Edit Course
            </Link>
            <DeleteCourseButton courseId={id} courseTitle={course.title ?? "this course"} />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x border-b text-sm">
          <KpiTile label="Modules" value={modules.length.toString()} />
          <KpiTile label="Lessons" value={(course.lessons_count ?? 0).toString()} />
          <KpiTile label="Enrollments" value={enrollmentCount.toLocaleString()} />
          <KpiTile label="Students" value={(course.students_count ?? 0).toLocaleString()} />
          <KpiTile
            label="Duration"
            value={course.duration_minutes ? `${course.duration_minutes}m` : "—"}
          />
          <KpiTile label="Published" value={formatDate(course.published_at)} />
        </div>
      </div>

      {course.description && (
        <DetailCard title="About">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{course.description}</p>
        </DetailCard>
      )}

      <DetailCard
        title="Modules"
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              {modules.length} total
            </span>
            <Link
              href={`/usdrop/courses/${id}/builder`}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Open Builder
            </Link>
          </div>
        }
      >
        {modules.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No modules"
            description="Open the course builder to add modules."
          />
        ) : (
          <ol className="space-y-2">
            {modules.map((m, idx) => (
              <li
                key={m.id}
                className="flex items-start gap-3 rounded-md border border-border/80 bg-background px-3 py-2"
              >
                <div className="size-7 rounded bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0 tabular-nums">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{m.title ?? "Untitled module"}</div>
                  {m.description && (
                    <div className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                      {m.description}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.is_preview && <StatusBadge tone="blue">Preview</StatusBadge>}
                  {m.content_type && (
                    <StatusBadge tone="slate">{m.content_type}</StatusBadge>
                  )}
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {m.duration_minutes ? `${m.duration_minutes}m` : "—"}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </DetailCard>
    </div>
  )
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold truncate">{value || "—"}</div>
    </div>
  )
}
