import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

// Store IDs (faire_store_id in retailers.store_ids) → brand page + product IDs
const STORE_MAP: Record<string, { brand: string; productId: string }> = {
  // Buddha Ayurveda (faire_store_id in retailers table)
  "53a6542d-b961-4659-bca8-963c34df4f7e": { brand: "Buddha Ayurveda", productId: "p_bkwu8w5kft" },
  // Buddha Yoga
  "a79180f3-53f5-4a76-b7aa-3d175ca439d8": { brand: "Buddha Yoga", productId: "p_bfhgd9kh7b" },
  // Super Santa
  "ec25a5cd-3455-4953-81a5-1acae4810573": { brand: "Super Santa", productId: "p_xw24cvpeq6" },
  // Toyarina
  "6916785c-ccec-4c22-9587-464b5d9bd24d": { brand: "Toyarina", productId: "p_2kr87rw4gw" },
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return `+${digits}`
}

function buildMessage(retailerName: string, brandName: string, productId: string): string {
  const faireLink = `https://www.faire.com/product/${productId}`
  return `Hi ${retailerName}! 🎉 Just listed: Dumpling Squishies are NOW IN STOCK at ${brandName} — the viral #1 trending fidget toy! 3 styles: Regular, Rainbow & Crystal. Cheapest wholesale price on Faire. Case pack 12. Shop now: ${faireLink}`
}

export async function POST(request: Request) {
  const supabase = getSupabase()
  const { mode = "preview", limit = 5, channel = "both" } = await request.json().catch(() => ({}))

  // Fetch active retailers with phones
  const { data: retailers } = await supabase
    .from("faire_retailers")
    .select("id, name, company_name, phone, total_orders, store_ids")
    .gt("total_orders", 0)
    .not("phone", "is", null)
    .order("total_orders", { ascending: false })
    .limit(mode === "preview" ? 5 : (limit || 1072))

  if (!retailers || retailers.length === 0) {
    return NextResponse.json({ error: "No retailers found" }, { status: 404 })
  }

  const results: Array<{ retailer: string; phone: string; brand: string; sms?: string; whatsapp?: string }> = []

  for (const r of retailers) {
    const storeIds = (r.store_ids ?? []) as string[]
    const primaryStoreId = storeIds[0]
    const storeInfo = STORE_MAP[primaryStoreId]

    if (!storeInfo) continue

    const name = r.company_name || r.name || "there"
    const phone = formatPhone(r.phone)
    const message = buildMessage(name, storeInfo.brand, storeInfo.productId)

    const entry: typeof results[0] = { retailer: name, phone, brand: storeInfo.brand }

    if (mode === "preview") {
      entry.sms = `[PREVIEW] ${message}`
      entry.whatsapp = `[PREVIEW] ${message}`
    } else {
      // Send SMS
      if (channel === "sms" || channel === "both") {
        try {
          const smsRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? "" : ""}http://localhost:3000/api/sms/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to_number: phone, to_name: name, channel: "sms", body_override: message }),
          })
          const smsData = await smsRes.json()
          entry.sms = smsData.success ? "sent" : smsData.error
        } catch (err) {
          entry.sms = (err as Error).message
        }
      }

      // Send WhatsApp
      if (channel === "whatsapp" || channel === "both") {
        try {
          const waRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? "" : ""}http://localhost:3000/api/sms/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to_number: phone, to_name: name, channel: "whatsapp", body_override: message }),
          })
          const waData = await waRes.json()
          entry.whatsapp = waData.success ? "sent" : waData.error
        } catch (err) {
          entry.whatsapp = (err as Error).message
        }
      }

      // Delay between sends to avoid rate limiting
      await new Promise(r => setTimeout(r, 200))
    }

    results.push(entry)

    // Log to sms_logs
    await supabase.from("sms_logs").insert({
      to_number: phone,
      to_name: name,
      channel: "sms",
      body: message,
      status: mode === "preview" ? "preview" : "sent",
      template_id: null,
    })
  }

  return NextResponse.json({
    mode,
    total: results.length,
    channel,
    results,
  })
}
