"use client"
import { Megaphone } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsEmailsPage() {
  return (
    <EtsModuleStub
      icon={Megaphone}
      title="Comms"
      description="Outbound email + SMS campaigns to ETS partners, vendors, clients."
      legacyHref="/workspace/emails/dashboard"
    />
  )
}
