"use client"

import { useState, useTransition } from "react"
import { Pencil } from "lucide-react"
import { EditDrawer } from "@/components/shared/edit-drawer"
import { Button } from "@/components/ui/button"
import { updateRow } from "@/app/(portal)/usdrop/_actions/crud"

type Supplier = {
  id: string
  name: string | null
  website: string | null
  country: string | null
  rating: number | null
  verified: boolean | null
  shipping_time: string | null
  min_order_quantity: number | null
  contact_email: string | null
}

export function EditSupplierRow({ supplier }: { supplier: Supplier }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: supplier.name ?? "",
    country: supplier.country ?? "",
    rating: supplier.rating?.toString() ?? "",
    verified: !!supplier.verified,
    shipping_time: supplier.shipping_time ?? "",
    min_order_quantity: supplier.min_order_quantity?.toString() ?? "",
    contact_email: supplier.contact_email ?? "",
    website: supplier.website ?? "",
  })

  function save() {
    setErr(null)
    start(async () => {
      const res = await updateRow(
        "suppliers",
        supplier.id,
        {
          name: form.name || null,
          country: form.country || null,
          rating: form.rating === "" ? null : Number(form.rating),
          verified: form.verified,
          shipping_time: form.shipping_time || null,
          min_order_quantity:
            form.min_order_quantity === "" ? null : Number(form.min_order_quantity),
          contact_email: form.contact_email || null,
          website: form.website || null,
          updated_at: new Date().toISOString(),
        },
        "/usdrop/suppliers",
      )
      if (!res.ok) setErr(res.error)
      else setOpen(false)
    })
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" />
      </Button>
      <EditDrawer
        open={open}
        onClose={() => setOpen(false)}
        title="Edit supplier"
        subtitle={supplier.name ?? undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name">
            <input
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country">
              <input
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </Field>
            <Field label="Rating (0–5)">
              <input
                type="number"
                step="0.1"
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Shipping time">
              <input
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                value={form.shipping_time}
                onChange={(e) => setForm({ ...form, shipping_time: e.target.value })}
              />
            </Field>
            <Field label="MOQ">
              <input
                type="number"
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                value={form.min_order_quantity}
                onChange={(e) => setForm({ ...form, min_order_quantity: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Contact email">
            <input
              type="email"
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
            />
          </Field>
          <Field label="Website">
            <input
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.verified}
              onChange={(e) => setForm({ ...form, verified: e.target.checked })}
            />
            Verified
          </label>
          {err && (
            <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm">
              {err}
            </div>
          )}
        </div>
      </EditDrawer>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  )
}
