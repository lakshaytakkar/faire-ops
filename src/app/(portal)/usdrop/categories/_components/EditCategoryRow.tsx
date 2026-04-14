"use client"

import { useState, useTransition } from "react"
import { Pencil } from "lucide-react"
import { EditDrawer } from "@/components/shared/edit-drawer"
import { Button } from "@/components/ui/button"
import { updateRow } from "@/app/(portal)/usdrop/_actions/crud"

type Category = {
  id: string
  name: string | null
  slug: string | null
  parent_category_id: string | null
  trending: boolean | null
  product_count: number | null
  avg_profit_margin: number | null
  growth_percentage: number | null
}

export function EditCategoryRow({ category }: { category: Category }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [trending, setTrending] = useState(!!category.trending)
  const [margin, setMargin] = useState(category.avg_profit_margin?.toString() ?? "")
  const [growth, setGrowth] = useState(category.growth_percentage?.toString() ?? "")

  function save() {
    setErr(null)
    start(async () => {
      const res = await updateRow(
        "categories",
        category.id,
        {
          trending,
          avg_profit_margin: margin === "" ? null : Number(margin),
          growth_percentage: growth === "" ? null : Number(growth),
          updated_at: new Date().toISOString(),
        },
        "/usdrop/categories",
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
        title="Edit category"
        subtitle={category.name ?? undefined}
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={trending}
              onChange={(e) => setTrending(e.target.checked)}
            />
            Trending
          </label>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Average profit margin (%)
            </label>
            <input
              type="number"
              step="0.1"
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Growth percentage (%)
            </label>
            <input
              type="number"
              step="0.1"
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={growth}
              onChange={(e) => setGrowth(e.target.value)}
            />
          </div>
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
