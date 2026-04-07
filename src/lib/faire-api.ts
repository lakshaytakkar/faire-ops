/**
 * Faire External API v2 Client
 * Base URL: https://www.faire.com/external-api/v2
 */

const BASE_URL = process.env.FAIRE_API_BASE_URL || "https://www.faire.com/external-api/v2"

interface FaireCreds {
  oauth_token: string
  app_credentials: string
}

function makeHeaders(creds: FaireCreds): HeadersInit {
  return {
    "X-FAIRE-OAUTH-ACCESS-TOKEN": creds.oauth_token,
    "X-FAIRE-APP-CREDENTIALS": creds.app_credentials,
    "Content-Type": "application/json",
  }
}

async function faireGet(creds: FaireCreds, path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: makeHeaders(creds) })
  if (!res.ok) {
    if (res.status === 429) throw new Error("RATE_LIMITED")
    if (res.status === 404) return null
    throw new Error(`Faire API ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

export async function fetchBrandProfile(creds: FaireCreds) {
  return faireGet(creds, "/brands/profile")
}

export async function fetchAllOrders(creds: FaireCreds): Promise<unknown[]> {
  const allOrders: unknown[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    try {
      const data = (await faireGet(creds, `/orders?limit=50&page=${page}`)) as {
        orders?: unknown[]
        page?: number
        cursor?: string
      } | null

      if (!data || !data.orders || data.orders.length === 0) {
        hasMore = false
        break
      }

      allOrders.push(...data.orders)

      if (data.orders.length < 50) {
        hasMore = false
      } else {
        page++
      }
    } catch (err) {
      if ((err as Error).message === "RATE_LIMITED") {
        await new Promise((r) => setTimeout(r, 2000))
        continue
      }
      console.error("fetchAllOrders error:", err)
      hasMore = false
    }
  }

  return allOrders
}

export async function fetchAllProducts(creds: FaireCreds): Promise<unknown[]> {
  const allProducts: unknown[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    try {
      const data = (await faireGet(creds, `/products?limit=50&page=${page}`)) as {
        products?: unknown[]
        page?: number
        cursor?: string
      } | null

      if (!data || !data.products || data.products.length === 0) {
        hasMore = false
        break
      }

      allProducts.push(...data.products)

      if (data.products.length < 50) {
        hasMore = false
      } else {
        page++
      }
    } catch (err) {
      if ((err as Error).message === "RATE_LIMITED") {
        await new Promise((r) => setTimeout(r, 2000))
        continue
      }
      console.error("fetchAllProducts error:", err)
      hasMore = false
    }
  }

  return allProducts
}

export function extractOrderFields(order: Record<string, unknown>) {
  const items = (order.items as unknown[]) ?? []
  const address = order.address as Record<string, unknown> | undefined
  const payoutCosts = order.payout_costs as Record<string, unknown> | undefined

  let totalCents = 0
  for (const item of items) {
    const i = item as Record<string, unknown>
    totalCents += ((i.price_cents as number) ?? 0) * ((i.quantity as number) ?? 1)
  }

  return {
    faire_order_id: order.id as string,
    display_id: (order.display_id as string) ?? null,
    retailer_id: (order.retailer_id as string) ?? null,
    state: (order.state as string) ?? "NEW",
    source: (order.source as string) ?? "MARKETPLACE",
    raw_data: order,
    total_cents: totalCents,
    item_count: items.length,
    shipping_address: address ?? null,
    payout_costs: payoutCosts ?? null,
    notes: (order.notes as string) ?? null,
    faire_created_at: (order.created_at as string) ?? null,
    faire_updated_at: (order.updated_at as string) ?? null,
  }
}

export function extractProductFields(product: Record<string, unknown>) {
  const variants = (product.variants as unknown[]) ?? []
  let totalInventory = 0
  let wholesaleCents = 0
  let retailCents = 0

  for (const v of variants) {
    const vr = v as Record<string, unknown>
    totalInventory += (vr.available_quantity as number) ?? 0
    if (!wholesaleCents) wholesaleCents = (vr.wholesale_price_cents as number) ?? 0
    if (!retailCents) retailCents = (vr.retail_price_cents as number) ?? 0
  }

  return {
    faire_product_id: product.id as string,
    name: (product.name as string) ?? "Unnamed Product",
    description: (product.description as string) ?? null,
    category: (product.category as string) ?? (product.taxonomy_type as string) ?? null,
    lifecycle_state: (product.lifecycle_state as string) ?? "DRAFT",
    sale_state: (product.sale_state as string) ?? "FOR_SALE",
    raw_data: product,
    variant_count: variants.length,
    total_inventory: totalInventory,
    wholesale_price_cents: wholesaleCents,
    retail_price_cents: retailCents,
    minimum_order_quantity: (product.minimum_order_quantity as number) ?? 1,
    made_in_country: (product.made_in_country as string) ?? null,
    tags: (product.tags as string[]) ?? [],
    faire_created_at: (product.created_at as string) ?? null,
    faire_updated_at: (product.updated_at as string) ?? null,
  }
}

export function extractRetailerFromOrder(order: Record<string, unknown>) {
  const address = order.address as Record<string, unknown> | undefined
  if (!order.retailer_id) return null

  return {
    faire_retailer_id: order.retailer_id as string,
    name: (address?.name as string) ?? null,
    company_name: (address?.company_name as string) ?? null,
    city: (address?.city as string) ?? null,
    state: (address?.state as string) ?? null,
    country: (address?.country as string) ?? null,
    postal_code: (address?.postal_code as string) ?? null,
    phone: (address?.phone_number as string) ?? null,
  }
}

// --- WRITE OPERATIONS ---

async function fairePost(creds: FaireCreds, path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: makeHeaders(creds),
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    if (res.status === 429) throw new Error("RATE_LIMITED")
    const text = await res.text().catch(() => "")
    throw new Error(`Faire API ${res.status}: ${text}`)
  }
  return res.json().catch(() => ({}))
}

async function fairePatch(creds: FaireCreds, path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: makeHeaders(creds),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Faire API ${res.status}: ${res.statusText}`)
  return res.json().catch(() => ({}))
}

