"use client"

import { useState, useTransition, type ReactNode, type FormEvent } from "react"
import { toast } from "sonner"
import { EditDrawer } from "@/components/shared/edit-drawer"
import { Button } from "@/components/ui/button"
import { insertRow, updateRow, deleteRow } from "../_actions/crud"

/**
 * Generic drawer form for Life space CRUD. Renders children (form inputs) and
 * handles submit — either insert or update depending on whether `id` is set.
 * Pass `fields` to declaratively render a simple form, or pass `children` for
 * a bespoke layout. Uses native HTML form semantics for easy server-action
 * integration without a form library.
 */

export interface FieldSpec {
  name: string
  label: string
  type?:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "select"
    | "time"
    | "url"
    | "checkbox"
  options?: { value: string; label: string }[]
  placeholder?: string
  required?: boolean
  rows?: number
  step?: string
  min?: number
  max?: number
}

export interface LifeDrawerFormProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  table: string
  id?: string
  defaults?: Record<string, unknown>
  fields: FieldSpec[]
  revalidate?: string
  size?: "md" | "lg" | "xl"
  /** Optional field transformer: runs before submit; return null/undefined to skip entry */
  transform?: (values: Record<string, unknown>) => Record<string, unknown>
  /** Called after successful insert/update; receives id of affected row */
  onSaved?: (id: string | undefined) => void
  deletable?: boolean
}

export function LifeDrawerForm({
  open,
  onClose,
  title,
  subtitle,
  table,
  id,
  defaults,
  fields,
  revalidate,
  size = "md",
  transform,
  onSaved,
  deletable = false,
}: LifeDrawerFormProps) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const raw: Record<string, unknown> = {}
    for (const f of fields) {
      if (f.type === "checkbox") {
        raw[f.name] = fd.get(f.name) === "on"
        continue
      }
      const v = fd.get(f.name)
      if (v === null || v === "") {
        raw[f.name] = null
        continue
      }
      if (f.type === "number") {
        const n = Number(v)
        raw[f.name] = Number.isFinite(n) ? n : null
      } else {
        raw[f.name] = v
      }
    }
    const values = transform ? transform(raw) : raw

    start(async () => {
      const res = id
        ? await updateRow(table, id, values, revalidate)
        : await insertRow(table, values, revalidate)
      if (!res.ok) {
        setError(res.error)
        toast.error(res.error)
        return
      }
      toast.success(id ? "Saved" : "Created")
      onSaved?.(res.id)
      onClose()
    })
  }

  function handleDelete() {
    if (!id) return
    if (!confirm("Delete this entry? This cannot be undone.")) return
    setError(null)
    start(async () => {
      const res = await deleteRow(table, id, revalidate)
      if (!res.ok) {
        setError(res.error)
        toast.error(res.error)
        return
      }
      toast.success("Deleted")
      onSaved?.(undefined)
      onClose()
    })
  }

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size={size}
      footer={
        <>
          {deletable && id && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={pending}
              className="text-destructive hover:text-destructive mr-auto"
            >
              Delete
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="life-drawer-form"
            size="sm"
            disabled={pending}
          >
            {pending ? "Saving…" : id ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <form id="life-drawer-form" onSubmit={handleSubmit} className="space-y-4">
        {fields.map((f) => (
          <FieldRow key={f.name} field={f} defaultValue={defaults?.[f.name]} />
        ))}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </EditDrawer>
  )
}

function FieldRow({
  field,
  defaultValue,
}: {
  field: FieldSpec
  defaultValue: unknown
}) {
  const id = `field-${field.name}`
  const common = "w-full rounded-md border bg-background px-3 py-2 text-sm"
  const label = (
    <label
      htmlFor={id}
      className="block text-sm font-medium text-foreground mb-1.5"
    >
      {field.label}
      {field.required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  )

  const dv = defaultValue == null ? "" : String(defaultValue)

  if (field.type === "textarea") {
    return (
      <div>
        {label}
        <textarea
          id={id}
          name={field.name}
          rows={field.rows ?? 4}
          placeholder={field.placeholder}
          required={field.required}
          defaultValue={dv}
          className={common}
        />
      </div>
    )
  }

  if (field.type === "select") {
    return (
      <div>
        {label}
        <select
          id={id}
          name={field.name}
          required={field.required}
          defaultValue={dv}
          className={common}
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (field.type === "checkbox") {
    return (
      <div className="flex items-center gap-2">
        <input
          id={id}
          name={field.name}
          type="checkbox"
          defaultChecked={Boolean(defaultValue)}
          className="rounded border"
        />
        <label htmlFor={id} className="text-sm">
          {field.label}
        </label>
      </div>
    )
  }

  return (
    <div>
      {label}
      <input
        id={id}
        name={field.name}
        type={field.type ?? "text"}
        placeholder={field.placeholder}
        required={field.required}
        defaultValue={dv}
        step={field.step}
        min={field.min}
        max={field.max}
        className={common}
      />
    </div>
  )
}
