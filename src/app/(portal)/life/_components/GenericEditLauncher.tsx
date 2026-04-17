"use client"

import { TriggerDrawer } from "./EditButton"
import { LifeDrawerForm } from "./LifeDrawerForm"
import { SPECS } from "./field-specs"

/**
 * Reusable edit-launcher for any table listed in SPECS. Detail pages pass
 * the row, this renders the edit drawer and a delete action. Use this for
 * straightforward records; detail pages with special needs (e.g. goals,
 * journals) should render bespoke launchers.
 */
export function GenericEditLauncher({
  table,
  row,
  title = "Edit",
  listHref,
  size = "lg",
  buttonLabel = "Edit",
}: {
  table: keyof typeof SPECS
  row: Record<string, unknown> & { id: string }
  title?: string
  listHref: string
  size?: "md" | "lg" | "xl"
  buttonLabel?: string
}) {
  return (
    <TriggerDrawer
      label={buttonLabel}
      render={({ open, onClose }) => (
        <LifeDrawerForm
          open={open}
          onClose={onClose}
          title={title}
          table={table}
          id={row.id}
          defaults={row}
          fields={SPECS[table]}
          revalidate={`${listHref}/${row.id}`}
          size={size}
          deletable
          onSaved={(newId) => {
            if (!newId) window.location.href = listHref
          }}
        />
      )}
    />
  )
}

/** Generic "+ Add" trigger for a list page */
export function GenericAddLauncher({
  table,
  listHref,
  title = "New entry",
  defaults,
  size = "lg",
  label = "+ Add",
}: {
  table: keyof typeof SPECS
  listHref: string
  title?: string
  defaults?: Record<string, unknown>
  size?: "md" | "lg" | "xl"
  label?: string
}) {
  return (
    <TriggerDrawer
      label={label}
      icon="none"
      render={({ open, onClose }) => (
        <LifeDrawerForm
          open={open}
          onClose={onClose}
          title={title}
          table={table}
          defaults={defaults}
          fields={SPECS[table]}
          revalidate={listHref}
          size={size}
        />
      )}
    />
  )
}
