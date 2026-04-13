"use client"
import { Mail } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsGmailPage() {
  return (
    <EtsModuleStub
      icon={Mail}
      title="Gmail"
      description="ETS-connected mailboxes — partner inquiries, vendor POs, client proposals."
      legacyHref="/workspace/gmail"
    />
  )
}
