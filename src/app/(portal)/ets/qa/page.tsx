"use client"
import { ShieldCheck } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsQaPage() {
  return (
    <EtsModuleStub
      icon={ShieldCheck}
      title="QA"
      description="Store QC, partner call reviews, audit logs for the ETS venture."
      legacyHref="/workspace/qa/dashboard"
    />
  )
}
