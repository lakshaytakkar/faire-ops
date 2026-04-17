"use client"

import { TriggerDrawer } from "../../_components/EditButton"
import { LifeDrawerForm } from "../../_components/LifeDrawerForm"
import { SPECS } from "../../_components/field-specs"

export function InteractionLauncher({ personId }: { personId: string }) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <TriggerDrawer
      label="Log interaction"
      icon="add"
      render={({ open, onClose }) => (
        <LifeDrawerForm
          open={open}
          onClose={onClose}
          title="Log interaction"
          table="interaction_logs"
          defaults={{ person_id: personId, date: today }}
          fields={SPECS.interaction_logs}
          revalidate={`/life/people/${personId}`}
        />
      )}
    />
  )
}
