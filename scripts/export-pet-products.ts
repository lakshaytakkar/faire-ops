import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { db: { schema: "b2b" } }
)

const HEADERS = [
  "Product Name (English)", "Product Status", "Product Token", "Product Type",
  "Description (English)", "Selling Method", "Case Size", "Minimum Order Quantity",
  "Item Weight", "Item Weight Unit", "Item Length", "Item Width", "Item Height", "Item Dimensions Unit",
  "Packaged Weight", "Packaged Weight Unit", "Packaged Length", "Packaged Width", "Packaged Height", "Packaged Dimensions Unit",
  "Option Status", "SKU", "GTIN",
  "Option 1 Name", "Option 1 Value", "Option 2 Name", "Option 2 Value", "Option 3 Name", "Option 3 Value",
  "USD Unit Wholesale Price", "USD Unit Retail Price",
  "CAD Unit Wholesale Price", "CAD Unit Retail Price",
  "GBR Unit Wholesale Price", "GBR Unit Retail Price",
  "EUR Unit Wholesale Price", "EUR Unit Retail Price",
  "AUD Unit Wholesale Price", "AUD Unit Retail Price",
  "Option Image", "Preorder", "Ship By Date (YYYY-MM-DD)", "Ship By End Date (if range, YYYY-MM-DD)",
  "Deadline To Order (YYYY-MM-DD)", "Sell After Order By/Ship Date",
  "Product Images", "Made In Country",
  "Tester Price (USD)", "Tester Price (CAD)", "Tester Price (GBP)", "Tester Price (EUR)", "Tester Price (AUD)",
  "Customizable", "Customization Instructions", "Customization Input Required",
  "Customization Input Character Limit", "Customization Minimum Order Quantity",
  "Customization Charge Per Unit (USD)", "Customization Charge Per Unit (CAD)",
  "Customization Charge Per Unit (GBP)", "Customization Charge Per Unit (EUR)",
  "Customization Charge Per Unit (AUD)",
  "Continue selling when out of stock", "On Hand Inventory", "Restock Date", "HS6 Tariff Code"
]

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ""
  const s = String(val)
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function cents2dollars(cents: number | null | undefined): string {
  if (!cents) return ""
  return (cents / 100).toFixed(2)
}

async function main() {
  console.log("Fetching 50 pet products...")

  const { data, error } = await supabase
    .from("faire_products")
    .select("name, faire_product_id, description, wholesale_price_cents, retail_price_cents, total_inventory, category, primary_image_url, raw_data")
    .ilike("category", "%pet%")
    .order("wholesale_price_cents", { ascending: false })
    .limit(50)

  if (error) { console.error("Error:", error); return }
  if (!data || data.length === 0) { console.log("No pet products found"); return }

  console.log(`Found ${data.length} products. Building CSV...`)

  const rows: string[][] = []

  for (const p of data) {
    const raw = (p.raw_data ?? {}) as Record<string, any>
    const variants = (raw.variants ?? []) as Array<Record<string, any>>
    const images = (raw.images ?? []) as Array<Record<string, any>>
    const imageUrls = images.map((img: any) => img.url).filter(Boolean).join("|")

    const measurements = variants[0]?.measurements ?? {}
    const moq = raw.minimum_order_quantity ?? ""
    const unitMultiplier = raw.unit_multiplier ?? 1
    const madeIn = raw.made_in_country ?? ""
    const preorderable = raw.preorderable ? "Yes" : "No"
    const continueSelling = raw.allow_sales_when_out_of_stock ? "Yes" : "No"
    const lifecycleState = raw.lifecycle_state ?? "PUBLISHED"
    const tariffCode = variants[0]?.tariff_code ?? ""

    // Determine product status
    const status = lifecycleState === "PUBLISHED" ? "Published" : lifecycleState === "DRAFT" ? "Draft" : lifecycleState

    // Get variant option sets
    const optionSets = (raw.variant_option_sets ?? []) as Array<Record<string, any>>

    if (variants.length === 0) {
      // Single row, no variants
      rows.push(buildRow(p, raw, null, status, moq, unitMultiplier, madeIn, preorderable, continueSelling, imageUrls, measurements, tariffCode, optionSets))
    } else {
      // One row per variant
      for (const variant of variants) {
        const vMeasurements = variant.measurements ?? measurements
        rows.push(buildRow(p, raw, variant, status, moq, unitMultiplier, madeIn, preorderable, continueSelling, imageUrls, vMeasurements, variant.tariff_code ?? tariffCode, optionSets))
      }
    }
  }

  // Build CSV
  const csv = [
    HEADERS.map(escapeCsv).join(","),
    ...rows.map(row => row.map(escapeCsv).join(","))
  ].join("\n")

  const outPath = "exports/pet-products-50.csv"
  fs.mkdirSync("exports", { recursive: true })
  fs.writeFileSync(outPath, csv, "utf-8")
  console.log(`Written ${rows.length} rows to ${outPath}`)
  console.log(`Products: ${data.length}, Variant rows: ${rows.length}`)
}

