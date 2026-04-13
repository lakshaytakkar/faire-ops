"use client"
import { Sparkles } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsAiToolsPage() {
  return (
    <EtsModuleStub
      icon={Sparkles}
      title="AI Tools"
      description="ETS prompt library (5 seeded in ets.prompt_library) + AI-assisted workflows."
      legacyHref="/workspace/ai-tools"
    />
  )
}
