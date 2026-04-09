/**
 * Delete and recreate dumpling products on 3 stores (not Buddha Yoga)
 * with 3 variants: Regular, Rainbow, Crystal
 * Images stored in Supabase, referenced by URL in Faire listing
 */

const BASE_URL = "https://www.faire.com/external-api/v2"

const IMAGE_URLS = {
  hero: "https://eeoesllyceegmzfqfbyu.supabase.co/storage/v1/object/public/product-variant-images/dumpling-variants/hero.png",
  regular: "https://eeoesllyceegmzfqfbyu.supabase.co/storage/v1/object/public/product-variant-images/dumpling-variants/regular.png",
  rainbow: "https://eeoesllyceegmzfqfbyu.supabase.co/storage/v1/object/public/product-variant-images/dumpling-variants/rainbow.png",
  crystal: "https://eeoesllyceegmzfqfbyu.supabase.co/storage/v1/object/public/product-variant-images/dumpling-variants/crystal.jpeg",
}

interface Store {
  name: string
  oauth: string
  app_creds: string
}

const STORES: Store[] = [
  { name: "Buddha Ayurveda", oauth: "oaa_bj9mtt28nvlusl4tgzudo18a15ncl881haa8jbnb7r7n82eluxe0jgozervcjtufttv1dp9q3rpep7mn6h225k9nq5uha6qk", app_creds: "YXBhX3I0ZGZkdmg1bTY6YTlrazZmYjZ2MzJqcThnaXJuczI1bHhtczk4OHpyNHpoMjB2ODAyeWNub3BkZmczeDYxd283enNrbnF1anUwNnE1ZnR1eG05eHV5ZDI5ZXduc2hzYXh6ZXcwazc4bmowY3N4YQ==" },
  { name: "Super Santa", oauth: "oaa_dvy7nszzh0ndm13a1yus7jun2afhcepz6xmpa5unsx69b2gu52bdm85d97o18o9txrfppii89evb3w2hzto9jc4got2ejxou", app_creds: "YXBhXzR3OHo2bThnN2Q6Ynp0cnJnMHkwcDlpa2swdWdpMGYycGE1djhld2o5YXAwcjF1cnRuYmg5d2IxZ3YwdWsyeWdvdXVmMnR5dWd5ZTVya3p1bms3Y2FxOTVndW1rZ2Zrb2hkNmo1MjN4bGVhZTlqdw==" },
  { name: "Toyarina", oauth: "oaa_dg8aks8omlj16gprazok5v6uy8gdkgpbiwm4gy13ddjbq7xbtbb4f4xm82jzo07q8atz4gfwb5hdeiarhe66psl1fa7xhsk9", app_creds: "YXBhX2pkd2RkOHNnOWg6YTVsc3l0NGUwZnhzNWFpbDE2aGYyazUydHZtcDU2aTl6cnVldzA3dmtmbTh0aGRiYmNleDNqMjdtbGRha2dpN3ZnbjMzeXZ1YjNqYmJvYXpoeDd4YmQ0MXhmMnJlamhzcmt5bw==" },
]

// Products to delete (created earlier without variants)
const TO_DELETE: Record<string, string[]> = {
  "Buddha Ayurveda": ["p_jkuttppye2", "p_5u9czcra96"],
  "Super Santa": ["p_kkmcb2f97n", "p_n5c2n63c22"],
  "Toyarina": ["p_fe7uq6mthg", "p_pzc7nz6udv"],
}

function makeVariants(wsCents: number, retailCents: number, productSlug: string) {
  return ["Regular", "Rainbow", "Crystal"].map((name, i) => ({
    name,
    idempotence_token: `${productSlug}-${name.toLowerCase()}-${Date.now()}-${i}`,
    prices: [{
      wholesale_price: { currency: "USD", amount_minor: wsCents },
      retail_price: { currency: "USD", amount_minor: retailCents },
      geo_constraint: { country: "USA" },
    }],
    available_quantity: 10000,
    options: [{ name: "Style", value: name }],
    images: [{ url: [IMAGE_URLS.regular, IMAGE_URLS.rainbow, IMAGE_URLS.crystal][i] }],
  }))
}

