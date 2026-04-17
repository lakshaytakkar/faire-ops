"use client"

import { TriggerDrawer } from "../../_components/EditButton"
import { LifeDrawerForm } from "../../_components/LifeDrawerForm"
import { SPECS } from "../../_components/field-specs"

export function GoalEditLauncher({
  goal,
}: {
  goal: Record<string, unknown> & { id: string }
}) {
  return (
    <TriggerDrawer
      label="Edit goal"
      render={({ open, onClose }) => (
        <LifeDrawerForm
          open={open}
          onClose={onClose}
          title="Edit goal"
          table="life_goals"
          id={goal.id}
          defaults={goal}
          fields={SPECS.life_goals}
          revalidate={`/life/goals/${goal.id}`}
          size="lg"
          deletable
          onSaved={(newId) => {
            if (!newId) window.location.href = "/life/goals"
          }}
        />
      )}
    />
  )
}
