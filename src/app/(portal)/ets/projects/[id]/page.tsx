import { redirect } from "next/navigation"

export default async function ProjectRoot({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/ets/projects/${id}/checklist`)
}
