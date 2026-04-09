/**
 * Send dumpling product announcement to all active retailers
 * via SMS and WhatsApp using Twilio
 *
 * Usage:
 *   npx tsx scripts/send-dumpling-outreach.ts --preview     # Preview messages (no sending)
 *   npx tsx scripts/send-dumpling-outreach.ts --send 5      # Send to first 5 retailers
 *   npx tsx scripts/send-dumpling-outreach.ts --send all    # Send to ALL active retailers
 */

import { createClient } from "@supabase/supabase-js"
import twilio from "twilio"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)
const FROM_PHONE = process.env.TWILIO_PHONE_NUMBER!

// Map: faire_store_id (in retailer.store_ids) → brand name + Faire product ID
const STORE_MAP: Record<string, { brand: string; productId: string }> = {
  "53a6542d-b961-4659-bca8-963c34df4f7e": { brand: "Buddha Ayurveda", productId: "p_bkwu8w5kft" },
  "a79180f3-53f5-4a76-b7aa-3d175ca439d8": { brand: "Buddha Yoga", productId: "p_bfhgd9kh7b" },
  "ec25a5cd-3455-4953-81a5-1acae4810573": { brand: "Super Santa", productId: "p_xw24cvpeq6" },
  "6916785c-ccec-4c22-9587-464b5d9bd24d": { brand: "Toyarina", productId: "p_2kr87rw4gw" },
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return `+${digits}`
}

function buildMessage(retailerName: string, brandName: string, productId: string): string {
  const link = `https://www.faire.com/product/${productId}`
  return `Hi ${retailerName}! Just listed: Dumpling Squishies NOW IN STOCK at ${brandName} - the #1 trending fidget toy! 3 styles: Regular, Rainbow & Crystal. Cheapest wholesale on Faire, case of 12. Shop now: ${link}`
}

async function sendSMS(to: string, body: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  try {
    const msg = await twilioClient.messages.create({ body, from: FROM_PHONE, to })
    return { ok: true, sid: msg.sid }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

async function sendWhatsApp(to: string, body: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  try {
    const msg = await twilioClient.messages.create({
      body,
      from: `whatsapp:${FROM_PHONE}`,
      to: `whatsapp:${to}`,
    })
    return { ok: true, sid: msg.sid }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const isPreview = args.includes("--preview") || args.length === 0
  const sendArg = args.find(a => a !== "--send" && args[args.indexOf(a) - 1] === "--send")
  const sendLimit = sendArg === "all" ? 99999 : parseInt(sendArg || "5", 10)

  console.log(`\n=== Dumpling Product Outreach ===`)
  console.log(`Mode: ${isPreview ? "PREVIEW (no messages sent)" : `SEND (limit: ${sendLimit})`}`)

  // Fetch retailers
  const { data: retailers } = await supabase
    .from("faire_retailers")
    .select("id, name, company_name, phone, total_orders, store_ids")
    .gt("total_orders", 0)
    .not("phone", "is", null)
    .neq("phone", "")
    .order("total_orders", { ascending: false })
    .limit(isPreview ? 5 : sendLimit)

  const list = retailers ?? []
  console.log(`Retailers to contact: ${list.length}`)

  let smsSent = 0, smsErr = 0, waSent = 0, waErr = 0

  for (let i = 0; i < list.length; i++) {
    const r = list[i]
    const storeIds = (r.store_ids ?? []) as string[]
    const storeInfo = STORE_MAP[storeIds[0]]
    if (!storeInfo) {
      console.log(`  ⏭ ${r.company_name || r.name} — unknown store, skipping`)
      continue
    }

    const name = r.company_name || r.name || "there"
    const phone = formatPhone(r.phone)
    const message = buildMessage(name, storeInfo.brand, storeInfo.productId)

    console.log(`\n[${i + 1}/${list.length}] ${name} (${phone}) — ${storeInfo.brand}`)

    if (isPreview) {
      console.log(`  📱 SMS: ${message.slice(0, 80)}...`)
      console.log(`  💬 WA:  ${message.slice(0, 80)}...`)
      continue
    }

    // Send SMS
    const smsResult = await sendSMS(phone, message)
    if (smsResult.ok) {
      smsSent++
      console.log(`  📱 SMS sent (${smsResult.sid})`)
    } else {
      smsErr++
      console.log(`  📱 SMS failed: ${smsResult.error?.slice(0, 80)}`)
    }

    // Send WhatsApp
    const waResult = await sendWhatsApp(phone, message)
    if (waResult.ok) {
      waSent++
      console.log(`  💬 WA sent (${waResult.sid})`)
    } else {
      waErr++
      console.log(`  💬 WA failed: ${waResult.error?.slice(0, 80)}`)
    }

    // Log to DB
    await supabase.from("sms_logs").insert([
      { to_number: phone, to_name: name, channel: "sms", body: message, status: smsResult.ok ? "sent" : "failed" },
      { to_number: phone, to_name: name, channel: "whatsapp", body: message, status: waResult.ok ? "sent" : "failed" },
    ]).catch(() => {})

    // Rate limit: 200ms between contacts
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`📱 SMS:      ${smsSent} sent, ${smsErr} failed`)
  console.log(`💬 WhatsApp: ${waSent} sent, ${waErr} failed`)
  console.log(`Total contacts: ${list.length}`)
}

main().catch(console.error)
