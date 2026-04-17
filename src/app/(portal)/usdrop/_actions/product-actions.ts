"use server"

import { revalidatePath } from "next/cache"
import { usdropAdmin, type ActionResult } from "./_client"

const PRODUCTS_PATH = "/usdrop/products"

// ---------------------------------------------------------------------------
// createProduct — insert into products + product_metadata
// ---------------------------------------------------------------------------

export async function createProduct(payload: {
  title: string
  description?: string
  image?: string
  buy_price: number
  sell_price: number
  category_id?: string
  supplier_id?: string
  in_stock: boolean
}): Promise<ActionResult> {
  try {
    const admin = usdropAdmin()
    const profit_per_order = payload.sell_price - payload.buy_price

    const productRow = {
      title: payload.title,
      description: payload.description ?? null,
      image: payload.image ?? null,
      buy_price: payload.buy_price,
      sell_price: payload.sell_price,
      profit_per_order,
      category_id: payload.category_id || null,
      supplier_id: payload.supplier_id || null,
      in_stock: payload.in_stock,
    }

    const { data, error } = await admin
      .from("products")
      .insert(productRow)
      .select("id")
      .single()
    if (error) return { ok: false, error: error.message }

    // Create corresponding product_metadata row
    const profitMargin =
      payload.sell_price > 0
        ? Math.round((profit_per_order / payload.sell_price) * 100)
        : 0

    const { error: metaError } = await admin.from("product_metadata").insert({
      id: data.id,
      is_winning: false,
      is_trending: false,
      profit_margin: profitMargin,
      pot_revenue: 0,
      items_sold: 0,
    })
    if (metaError) {
      console.error("product_metadata insert error:", metaError.message)
      // Product was created — don't fail, just log
    }

    revalidatePath(PRODUCTS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

// ---------------------------------------------------------------------------
// deleteProduct — delete product_metadata + products row
// ---------------------------------------------------------------------------

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    const admin = usdropAdmin()

    // Delete metadata first (it references products.id)
    await admin.from("product_metadata").delete().eq("id", id)

    const { error } = await admin.from("products").delete().eq("id", id)
    if (error) return { ok: false, error: error.message }

    revalidatePath(PRODUCTS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}
