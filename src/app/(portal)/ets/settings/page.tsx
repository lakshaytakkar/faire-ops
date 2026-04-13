"use client"
import { Settings } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsSettingsPage() {
  return (
    <EtsModuleStub
      icon={Settings}
      title="Settings"
      description="ETS venture configuration — roles, integrations, webhooks, branding."
      legacyHref="/workspace/settings"
    />
  )
}
