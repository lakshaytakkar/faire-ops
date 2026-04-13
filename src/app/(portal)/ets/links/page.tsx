"use client"
import { Link2 } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsLinksPage() {
  return (
    <EtsModuleStub
      icon={Link2}
      title="Links"
      description="Curated external links: Haoduobao search, CHA portals, GSTN tools — ETS-specific."
      legacyHref="/workspace/links"
    />
  )
}
