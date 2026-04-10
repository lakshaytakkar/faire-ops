import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Dedicated client for the b2b schema (faire_*, meta_*, collections, vendor_quotes,
// marketing_*, scraped_products, shipment_tracking, store_*, sync_log, etc.).
// supabase-js binds a client to a single schema, so anything that lives in b2b
// must use this client. Foundation/portal tables (users, tasks, chat, etc.)
// continue to use the default `supabase` client which targets the public schema.
export const supabaseB2B = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "b2b" },
})

/* ------------------------------------------------------------------ */
/*  Store types                                                        */
/* ------------------------------------------------------------------ */

export interface FaireStore {
  id: string
  faire_store_id: string
  name: string
  color: string
  short: string
  category: string
  total_orders: number
  total_products: number
  last_synced_at: string | null
  active: boolean
  logo_url: string | null
}

export interface FaireOrder {
  id: string
  faire_order_id: string
  store_id: string
  display_id: string | null
  retailer_id: string | null
  state: string
  source: string
  raw_data: Record<string, unknown>
  total_cents: number
  item_count: number
  shipping_address: Record<string, unknown> | null
  payout_costs: Record<string, unknown> | null
  notes: string | null
  faire_created_at: string | null
  faire_updated_at: string | null
  synced_at: string
}

export interface FaireProduct {
  id: string
  faire_product_id: string
  store_id: string
  name: string
  description: string | null
  category: string | null
  lifecycle_state: string
  sale_state: string
  raw_data: Record<string, unknown>
  variant_count: number
  total_inventory: number
  wholesale_price_cents: number
  retail_price_cents: number
  minimum_order_quantity: number
  made_in_country: string | null
  tags: string[]
  primary_image_url: string | null
  faire_created_at: string | null
  faire_updated_at: string | null
  synced_at: string
}

export interface FaireRetailer {
  id: string
  faire_retailer_id: string
  name: string | null
  company_name: string | null
  city: string | null
  state: string | null
  country: string | null
  phone: string | null
  total_orders: number
  total_spent_cents: number
  first_order_at: string | null
  last_order_at: string | null
  store_ids: string[]
}

/* ------------------------------------------------------------------ */
/*  Data fetching helpers                                               */
/* ------------------------------------------------------------------ */

export async function getStores(): Promise<FaireStore[]> {
  const { data, error } = await supabaseB2B
    .from("faire_stores")
    .select("id, faire_store_id, name, color, short, category, total_orders, total_products, last_synced_at, active, logo_url")
    .eq("active", true)
    .order("name")
  if (error) { console.error("getStores error:", error); return [] }
  return data ?? []
}

export async function getOrders(storeId?: string, state?: string, limit = 100): Promise<FaireOrder[]> {
  let query = supabaseB2B
    .from("faire_orders")
    .select("*")
    .order("faire_created_at", { ascending: false })
    .limit(limit)
  if (storeId) query = query.eq("store_id", storeId)
  if (state) query = query.eq("state", state)
  const { data, error } = await query
  if (error) { console.error("getOrders error:", error); return [] }
  return data ?? []
}

export async function getProducts(storeId?: string, limit = 200): Promise<FaireProduct[]> {
  let query = supabaseB2B
    .from("faire_products")
    .select("*")
    .order("faire_updated_at", { ascending: false })
    .limit(limit)
  if (storeId) query = query.eq("store_id", storeId)
  const { data, error } = await query
  if (error) { console.error("getProducts error:", error); return [] }
  return data ?? []
}

export async function getRetailers(limit = 200): Promise<FaireRetailer[]> {
  const { data, error } = await supabaseB2B
    .from("faire_retailers")
    .select("*")
    .order("last_order_at", { ascending: false })
    .limit(limit)
  if (error) { console.error("getRetailers error:", error); return [] }
  return data ?? []
}

export async function getSyncLogs(storeId?: string, limit = 20) {
  let query = supabaseB2B
    .from("sync_log")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit)
  if (storeId) query = query.eq("store_id", storeId)
  const { data, error } = await query
  if (error) { console.error("getSyncLogs error:", error); return [] }
  return data ?? []
}
