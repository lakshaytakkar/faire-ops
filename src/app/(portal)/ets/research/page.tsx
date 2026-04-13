"use client"
import { Telescope } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsResearchPage() {
  return (
    <EtsModuleStub
      icon={Telescope}
      title="Research"
      description="Product research, competitor tracking, market notes for ETS."
      legacyHref="/workspace/research"
    />
  )
}
