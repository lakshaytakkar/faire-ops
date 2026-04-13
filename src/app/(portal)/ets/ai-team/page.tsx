"use client"
import { Users } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsAiTeamPage() {
  return (
    <EtsModuleStub
      icon={Users}
      title="Remote"
      description="AI agents assigned to ETS — pricing, catalog QC, partner onboarding assistants."
      legacyHref="/workspace/ai-team"
    />
  )
}
