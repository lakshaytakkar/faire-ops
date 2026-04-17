"use client"

import { TriggerDrawer } from "./EditButton"
import { GoyoDrawerForm } from "./GoyoDrawerForm"
import { SPECS } from "./field-specs"

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
        <GoyoDrawerForm
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
        <GoyoDrawerForm
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
