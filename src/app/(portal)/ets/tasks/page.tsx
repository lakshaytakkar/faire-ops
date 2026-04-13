"use client"
import { ClipboardList } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsTasksPage() {
  return (
    <EtsModuleStub
      icon={ClipboardList}
      title="Tasks"
      description="Internal dev + ops tasks for the ETS venture (73 seeded in ets.dev_tasks)."
      legacyHref="/operations/tasks"
    />
  )
}
