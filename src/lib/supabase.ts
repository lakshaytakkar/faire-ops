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

// Suprans Lead Hub + landing page content (suprans.*)
export const supabaseSuprans = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "suprans" },
})

// EazyToSell admin portal (ets.*)
export const supabaseEts = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "ets" },
})

// USDrop AI admin (usdrop.*)
export const supabaseUsdrop = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "usdrop" },
})

// JSBlueridge Admin (jsblueridge.*)
// NOTE: jsblueridge schema is NOT exposed in PostgREST. Client-side code must
// use the API proxy routes at /api/jsblueridge/data. This anon client is kept
// for potential future use once the schema is exposed in the Supabase dashboard.
export const supabaseJSBlueridge = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "jsblueridge" },
})

// Server-only: uses service_role key to bypass PostgREST schema exposure.
// Use this in API routes (never import from client components).
export function getSupabaseJSBlueridgeAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey
  return createClient(supabaseUrl, key, { db: { schema: "jsblueridge" } })
}

// B2B Ecosystem — independent D2C ops for Toyarina.com + Gullee.com (b2b_ecosystem.*)
export const supabaseB2BEcosystem = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "b2b_ecosystem" },
})

// Life AI — Mr. Suprans's personal OS (life.*)
export const supabaseLife = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "life" },
})

// Suprans HQ cross-vertical data (hq.entities, hq.revenue, hq.expenses,
// hq.alerts, hq.v_headcount_by_dept_vertical, ...). See SPACE_PATTERN.md.
export const supabaseHq = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "hq" },
})

// GoyoTours vertical (goyo.bookings, goyo.clients, goyo.tours, goyo.visas, ...)
export const supabaseGoyo = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "goyo" },
})

// LegalNations Admin (legal.clients, legal.cases, legal.documents,
// legal.payments, legal.compliance_items, legal.case_notes, legal.case_tasks)
export const supabaseLegal = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "legal" },
})

// SuprDM admin (suprdm.users, suprdm.plans, suprdm.roles, suprdm.features,
// suprdm.automations, suprdm.payments). Mirrors the SuprDM product's data model;
// client app lives at a separate Vercel deploy, admin lives inside faire-ops.
export const supabaseSuprdm = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "suprdm" },
})

// Gullee admin (gullee.products, gullee.collections, gullee.retailers,
// gullee.orders, gullee.wholesale_applications). Storefronts at gullee-storefront
// and toyarina-storefront on Vercel; admin lives inside faire-ops.
export const supabaseGullee = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "gullee" },
})

// chinaproducts.in — Wholesale Catalog rep portal (chinaproducts.products,
// chinaproducts.orders, chinaproducts.order_items, chinaproducts.rep_queue,
// chinaproducts.call_scripts, chinaproducts.objection_handlers).
export const supabaseChinaproducts = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "chinaproducts" },
})

// chinaimports.in — Custom Sourcing ops portal (chinaimports.rfqs,
// chinaimports.quote_options, chinaimports.orders, chinaimports.order_stages,
// chinaimports.ops_queue).
export const supabaseChinaimports = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "chinaimports" },
})

// Shared cross-portal tables for the china ventures (shared.factories,
// shared.waitlist_signups, shared.whatsapp_logs, shared.payment_records,
// shared.documents).
export const supabaseShared = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "shared" },
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
