/**
 * Fix products with case_size (unit_multiplier) = 1 → 6
 * Also adjusts MOQ to be a multiple of 6
 */
import { createClient } from "@supabase/supabase-js"

const BASE_URL = "https://www.faire.com/external-api/v2"
const NEW_CASE_SIZE = 6

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function roundUpToMultiple(n: number, mult: number): number {
  return Math.ceil(n / mult) * mult
}

async function main() {
  const { data: stores } = await supabase
    .from("faire_stores")
    .select("id, name, oauth_token, app_credentials")
    .eq("active", true)

  if (!stores) { console.log("No stores"); return }

  let totalOk = 0, totalFail = 0

  for (const store of stores) {
    const { data: products } = await supabase
      .from("faire_products")
      .select("faire_product_id, name, raw_data")
      .eq("store_id", store.id)

    const toFix = (products ?? []).filter(p => {
      const um = (p.raw_data as Record<string, unknown>)?.unit_multiplier
      return um === 1 || um === "1"
    })

    if (toFix.length === 0) continue
    console.log(`\n📦 ${store.name} — ${toFix.length} products`)

    let ok = 0, fail = 0

    for (let i = 0; i < toFix.length; i++) {
      const p = toFix[i]
      const raw = p.raw_data as Record<string, unknown>
      const currentMoq = Number(raw.minimum_order_quantity ?? 1)
      const newMoq = currentMoq % NEW_CASE_SIZE === 0 ? currentMoq : roundUpToMultiple(Math.max(currentMoq, NEW_CASE_SIZE), NEW_CASE_SIZE)

      const body: Record<string, number> = { unit_multiplier: NEW_CASE_SIZE }
      if (newMoq !== currentMoq) body.minimum_order_quantity = newMoq

      const res = await fetch(`${BASE_URL}/products/${p.faire_product_id}`, {
        method: "PATCH",
        headers: {
          "X-FAIRE-OAUTH-ACCESS-TOKEN": store.oauth_token,
          "X-FAIRE-APP-CREDENTIALS": store.app_credentials,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        ok++
      } else {
        const err = await res.text().catch(() => "")
        if (i < 3) console.log(`  ❌ ${p.faire_product_id}: ${err.slice(0, 120)}`)
        fail++
      }

      if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${toFix.length} (${ok} ok, ${fail} fail)`)
      await new Promise(r => setTimeout(r, 80))
    }

    console.log(`  ✅ ${ok} updated, ❌ ${fail} failed`)
    totalOk += ok
    totalFail += fail
  }

  console.log(`\n=== DONE: ${totalOk} updated, ${totalFail} failed ===`)
}

main().catch(console.error)
