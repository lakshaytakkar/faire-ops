"use client"

import { TriggerDrawer } from "../../_components/EditButton"
import { LifeDrawerForm } from "../../_components/LifeDrawerForm"
import { SPECS } from "../../_components/field-specs"

export function IssueEditLauncher({
  issue,
}: {
  issue: Record<string, unknown> & { id: string }
}) {
  return (
    <TriggerDrawer
      label="Edit issue"
      render={({ open, onClose }) => (
        <LifeDrawerForm
          open={open}
          onClose={onClose}
          title="Edit issue"
          table="life_issues"
          id={issue.id}
          defaults={issue}
          fields={SPECS.life_issues}
          revalidate={`/life/issues/${issue.id}`}
          size="lg"
          deletable
          onSaved={(newId) => {
            if (!newId) window.location.href = "/life/issues"
          }}
        />
      )}
    />
  )
}
