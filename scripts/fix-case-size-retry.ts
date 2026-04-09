/**
 * Retry failed case_size updates — include short_description fix
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
  if (!stores) return

  let totalOk = 0, totalFail = 0

  for (const store of stores) {
    const { data: products } = await supabase
      .from("faire_products")
      .select("faire_product_id, name, raw_data")
      .eq("store_id", store.id)

    // Still case_size=1 (the ones that failed last time)
    const toFix = (products ?? []).filter(p => {
      const um = (p.raw_data as Record<string, unknown>)?.unit_multiplier
      return um === 1 || um === "1"
    })

    if (toFix.length === 0) continue
    console.log(`\n📦 ${store.name} — ${toFix.length} remaining`)

    let ok = 0, fail = 0

    for (const p of toFix) {
      const raw = p.raw_data as Record<string, unknown>
      const currentMoq = Number(raw.minimum_order_quantity ?? 1)
      const newMoq = currentMoq % NEW_CASE_SIZE === 0 ? currentMoq : roundUpToMultiple(Math.max(currentMoq, NEW_CASE_SIZE), NEW_CASE_SIZE)

      const body: Record<string, unknown> = { unit_multiplier: NEW_CASE_SIZE }
      if (newMoq !== currentMoq) body.minimum_order_quantity = newMoq

      // Fix short_description if too long
      const shortDesc = raw.short_description as string | undefined
      if (shortDesc && shortDesc.length > 75) {
        body.short_description = shortDesc.slice(0, 72) + "..."
      }

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
        if (fail < 3) console.log(`  ❌ ${p.faire_product_id}: ${err.slice(0, 150)}`)
        fail++
      }
      await new Promise(r => setTimeout(r, 80))
    }

    console.log(`  ✅ ${ok} updated, ❌ ${fail} failed`)
    totalOk += ok
    totalFail += fail
  }

  console.log(`\n=== DONE: ${totalOk} updated, ${totalFail} failed ===`)
}

main().catch(console.error)
