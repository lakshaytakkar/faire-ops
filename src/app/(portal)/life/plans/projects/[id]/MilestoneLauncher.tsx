"use client"

import { TriggerDrawer } from "../../../_components/EditButton"
import { LifeDrawerForm } from "../../../_components/LifeDrawerForm"
import { SPECS } from "../../../_components/field-specs"

export function MilestoneLauncher({ projectId }: { projectId: string }) {
  return (
    <TriggerDrawer
      label="Add milestone"
      icon="add"
      render={({ open, onClose }) => (
        <LifeDrawerForm
          open={open}
          onClose={onClose}
          title="New milestone"
          table="project_milestones"
          defaults={{ project_id: projectId }}
          fields={SPECS.project_milestones}
          revalidate={`/life/plans/projects/${projectId}`}
        />
      )}
    />
  )
}
