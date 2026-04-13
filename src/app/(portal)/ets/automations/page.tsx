"use client"
import { Zap } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsAutomationsPage() {
  return (
    <EtsModuleStub
      icon={Zap}
      title="Automations"
      description="Scheduled jobs + webhook triggers for the ETS venture."
      legacyHref="/automations/overview"
    />
  )
}
