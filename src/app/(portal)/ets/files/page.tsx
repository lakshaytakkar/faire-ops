"use client"
import { FolderOpen } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsFilesPage() {
  return (
    <EtsModuleStub
      icon={FolderOpen}
      title="Files"
      description="ETS document library — contracts, store photos, BOQs, QC reports."
      legacyHref="/workspace/files"
    />
  )
}