export async function acceptOrder(creds: FaireCreds, orderId: string): Promise<unknown> {
  // Try primary endpoint first, then fallback
  try {
    return await fairePost(creds, `/orders/${orderId}/processing`)
  } catch (err) {
    const msg = (err as Error).message
    // If 405 (Method Not Allowed), try item-level processing
    if (msg.includes("405")) {
      try {
        return await fairePost(creds, `/orders/${orderId}/items/processing`)
      } catch {
        // If both fail, try PUT instead of POST
        const res = await fetch(`${BASE_URL}/orders/${orderId}/processing`, {
          method: "PUT",
          headers: makeHeaders(creds),
        })
        if (res.ok) return res.json().catch(() => ({}))
        throw new Error(`Faire API: Unable to accept order. The API may require different permissions or the order state may have changed. Original error: ${msg}`)
      }
    }
    throw err
  }
}

export async function shipOrder(creds: FaireCreds, orderId: string, trackingCode: string, carrier: string): Promise<unknown> {
  return fairePost(creds, `/orders/${orderId}/shipments`, {
    shipments: [{
      tracking_code: trackingCode,
      carrier: carrier,
      maker_cost_cents: 0,
      shipping_type: "SHIP_ON_YOUR_OWN",
    }]
  })
}

export async function cancelOrder(creds: FaireCreds, orderId: string): Promise<unknown> {
  return fairePost(creds, `/orders/${orderId}/cancel`)
}

export async function updateVariantInventory(creds: FaireCreds, productId: string, variantId: string, quantity: number): Promise<unknown> {
  return fairePatch(creds, `/products/${productId}/variants/${variantId}`, {
    available_quantity: quantity,
  })
}

export async function createProduct(creds: FaireCreds, productData: Record<string, unknown>): Promise<unknown> {
  return fairePost(creds, "/products", productData)
}

export async function updateProduct(creds: FaireCreds, productId: string, data: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/products/${productId}`, { method: "PUT", headers: makeHeaders(creds), body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`Faire API ${res.status}: ${await res.text().catch(() => "")}`)
  return res.json().catch(() => ({}))
}

export async function deleteProduct(creds: FaireCreds, productId: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/products/${productId}`, { method: "DELETE", headers: makeHeaders(creds) })
  if (!res.ok) throw new Error(`Faire API ${res.status}: ${await res.text().catch(() => "")}`)
  return res.json().catch(() => ({}))
}

export async function updateBrandProfile(creds: FaireCreds, profileData: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/brands/profile`, { method: "PUT", headers: makeHeaders(creds), body: JSON.stringify(profileData) })
  if (!res.ok) throw new Error(`Faire API ${res.status}: ${await res.text().catch(() => "")}`)
  return res.json().catch(() => ({}))
}

export async function fulfillOrderItem(creds: FaireCreds, orderId: string, itemId: string): Promise<unknown> {
  return fairePost(creds, `/orders/${orderId}/items/${itemId}/fulfill`)
}

export async function backorderItem(creds: FaireCreds, orderId: string, itemId: string, backorderedUntil: string): Promise<unknown> {
  return fairePost(creds, `/orders/${orderId}/items/${itemId}/backorder`, { backordered_until: backorderedUntil })
}