function buildRow(
  p: any, raw: any, variant: any | null,
  status: string, moq: any, unitMultiplier: any,
  madeIn: string, preorderable: string, continueSelling: string,
  imageUrls: string, measurements: any, tariffCode: string,
  optionSets: Array<Record<string, any>>
): string[] {
  const v = variant ?? {}
  const prices = (v.prices ?? []) as Array<Record<string, any>>
  const usdPrice = prices.find((pr: any) => pr.geo_constraint?.country === "USA" || pr.wholesale_price?.currency === "USD") ?? prices[0] ?? {}

  const wsUsd = cents2dollars(usdPrice.wholesale_price?.amount_minor ?? p.wholesale_price_cents)
  const rtUsd = cents2dollars(usdPrice.retail_price?.amount_minor ?? p.retail_price_cents)

  // Extract variant options
  const options = (v.options ?? []) as Array<{ name: string; value: string }>
  const opt1Name = options[0]?.name ?? optionSets[0]?.name ?? ""
  const opt1Value = options[0]?.value ?? v.name ?? ""
  const opt2Name = options[1]?.name ?? optionSets[1]?.name ?? ""
  const opt2Value = options[1]?.value ?? ""
  const opt3Name = options[2]?.name ?? optionSets[2]?.name ?? ""
  const opt3Value = options[2]?.value ?? ""

  const variantStatus = v.lifecycle_state === "PUBLISHED" ? "Published" : v.lifecycle_state ?? status
  const sku = v.sku ?? ""
  const gtin = v.gtin ?? ""
  const optionImage = (v.images ?? [])[0]?.url ?? ""
  const inventory = v.available_quantity ?? p.total_inventory ?? ""

  // Weight & dimensions
  const weight = measurements.weight ?? ""
  const weightUnit = measurements.mass_unit ?? (weight ? "POUNDS" : "")
  const length = measurements.length ?? ""
  const width = measurements.width ?? ""
  const height = measurements.height ?? ""
  const dimUnit = measurements.dimension_unit ?? (length ? "INCHES" : "")

  // Description - clean newlines
  const desc = (p.description ?? "").replace(/\n/g, " ").replace(/\r/g, "")

  return [
    p.name,                    // Product Name
    status,                    // Product Status
    p.faire_product_id,        // Product Token
    "Physical",                // Product Type
    desc,                      // Description
    "Wholesale",               // Selling Method
    String(unitMultiplier),    // Case Size
    String(moq),               // MOQ
    String(weight),            // Item Weight
    weightUnit,                // Item Weight Unit
    String(length),            // Item Length
    String(width),             // Item Width
    String(height),            // Item Height
    dimUnit,                   // Item Dimensions Unit
    "",                        // Packaged Weight
    "",                        // Packaged Weight Unit
    "",                        // Packaged Length
    "",                        // Packaged Width
    "",                        // Packaged Height
    "",                        // Packaged Dimensions Unit
    variantStatus,             // Option Status
    sku,                       // SKU
    gtin,                      // GTIN
    opt1Name,                  // Option 1 Name
    opt1Value,                 // Option 1 Value
    opt2Name,                  // Option 2 Name
    opt2Value,                 // Option 2 Value
    opt3Name,                  // Option 3 Name
    opt3Value,                 // Option 3 Value
    wsUsd,                     // USD Wholesale
    rtUsd,                     // USD Retail
    "",                        // CAD Wholesale
    "",                        // CAD Retail
    "",                        // GBP Wholesale
    "",                        // GBP Retail
    "",                        // EUR Wholesale
    "",                        // EUR Retail
    "",                        // AUD Wholesale
    "",                        // AUD Retail
    optionImage,               // Option Image
    preorderable,              // Preorder
    "",                        // Ship By Date
    "",                        // Ship By End Date
    "",                        // Deadline To Order
    "",                        // Sell After Order By/Ship Date
    imageUrls,                 // Product Images (pipe-separated)
    madeIn,                    // Made In Country
    "",                        // Tester USD
    "",                        // Tester CAD
    "",                        // Tester GBP
    "",                        // Tester EUR
    "",                        // Tester AUD
    "No",                      // Customizable
    "",                        // Customization Instructions
    "",                        // Customization Input Required
    "",                        // Customization Input Character Limit
    "",                        // Customization MOQ
    "",                        // Customization USD
    "",                        // Customization CAD
    "",                        // Customization GBP
    "",                        // Customization EUR
    "",                        // Customization AUD
    continueSelling,           // Continue selling when out of stock
    String(inventory),         // On Hand Inventory
    "",                        // Restock Date
    tariffCode,                // HS6 Tariff Code
  ]
}

main().catch(console.error)
