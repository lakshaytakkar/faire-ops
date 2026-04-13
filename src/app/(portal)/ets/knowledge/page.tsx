"use client"
import { BookOpen } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsKnowledgePage() {
  return (
    <EtsModuleStub
      icon={BookOpen}
      title="Help"
      description="Knowledge base + FAQs for ETS — partner onboarding playbook, troubleshooting."
      legacyHref="/workspace/knowledge"
    />
  )
}
