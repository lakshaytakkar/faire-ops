import { notFound } from "next/navigation"
import { supabaseUsdrop } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { CourseBuilderClient, type BuilderCourse, type BuilderModule } from "./builder-client"

export const dynamic = "force-dynamic"

type Params = { id: string }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params
  const { data } = await supabaseUsdrop
    .from("courses")
    .select("title")
    .eq("id", id)
    .maybeSingle()
  return { title: `Builder — ${data?.title ?? "Course"} — USDrop | Suprans` }
}

async function fetchBuilderData(id: string) {
  const [course, modules] = await Promise.all([
    supabaseUsdrop
      .from("courses")
      .select(
        "id, title, slug, description, published, featured, is_onboarding, level, students_count, thumbnail_url, learning_objectives, prerequisites",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseUsdrop
      .from("course_modules")
      .select(
        "id, title, description, order_index, content_type, video_url, video_duration, content, duration_minutes, is_preview",
      )
      .eq("course_id", id)
      .order("order_index", { ascending: true }),
  ])
  return {
    course: course.data as BuilderCourse | null,
    modules: (modules.data ?? []) as BuilderModule[],
  }
}

export default async function CourseBuilderPage({ params }: { params: Promise<Params> }) {
  const { id } = await params
  const { course, modules } = await fetchBuilderData(id)
  if (!course) notFound()

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Course Builder"
        subtitle={course.title ?? "Untitled course"}
        breadcrumbs={[
          { label: "Courses", href: "/usdrop/courses" },
          { label: course.title ?? "Course", href: `/usdrop/courses/${id}` },
          { label: "Builder" },
        ]}
      />
      <CourseBuilderClient course={course} initialModules={modules} />
    </div>
  )
}