const PRODUCT_TEMPLATES = [
  {
    slug: "glimmer-dough",
    name: "Glimmer-Dough Dumpling: Viral ASMR Desk Pet & Stress Relief",
    description: "The Ultimate Tactile Escape for Modern Desks\nMeet the Glimmer-Dough Dumpling in 3 styles: Regular, Rainbow, and Crystal! Each variant offers a unique tactile experience.\n\nPremium Quality & Material: Non-toxic, BPA-free TPR Cloud-Dough with micro-glitter.\nSize: Standard 3-inch Dumpling.\nCase Pack: 12 units.",
    short_description: "Viral ASMR Desk Pet in 3 styles — Regular, Rainbow & Crystal",
    ws_cents: 399,
    retail_cents: 798,
    taxonomy_type: { id: "tt_7gm89uja9o", name: "Stress Relief Ball/Dough" },
    made_in_country: "USA",
    tariff_code: "950300",
  },
  {
    slug: "glitter-bao",
    name: "Glitter Bao Bun Squishy - Mystery Steamed Dumpling Fidget",
    description: "The Internet's Favorite Squeeze in 3 variants: Regular, Rainbow & Crystal!\nPremium high-rebound TPR with water-drop transparency and shimmering sequins.\n\nQuality: Non-toxic, eco-friendly TPR with anti-dust coating.\nSize: 3-inch realistic Bao Bun.\nCase Pack: 12 units.",
    short_description: "Crystal Glitter Bao Bun Squishy in 3 styles",
    ws_cents: 299,
    retail_cents: 598,
    taxonomy_type: { id: "tt_c2suf3d431", name: "Squishy Toy - Kids & Baby" },
    made_in_country: "CHN",
    tariff_code: "950300",
  },
]

async function deleteProduct(store: Store, productId: string) {
  const res = await fetch(`${BASE_URL}/products/${productId}`, {
    method: "DELETE",
    headers: {
      "X-FAIRE-OAUTH-ACCESS-TOKEN": store.oauth,
      "X-FAIRE-APP-CREDENTIALS": store.app_creds,
    },
  })
  return res.ok || res.status === 404
}

async function createProduct(store: Store, template: typeof PRODUCT_TEMPLATES[0]) {
  const idToken = `${template.slug}-${store.name.toLowerCase().replace(/\s/g, "-")}-${Date.now()}`

  const body = {
    idempotence_token: idToken,
    name: template.name,
    description: template.description,
    short_description: template.short_description,
    minimum_order_quantity: 12,
    unit_multiplier: 1,
    made_in_country: template.made_in_country,
    taxonomy_type: template.taxonomy_type,
    allow_sales_when_out_of_stock: false,
    per_style_minimum_order_quantity: 0,
    variant_option_sets: [{
      name: "Style",
      values: ["Regular", "Rainbow", "Crystal"],
    }],
    images: [
      { url: IMAGE_URLS.hero, tags: ["Hero"], sequence: 0 },
      { url: IMAGE_URLS.regular, tags: ["Product"], sequence: 1 },
      { url: IMAGE_URLS.rainbow, tags: ["Product"], sequence: 2 },
      { url: IMAGE_URLS.crystal, tags: ["Product"], sequence: 3 },
    ],
    variants: makeVariants(template.ws_cents, template.retail_cents, idToken),
  }

  const res = await fetch(`${BASE_URL}/products`, {
    method: "POST",
    headers: {
      "X-FAIRE-OAUTH-ACCESS-TOKEN": store.oauth,
      "X-FAIRE-APP-CREDENTIALS": store.app_creds,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  if (res.ok) {
    const data = JSON.parse(text)
    return { success: true, id: data.id, variants: data.variants?.length ?? 0 }
  } else {
    return { success: false, error: text.slice(0, 200) }
  }
}

async function main() {
  console.log("=== Step 1: Delete old single-variant products ===")
  for (const store of STORES) {
    const ids = TO_DELETE[store.name] || []
    for (const id of ids) {
      const ok = await deleteProduct(store, id)
      console.log(`  ${ok ? "✅" : "❌"} Deleted ${id} from ${store.name}`)
    }
  }

  await new Promise(r => setTimeout(r, 1000))

  console.log("\n=== Step 2: Create products with 3 variants ===")
  const results = []

  for (const store of STORES) {
    for (const template of PRODUCT_TEMPLATES) {
      console.log(`\n📦 Creating ${template.slug} on ${store.name}`)
      console.log(`   Variants: Regular ($${(template.ws_cents/100).toFixed(2)}), Rainbow ($${(template.ws_cents/100).toFixed(2)}), Crystal ($${(template.ws_cents/100).toFixed(2)})`)
      console.log(`   Case size: 12`)

      const result = await createProduct(store, template)
      if (result.success) {
        console.log(`   ✅ Created: ${result.id} with ${result.variants} variants`)
      } else {
        console.log(`   ❌ Failed: ${result.error}`)
      }
      results.push({ store: store.name, product: template.slug, ...result })
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log("\n=== SUMMARY ===")
  const ok = results.filter(r => r.success)
  const fail = results.filter(r => !r.success)
  console.log(`✅ ${ok.length} created with variants`)
  console.log(`❌ ${fail.length} failed`)
  for (const r of results) {
    console.log(`  ${r.success ? "✅" : "❌"} ${r.store} — ${r.product}${r.success ? ` (${r.id})` : ""}`)
  }
}

main().catch(console.error)
