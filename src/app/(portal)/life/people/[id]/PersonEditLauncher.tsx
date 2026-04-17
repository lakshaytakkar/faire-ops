"use client"

import { TriggerDrawer } from "../../_components/EditButton"
import { LifeDrawerForm } from "../../_components/LifeDrawerForm"
import { SPECS } from "../../_components/field-specs"

export function PersonEditLauncher({
  person,
}: {
  person: Record<string, unknown> & { id: string }
}) {
  return (
    <TriggerDrawer
      label="Edit"
      render={({ open, onClose }) => (
        <LifeDrawerForm
          open={open}
          onClose={onClose}
          title="Edit person"
          table="people"
          id={person.id}
          defaults={person}
          fields={SPECS.people}
          revalidate={`/life/people/${person.id}`}
          size="lg"
          deletable
          onSaved={(newId) => {
            if (!newId) window.location.href = "/life/people"
          }}
        />
      )}
    />
  )
}
