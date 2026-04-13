"use client"
import { GraduationCap } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsTrainingPage() {
  return (
    <EtsModuleStub
      icon={GraduationCap}
      title="Learning"
      description="Partner + cashier training videos and SOPs for ETS store launches."
      legacyHref="/workspace/training"
    />
  )
}
