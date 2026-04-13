"use client"
import { MessageCircle } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsChatPage() {
  return (
    <EtsModuleStub
      icon={MessageCircle}
      title="Chat"
      description="Channels + DMs scoped to the EazyToSell team."
      legacyHref="/workspace/chat"
    />
  )
}
