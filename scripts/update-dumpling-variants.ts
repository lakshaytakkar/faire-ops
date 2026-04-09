/**
 * Update all dumpling products across all 4 stores with 3 variants:
 * Regular, Rainbow, Crystal — using images from uniqueabund.com
 * Same price per variant, uploaded to Supabase storage for Faire image URLs
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

const BASE_URL = "https://www.faire.com/external-api/v2"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Variant images (downloaded from uniqueabund.com)
const VARIANT_IMAGES = {
  regular: { file: "tmp-images/regular.png", contentType: "image/png" },
  rainbow: { file: "tmp-images/rainbow.png", contentType: "image/png" },
  crystal: { file: "tmp-images/crystal.jpeg", contentType: "image/jpeg" },
  hero: { file: "tmp-images/hero.png", contentType: "image/png" },
}

const BUCKET = "product-variant-images"

// All dumpling products across stores
const PRODUCTS = [
  // Buddha Yoga (existing)
  { store: "Buddha Yoga", faire_id: "p_bfhgd9kh7b", name: "Glimmer-Dough Dumpling", ws_cents: 399, retail_cents: 798, oauth: "oaa_1tjenwm4vbqd8eoazoln7fyfnblo3b77vtgucr1jb9vak6obwh7ti8uf4tf0yhd1lscacu2wr3a9i1lzqt41cp9uzrmo0m2t", app_creds: "YXBhX3E4eGE0ZG11djI6OHBuNW5mZXJjenhkYnJzODVubzBzc2Z1cGNheDY2NmtpOGFhZTVlOWIwcXJ1bjc4NjY3b3Y1eXphOHg2cjd5b2s4OGFmaWw3MnVwOHVzbnMzeG0ydjgxc3A1YXdxcmxuN2RncA==" },
  { store: "Buddha Yoga", faire_id: "p_4j3vfgqzdq", name: "Glitter Bao Bun Squishy", ws_cents: 399, retail_cents: 798, oauth: "oaa_1tjenwm4vbqd8eoazoln7fyfnblo3b77vtgucr1jb9vak6obwh7ti8uf4tf0yhd1lscacu2wr3a9i1lzqt41cp9uzrmo0m2t", app_creds: "YXBhX3E4eGE0ZG11djI6OHBuNW5mZXJjenhkYnJzODVubzBzc2Z1cGNheDY2NmtpOGFhZTVlOWIwcXJ1bjc4NjY3b3Y1eXphOHg2cjd5b2s4OGFmaWw3MnVwOHVzbnMzeG0ydjgxc3A1YXdxcmxuN2RncA==" },
  // Buddha Ayurveda (just created)
  { store: "Buddha Ayurveda", faire_id: "p_jkuttppye2", name: "Glimmer-Dough Dumpling", ws_cents: 399, retail_cents: 798, oauth: "oaa_bj9mtt28nvlusl4tgzudo18a15ncl881haa8jbnb7r7n82eluxe0jgozervcjtufttv1dp9q3rpep7mn6h225k9nq5uha6qk", app_creds: "YXBhX3I0ZGZkdmg1bTY6YTlrazZmYjZ2MzJqcThnaXJuczI1bHhtczk4OHpyNHpoMjB2ODAyeWNub3BkZmczeDYxd283enNrbnF1anUwNnE1ZnR1eG05eHV5ZDI5ZXduc2hzYXh6ZXcwazc4bmowY3N4YQ==" },
  { store: "Buddha Ayurveda", faire_id: "p_5u9czcra96", name: "Glitter Bao Bun Squishy", ws_cents: 299, retail_cents: 598, oauth: "oaa_bj9mtt28nvlusl4tgzudo18a15ncl881haa8jbnb7r7n82eluxe0jgozervcjtufttv1dp9q3rpep7mn6h225k9nq5uha6qk", app_creds: "YXBhX3I0ZGZkdmg1bTY6YTlrazZmYjZ2MzJqcThnaXJuczI1bHhtczk4OHpyNHpoMjB2ODAyeWNub3BkZmczeDYxd283enNrbnF1anUwNnE1ZnR1eG05eHV5ZDI5ZXduc2hzYXh6ZXcwazc4bmowY3N4YQ==" },
  // Super Santa
  { store: "Super Santa", faire_id: "p_kkmcb2f97n", name: "Glimmer-Dough Dumpling", ws_cents: 399, retail_cents: 798, oauth: "oaa_dvy7nszzh0ndm13a1yus7jun2afhcepz6xmpa5unsx69b2gu52bdm85d97o18o9txrfppii89evb3w2hzto9jc4got2ejxou", app_creds: "YXBhXzR3OHo2bThnN2Q6Ynp0cnJnMHkwcDlpa2swdWdpMGYycGE1djhld2o5YXAwcjF1cnRuYmg5d2IxZ3YwdWsyeWdvdXVmMnR5dWd5ZTVya3p1bms3Y2FxOTVndW1rZ2Zrb2hkNmo1MjN4bGVhZTlqdw==" },
  { store: "Super Santa", faire_id: "p_n5c2n63c22", name: "Glitter Bao Bun Squishy", ws_cents: 299, retail_cents: 598, oauth: "oaa_dvy7nszzh0ndm13a1yus7jun2afhcepz6xmpa5unsx69b2gu52bdm85d97o18o9txrfppii89evb3w2hzto9jc4got2ejxou", app_creds: "YXBhXzR3OHo2bThnN2Q6Ynp0cnJnMHkwcDlpa2swdWdpMGYycGE1djhld2o5YXAwcjF1cnRuYmg5d2IxZ3YwdWsyeWdvdXVmMnR5dWd5ZTVya3p1bms3Y2FxOTVndW1rZ2Zrb2hkNmo1MjN4bGVhZTlqdw==" },
  // Toyarina
  { store: "Toyarina", faire_id: "p_fe7uq6mthg", name: "Glimmer-Dough Dumpling", ws_cents: 399, retail_cents: 798, oauth: "oaa_dg8aks8omlj16gprazok5v6uy8gdkgpbiwm4gy13ddjbq7xbtbb4f4xm82jzo07q8atz4gfwb5hdeiarhe66psl1fa7xhsk9", app_creds: "YXBhX2pkd2RkOHNnOWg6YTVsc3l0NGUwZnhzNWFpbDE2aGYyazUydHZtcDU2aTl6cnVldzA3dmtmbTh0aGRiYmNleDNqMjdtbGRha2dpN3ZnbjMzeXZ1YjNqYmJvYXpoeDd4YmQ0MXhmMnJlamhzcmt5bw==" },
  { store: "Toyarina", faire_id: "p_pzc7nz6udv", name: "Glitter Bao Bun Squishy", ws_cents: 299, retail_cents: 598, oauth: "oaa_dg8aks8omlj16gprazok5v6uy8gdkgpbiwm4gy13ddjbq7xbtbb4f4xm82jzo07q8atz4gfwb5hdeiarhe66psl1fa7xhsk9", app_creds: "YXBhX2pkd2RkOHNnOWg6YTVsc3l0NGUwZnhzNWFpbDE2aGYyazUydHZtcDU2aTl6cnVldzA3dmtmbTh0aGRiYmNleDNqMjdtbGRha2dpN3ZnbjMzeXZ1YjNqYmJvYXpoeDd4YmQ0MXhmMnJlamhzcmt5bw==" },
]

async function uploadImages(): Promise<Record<string, string>> {
  console.log("=== Uploading variant images to Supabase Storage ===")

  // Ensure bucket exists
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {})

  const urls: Record<string, string> = {}

  for (const [name, info] of Object.entries(VARIANT_IMAGES)) {
    const filePath = path.resolve(info.file)
    const buffer = fs.readFileSync(filePath)
    const storagePath = `dumpling-variants/${name}.${info.contentType.split("/")[1]}`

    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: info.contentType,
      upsert: true,
    })

    if (error) {
      console.log(`  ❌ Failed to upload ${name}: ${error.message}`)
    } else {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
      urls[name] = data.publicUrl
      console.log(`  ✅ ${name}: ${data.publicUrl}`)
    }
  }

  return urls
}

async function updateProduct(product: typeof PRODUCTS[0], imageUrls: Record<string, string>) {
  console.log(`\n📦 Updating ${product.name} on ${product.store} (${product.faire_id})`)

  // First, get current product to get existing variant IDs
  const getRes = await fetch(`${BASE_URL}/products/${product.faire_id}`, {
    headers: {
      "X-FAIRE-OAUTH-ACCESS-TOKEN": product.oauth,
      "X-FAIRE-APP-CREDENTIALS": product.app_creds,
      "Content-Type": "application/json",
    },
  })

  if (!getRes.ok) {
    console.log(`  ❌ Failed to get product: ${getRes.status}`)
    return false
  }

  const current = await getRes.json()
  const existingVariants = current.variants || []

  // Build variant option set for 3 styles
  const variantOptions = ["Regular", "Rainbow", "Crystal"]
  const variantImages = [imageUrls.regular, imageUrls.rainbow, imageUrls.crystal]

  // Build updated product with 3 variants
  const updateBody: Record<string, unknown> = {
    variant_option_sets: [{
      name: "Style",
      options: variantOptions.map(v => ({ name: v })),
    }],
    images: [
      { url: imageUrls.hero, tags: ["Hero"], sequence: 0 },
      { url: imageUrls.regular, tags: ["Product"], sequence: 1 },
      { url: imageUrls.rainbow, tags: ["Product"], sequence: 2 },
      { url: imageUrls.crystal, tags: ["Product"], sequence: 3 },
    ],
    variants: variantOptions.map((name, i) => {
      const existing = existingVariants[i]
      const base: Record<string, unknown> = {
        name,
        prices: [{
          wholesale_price: { currency: "USD", amount_minor: product.ws_cents },
          retail_price: { currency: "USD", amount_minor: product.retail_cents },
          geo_constraint: { country: "USA" },
        }],
        available_quantity: 10000,
        options: [{ name: "Style", value: name }],
        images: [{ url: variantImages[i] }],
      }
      // Include existing variant ID if updating, or idempotence_token if creating
      if (existing?.id) {
        base.id = existing.id
      } else {
        base.idempotence_token = `${product.faire_id}-variant-${name.toLowerCase()}-${Date.now()}`
      }
      return base
    }),
  }

  const putRes = await fetch(`${BASE_URL}/products/${product.faire_id}`, {
    method: "PATCH",
    headers: {
      "X-FAIRE-OAUTH-ACCESS-TOKEN": product.oauth,
      "X-FAIRE-APP-CREDENTIALS": product.app_creds,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateBody),
  })

  const text = await putRes.text()
  if (putRes.ok) {
    const data = JSON.parse(text)
    const varCount = data.variants?.length ?? 0
    console.log(`  ✅ Updated — ${varCount} variants`)
    return true
  } else {
    console.log(`  ❌ Failed (${putRes.status}): ${text.slice(0, 300)}`)
    return false
  }
}

async function main() {
  // Step 1: Upload images
  const imageUrls = await uploadImages()
  if (Object.keys(imageUrls).length < 4) {
    console.log("❌ Not all images uploaded. Aborting.")
    return
  }

  // Step 2: Update all products
  console.log(`\n=== Updating ${PRODUCTS.length} products with 3 variants each ===`)

  let success = 0
  let failed = 0

  for (const product of PRODUCTS) {
    const ok = await updateProduct(product, imageUrls)
    if (ok) success++; else failed++
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n=== DONE ===`)
  console.log(`✅ ${success} updated`)
  console.log(`❌ ${failed} failed`)
}

main().catch(console.error)
