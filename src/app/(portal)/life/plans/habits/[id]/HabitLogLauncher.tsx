"use client"

import { TriggerDrawer } from "../../../_components/EditButton"
import { LifeDrawerForm } from "../../../_components/LifeDrawerForm"
import { SPECS } from "../../../_components/field-specs"

export function HabitLogLauncher({ habitId }: { habitId: string }) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <TriggerDrawer
      label="Log today"
      icon="add"
      render={({ open, onClose }) => (
        <LifeDrawerForm
          open={open}
          onClose={onClose}
          title="Log habit"
          table="habit_logs"
          defaults={{ habit_id: habitId, date: today, status: "done" }}
          fields={SPECS.habit_logs}
          revalidate={`/life/plans/habits/${habitId}`}
        />
      )}
    />
  )
}
