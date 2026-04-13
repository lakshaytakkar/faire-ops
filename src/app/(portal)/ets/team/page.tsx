"use client"
import { Users } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsTeamPage() {
  return (
    <EtsModuleStub
      icon={Users}
      title="Team"
      description="EazyToSell internal team directory — admin, sales, ops, fulfillment, product_team."
      legacyHref="/workspace/team"
    />
  )
}
