import Link from "next/link"
import { GraduationCap, Layers, Users, Award, Plus } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { CoursesClient, type CourseRow } from "./courses-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Courses — USDrop | Suprans" }

async function fetchCourses() {
  const [courses, modules] = await Promise.all([
    supabaseUsdrop
      .from("courses")
      .select(
        "id, title, slug, instructor_id, published, featured, is_onboarding, lessons_count, students_count, duration_minutes, level, created_at",
      )
      .order("created_at", { ascending: false }),
    supabaseUsdrop.from("course_modules").select("id, course_id"),
  ])
  if (courses.error) console.error("usdrop.courses:", courses.error.message)
  const moduleCounts: Record<string, number> = {}
  for (const m of modules.data ?? []) {
    const key = m.course_id as string
    moduleCounts[key] = (moduleCounts[key] ?? 0) + 1
  }
  return {
    rows: (courses.data ?? []) as CourseRow[],
    moduleCounts,
    totalModules: modules.data?.length ?? 0,
  }
}

export default async function CoursesPage() {
  const { rows, moduleCounts, totalModules } = await fetchCourses()

  const total = rows.length
  const enrolled = rows.reduce((sum, r) => sum + (r.students_count ?? 0), 0)
  const published = rows.filter((r) => r.published).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Courses"
        subtitle={`${total.toLocaleString("en-IN")} courses in the learning library`}
        actions={
          <Link
            href="/usdrop/courses/create"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" /> Create Course
          </Link>
        }
      />

      <KPIGrid>
        <MetricCard label="Total courses" value={total.toLocaleString("en-IN")} icon={GraduationCap} iconTone="slate" />
        <MetricCard label="Modules" value={totalModules.toLocaleString("en-IN")} icon={Layers} iconTone="blue" />
        <MetricCard label="Enrolled students" value={enrolled.toLocaleString("en-IN")} icon={Users} iconTone="emerald" />
        <MetricCard label="Published" value={published.toLocaleString("en-IN")} icon={Award} iconTone="violet" hint={`${total - published} draft`} />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No courses yet"
          description="Courses the client app renders in the learn tab live here — publish one to show it to users."
        />
      ) : (
        <CoursesClient rows={rows} moduleCounts={moduleCounts} />
      )}
    </div>
  )
}
