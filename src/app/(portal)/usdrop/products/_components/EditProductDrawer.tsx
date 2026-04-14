"use client"

import { useEffect, useState, useTransition } from "react"
import { EditDrawer } from "@/components/shared/edit-drawer"
import { Button } from "@/components/ui/button"
import { updateRow } from "@/app/(portal)/usdrop/_actions/crud"

export type ProductEditable = {
  id: string
  title: string | null
  description: string | null
  image: string | null
  buy_price: number | null
  sell_price: number | null
  profit_per_order: number | null
  category_id: string | null
  supplier_id: string | null
  in_stock: boolean | null
}

export function EditProductDrawer({
  open,
  onClose,
  product,
  categories,
  suppliers,
}: {
  open: boolean
  onClose: () => void
  product: ProductEditable | null
  categories: Array<{ id: string; name: string | null }>
  suppliers: Array<{ id: string; name: string | null }>
}) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState<ProductEditable | null>(product)

  useEffect(() => {
    setForm(product)
    setErr(null)
  }, [product])

  if (!form) return null

  function save() {
    if (!form) return
    setErr(null)
    start(async () => {
      const res = await updateRow(
        "products",
        form.id,
        {
          title: form.title,
          description: form.description,
          image: form.image,
          buy_price: form.buy_price,
          sell_price: form.sell_price,
          profit_per_order: form.profit_per_order,
          category_id: form.category_id,
          supplier_id: form.supplier_id,
          in_stock: form.in_stock,
          updated_at: new Date().toISOString(),
        },
        `/usdrop/products/${form.id}`,
      )
      if (!res.ok) setErr(res.error)
      else onClose()
    })
  }

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title="Edit product"
      subtitle={form.title ?? undefined}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title">
          <input
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            value={form.title ?? ""}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Description">
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            rows={4}
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field label="Image URL">
          <input
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            value={form.image ?? ""}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Buy price ($)">
            <input
              type="number"
              step="0.01"
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.buy_price ?? ""}
              onChange={(e) =>
                setForm({ ...form, buy_price: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Sell price ($)">
            <input
              type="number"
              step="0.01"
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.sell_price ?? ""}
              onChange={(e) =>
                setForm({ ...form, sell_price: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Profit / order ($)">
            <input
              type="number"
              step="0.01"
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.profit_per_order ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  profit_per_order: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.category_id ?? ""}
              onChange={(e) =>
                setForm({ ...form, category_id: e.target.value === "" ? null : e.target.value })
              }
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.id}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Supplier">
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.supplier_id ?? ""}
              onChange={(e) =>
                setForm({ ...form, supplier_id: e.target.value === "" ? null : e.target.value })
              }
            >
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name ?? s.id}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!form.in_stock}
            onChange={(e) => setForm({ ...form, in_stock: e.target.checked })}
          />
          In stock
        </label>
        {err && (
          <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm">
            {err}
          </div>
        )}
      </div>
    </EditDrawer>
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
