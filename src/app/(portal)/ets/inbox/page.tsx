"use client"
import { Bell } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsInboxPage() {
  return (
    <EtsModuleStub
      icon={Bell}
      title="Inbox"
      description="Notifications, mentions, and pending actions across the ETS venture."
      legacyHref="/workspace/inbox"
    />
  )
}
