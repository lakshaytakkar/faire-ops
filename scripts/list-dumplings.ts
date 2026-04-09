/**
 * List dumpling products on Buddha Ayurveda, Super Santa, and Toyarina
 * Products already exist on Buddha Yoga — copy them with $1 price reduction and case size 12
 */

const BASE_URL = "https://www.faire.com/external-api/v2"

interface Store {
  id: string
  name: string
  oauth_token: string
  app_credentials: string
}

const stores: Store[] = [
  {
    id: "20d280a5-2075-4d6f-b8f5-b73a741dd053",
    name: "Buddha Ayurveda",
    oauth_token: "oaa_bj9mtt28nvlusl4tgzudo18a15ncl881haa8jbnb7r7n82eluxe0jgozervcjtufttv1dp9q3rpep7mn6h225k9nq5uha6qk",
    app_credentials: "YXBhX3I0ZGZkdmg1bTY6YTlrazZmYjZ2MzJqcThnaXJuczI1bHhtczk4OHpyNHpoMjB2ODAyeWNub3BkZmczeDYxd283enNrbnF1anUwNnE1ZnR1eG05eHV5ZDI5ZXduc2hzYXh6ZXcwazc4bmowY3N4YQ=="
  },
  {
    id: "1acb2d4b-ea7d-421d-b97c-2fb093624b1a",
    name: "Super Santa",
    oauth_token: "oaa_dvy7nszzh0ndm13a1yus7jun2afhcepz6xmpa5unsx69b2gu52bdm85d97o18o9txrfppii89evb3w2hzto9jc4got2ejxou",
    app_credentials: "YXBhXzR3OHo2bThnN2Q6Ynp0cnJnMHkwcDlpa2swdWdpMGYycGE1djhld2o5YXAwcjF1cnRuYmg5d2IxZ3YwdWsyeWdvdXVmMnR5dWd5ZTVya3p1bms3Y2FxOTVndW1rZ2Zrb2hkNmo1MjN4bGVhZTlqdw=="
  },
  {
    id: "3cd89237-2ee2-4388-9914-5ddd94323313",
    name: "Toyarina",
    oauth_token: "oaa_dg8aks8omlj16gprazok5v6uy8gdkgpbiwm4gy13ddjbq7xbtbb4f4xm82jzo07q8atz4gfwb5hdeiarhe66psl1fa7xhsk9",
    app_credentials: "YXBhX2pkd2RkOHNnOWg6YTVsc3l0NGUwZnhzNWFpbDE2aGYyazUydHZtcDU2aTl6cnVldzA3dmtmbTh0aGRiYmNleDNqMjdtbGRha2dpN3ZnbjMzeXZ1YjNqYmJvYXpoeDd4YmQ0MXhmMnJlamhzcmt5bw=="
  }
]

// Product 1: Glimmer-Dough Dumpling
// Original: wholesale $4.99, retail $9.98 → New: wholesale $3.99, retail $7.98
const product1 = {
  name: "Glimmer-Dough Dumpling: Viral ASMR Desk Pet & Stress Relief",
  description: "The Ultimate Tactile Escape for Modern Desks\nMeet the Glimmer-Dough Dumpling—the viral sensory sensation taking US boutiques by storm. Designed to bridge the gap between playful fidget and sophisticated stress relief, this isn't just a toy; it's an essential \"desk pet\" for the 2026 workforce and sensory-seeking students alike.\n\nPremium Quality & Material\nCrafted from high-density, hypoallergenic TPR \"Cloud-Dough\" infused with micro-glitter.\n\nSize: Standard 3-inch \"Chef's Choice\" Dumpling.\nMaterial: Non-toxic, BPA-free, easy-clean silicone-composite.\nFinish: Integrated \"Smile\" engraving with internal holographic shimmer.",
  short_description: "The Ultimate Tactile Escape for Modern Desks",
  minimum_order_quantity: 12,
  unit_multiplier: 1,
  made_in_country: "USA",
  taxonomy_type: { id: "tt_7gm89uja9o", name: "Stress Relief Ball/Dough" },
  images: [
    { url: "https://cdn.faire.com/fastly/36cbc0c81ec0ba5cb701e4cf8b891f416d0b9f525890481bb259628f3b0ae04f.png", tags: ["Hero"], sequence: 0 },
    { url: "https://cdn.faire.com/fastly/470b93d46227b1d0f5b7f8e39a7ae0b8924cf01430a937d1f481f5fc631f3ef3.png", tags: ["Product"], sequence: 1 }
  ],
  variants: [{
    name: "default",
    prices: [{
      wholesale_price: { currency: "USD", amount_minor: 399 },
      retail_price: { currency: "USD", amount_minor: 798 },
      geo_constraint: { country: "USA" }
    }],
    available_quantity: 10000,
    tariff_code: "950300"
  }],
  allow_sales_when_out_of_stock: false,
  per_style_minimum_order_quantity: 0
}

