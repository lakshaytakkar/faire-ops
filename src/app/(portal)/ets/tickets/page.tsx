"use client"
import { LifeBuoy } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsTicketsPage() {
  return (
    <EtsModuleStub
      icon={LifeBuoy}
      title="Tickets"
      description="Partner + vendor support tickets raised against ETS (12 seeded in ets.tickets)."
      legacyHref="/workspace/tickets"
    />
  )
}
