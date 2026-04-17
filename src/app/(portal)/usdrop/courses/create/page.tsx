import { PageHeader } from "@/components/shared/page-header"
import { CreateCourseForm } from "./create-course-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "Create Course — USDrop | Suprans" }

export default function CreateCoursePage() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Create Course"
        subtitle="Add a new course to the learning library"
        breadcrumbs={[
          { label: "Courses", href: "/usdrop/courses" },
          { label: "Create" },
        ]}
      />
      <CreateCourseForm />
    </div>
  )
}