// Product 2: Glitter Bao Bun Squishy
// Original: wholesale $3.99, retail $7.98 → New: wholesale $2.99, retail $5.98
const product2 = {
  name: "Glitter Bao Bun Squishy - Mystery Steamed Dumpling Fidget",
  description: "The Internet's Favorite Squeeze – Now in Crystal Glitter!\nTap into the viral #DumplingSquish craze with our 2026 Crystal Edition Bao Buns. Each dumpling is crafted from premium, high-rebound TPR with a unique \"water-drop\" transparency, filled with shimmering sequins and mesmerizing glitter.\n\nQuality & Material: Non-toxic, eco-friendly TPR with anti-dust coating and PET sequins.\nSize: 3-inch realistic Bao Bun size.\nBest For: Toy stores, candy shops, trendy lifestyle boutiques, and college bookstores.",
  short_description: "The Internet's Favorite Squeeze – Now in Crystal Glitter!",
  minimum_order_quantity: 12,
  unit_multiplier: 1,
  made_in_country: "CHN",
  taxonomy_type: { id: "tt_c2suf3d431", name: "Squishy Toy - Kids & Baby" },
  images: [
    { url: "https://cdn.faire.com/fastly/97e90980e716a3617302bdb00431e9ac98601e423634d38da55a83fe84db6fe2.png", tags: ["Hero"], sequence: 0 },
    { url: "https://cdn.faire.com/fastly/e9cb1518dc9f616ea79e76ae08d21de6bedc33e1be38a8a7257d691d308aa9b0.png", tags: ["Product"], sequence: 1 }
  ],
  variants: [{
    name: "default",
    sku: "Dump-Multi",
    prices: [{
      wholesale_price: { currency: "USD", amount_minor: 299 },
      retail_price: { currency: "USD", amount_minor: 598 },
      geo_constraint: { country: "USA" }
    }],
    available_quantity: 10000,
    tariff_code: "950300",
    measurements: { weight: 0.49, mass_unit: "POUNDS" }
  }],
  allow_sales_when_out_of_stock: false,
  per_style_minimum_order_quantity: 0
}

const products = [product1, product2]

async function listProduct(store: Store, product: typeof product1, index: number) {
  const idempotencyToken = `dumpling-${store.id}-${index}-${Date.now()}`

  console.log(`\n📦 Listing "${product.name}" on ${store.name}`)
  console.log(`   Idempotency token: ${idempotencyToken}`)
  console.log(`   Wholesale: $${(product.variants[0].prices[0].wholesale_price.amount_minor / 100).toFixed(2)}`)
  console.log(`   MOQ (case size): ${product.minimum_order_quantity}`)

  try {
    const res = await fetch(`${BASE_URL}/products`, {
      method: "POST",
      headers: {
        "X-FAIRE-OAUTH-ACCESS-TOKEN": store.oauth_token,
        "X-FAIRE-APP-CREDENTIALS": store.app_credentials,
        "X-FAIRE-IDEMPOTENCY-TOKEN": idempotencyToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...product,
        idempotence_token: idempotencyToken,
        variants: product.variants.map((v: any, vi: number) => ({
          ...v,
          idempotence_token: `${idempotencyToken}-var-${vi}`,
        })),
      }),
    })

    const text = await res.text()
    if (res.ok) {
      const data = JSON.parse(text)
      console.log(`   ✅ SUCCESS — Product ID: ${data.id ?? "created"}`)
      return { store: store.name, product: product.name, success: true, data }
    } else {
      console.log(`   ❌ FAILED (${res.status}): ${text.slice(0, 200)}`)
      return { store: store.name, product: product.name, success: false, error: text.slice(0, 200) }
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${(err as Error).message}`)
    return { store: store.name, product: product.name, success: false, error: (err as Error).message }
  }
}

async function main() {
  console.log("=== Listing Dumpling Products on 3 Stores ===")
  console.log(`Stores: ${stores.map(s => s.name).join(", ")}`)
  console.log(`Products: ${products.length}`)
  console.log(`Price reduction: -$1.00 wholesale, -$2.00 retail`)
  console.log(`Case size: 12`)

  const results = []

  for (const store of stores) {
    for (let i = 0; i < products.length; i++) {
      const result = await listProduct(store, products[i], i)
      results.push(result)
      // Small delay between API calls
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log("\n=== SUMMARY ===")
  const succeeded = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  console.log(`✅ Succeeded: ${succeeded.length}`)
  console.log(`❌ Failed: ${failed.length}`)

  for (const r of results) {
    console.log(`  ${r.success ? "✅" : "❌"} ${r.store} — ${r.product}${r.success ? "" : ` (${r.error})`}`)
  }
}

main().catch(console.error)
