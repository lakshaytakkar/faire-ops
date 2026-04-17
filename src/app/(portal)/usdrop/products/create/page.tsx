import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { createProduct } from "../../_actions/product-actions"

export const dynamic = "force-dynamic"
export const metadata = { title: "Create Product — USDrop | Suprans" }

async function fetchOptions() {
  const [categoriesRes, suppliersRes] = await Promise.all([
    supabaseUsdrop.from("categories").select("id, name").order("name"),
    supabaseUsdrop.from("suppliers").select("id, name").order("name"),
  ])
  return {
    categories: (categoriesRes.data ?? []) as { id: string; name: string | null }[],
    suppliers: (suppliersRes.data ?? []) as { id: string; name: string | null }[],
  }
}

export default async function CreateProductPage() {
  const { categories, suppliers } = await fetchOptions()

  async function handleCreate(formData: FormData) {
    "use server"
    const title = formData.get("title") as string
    const description = (formData.get("description") as string) || undefined
    const image = (formData.get("image") as string) || undefined
    const buy_price = parseFloat(formData.get("buy_price") as string)
    const sell_price = parseFloat(formData.get("sell_price") as string)
    const category_id = (formData.get("category_id") as string) || undefined
    const supplier_id = (formData.get("supplier_id") as string) || undefined
    const in_stock = formData.get("in_stock") === "on"

    if (!title || isNaN(buy_price) || isNaN(sell_price)) return

    const result = await createProduct({
      title,
      description,
      image,
      buy_price,
      sell_price,
      category_id,
      supplier_id,
      in_stock,
    })
    if (result.ok) redirect("/usdrop/products")
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <Link
        href="/usdrop/products"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All products
      </Link>

      <h1 className="text-2xl font-bold font-heading">Create Product</h1>

      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-6 max-w-lg">
        <form action={handleCreate} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1.5">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="Product name"
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Brief product description..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
            />
          </div>

          {/* Image URL */}
          <div>
            <label htmlFor="image" className="block text-sm font-medium mb-1.5">
              Image URL
            </label>
            <input
              id="image"
              name="image"
              type="url"
              placeholder="https://..."
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            />
          </div>

          {/* Buy Price + Sell Price (side by side) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="buy_price" className="block text-sm font-medium mb-1.5">
                Buy Price ($) <span className="text-destructive">*</span>
              </label>
              <input
                id="buy_price"
                name="buy_price"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                className="w-full h-9 rounded-md border bg-background px-3 text-sm tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="sell_price" className="block text-sm font-medium mb-1.5">
                Sell Price ($) <span className="text-destructive">*</span>
              </label>
              <input
                id="sell_price"
                name="sell_price"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                className="w-full h-9 rounded-md border bg-background px-3 text-sm tabular-nums"
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Profit per order is auto-calculated as sell price minus buy price.
          </p>

          {/* Category */}
          <div>
            <label htmlFor="category_id" className="block text-sm font-medium mb-1.5">
              Category
            </label>
            <select
              id="category_id"
              name="category_id"
              defaultValue=""
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? "Unnamed"}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier */}
          <div>
            <label htmlFor="supplier_id" className="block text-sm font-medium mb-1.5">
              Supplier
            </label>
            <select
              id="supplier_id"
              name="supplier_id"
              defaultValue=""
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">No supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name ?? "Unnamed"}
                </option>
              ))}
            </select>
          </div>

          {/* In Stock */}
          <div className="flex items-center gap-2">
            <input
              id="in_stock"
              name="in_stock"
              type="checkbox"
              defaultChecked
              className="size-4 rounded border"
            />
            <label htmlFor="in_stock" className="text-sm font-medium">
              In Stock
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Create Product
            </button>
            <Link
              href="/usdrop/products"
              className="h-9 px-5 rounded-md border text-sm font-medium inline-flex items-center hover:bg-muted/40 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
