import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createHmac } from "crypto"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

function getHqClient() {
  return createClient(supabaseUrl, supabaseKey, { db: { schema: "hq" } })
}

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? ""
  if (!secret) return false
  const expected = createHmac("sha256", secret).update(body).digest("hex")
  return expected === signature
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-razorpay-signature") ?? ""

  // Verify webhook signature if secret is configured
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (webhookSecret && !verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  const event = payload.event as string
  const entity = payload.payload?.[Object.keys(payload.payload ?? {})[0]]?.entity

  const hq = getHqClient()

  // Log the raw webhook event
  await hq.from("razorpay_webhook_events").insert({
    event_type: event,
    entity_type: entity?.entity,
    entity_id: entity?.id,
    payload,
  })

  // Process known events and upsert into corresponding tables
  try {
    switch (event) {
      case "payment.authorized":
      case "payment.captured":
      case "payment.failed": {
        const p = payload.payload?.payment?.entity
        if (p) {
          await hq.from("razorpay_payments").upsert({
            id: p.id, amount: p.amount, currency: p.currency, status: p.status,
            method: p.method, order_id: p.order_id, invoice_id: p.invoice_id,
            description: p.description, international: p.international, captured: p.captured,
            amount_refunded: p.amount_refunded, refund_status: p.refund_status,
            email: p.email, contact: p.contact, customer_id: p.customer_id,
            card_id: p.card_id, card: p.card, bank: p.bank, vpa: p.vpa, wallet: p.wallet,
            fee: p.fee, tax: p.tax, error_code: p.error_code,
            error_description: p.error_description, notes: p.notes,
            acquirer_data: p.acquirer_data, created_at: p.created_at,
            synced_at: new Date().toISOString(),
          }, { onConflict: "id" })
        }
        break
      }

      case "order.paid": {
        const o = payload.payload?.order?.entity
        if (o) {
          await hq.from("razorpay_orders").upsert({
            id: o.id, amount: o.amount, amount_paid: o.amount_paid, amount_due: o.amount_due,
            currency: o.currency, receipt: o.receipt, status: o.status, attempts: o.attempts,
            notes: o.notes, created_at: o.created_at, synced_at: new Date().toISOString(),
          }, { onConflict: "id" })
        }
        break
      }

      case "refund.created":
      case "refund.processed":
      case "refund.failed": {
        const r = payload.payload?.refund?.entity
        if (r) {
          await hq.from("razorpay_refunds").upsert({
            id: r.id, amount: r.amount, currency: r.currency, payment_id: r.payment_id,
            notes: r.notes, receipt: r.receipt, status: r.status,
            speed_requested: r.speed_requested, speed_processed: r.speed_processed,
            acquirer_data: r.acquirer_data, created_at: r.created_at,
            synced_at: new Date().toISOString(),
          }, { onConflict: "id" })
        }
        break
      }

      case "settlement.processed": {
        const s = payload.payload?.settlement?.entity
        if (s) {
          await hq.from("razorpay_settlements").upsert({
            id: s.id, amount: s.amount, status: s.status, fees: s.fees,
            tax: s.tax, utr: s.utr, created_at: s.created_at,
            synced_at: new Date().toISOString(),
          }, { onConflict: "id" })
        }
        break
      }

      case "payment_link.paid":
      case "payment_link.partially_paid":
      case "payment_link.cancelled":
      case "payment_link.expired": {
        const l = payload.payload?.payment_link?.entity
        if (l) {
          await hq.from("razorpay_payment_links").upsert({
            id: l.id, amount: l.amount, currency: l.currency, amount_paid: l.amount_paid,
            description: l.description, short_url: l.short_url, status: l.status,
            created_at: l.created_at, updated_at: l.updated_at,
            synced_at: new Date().toISOString(),
          }, { onConflict: "id" })
        }
        break
      }

      case "invoice.paid":
      case "invoice.partially_paid":
      case "invoice.expired": {
        const inv = payload.payload?.invoice?.entity
        if (inv) {
          await hq.from("razorpay_invoices").upsert({
            id: inv.id, status: inv.status, amount_paid: inv.amount_paid,
            amount_due: inv.amount_due, paid_at: inv.paid_at,
            synced_at: new Date().toISOString(),
          }, { onConflict: "id" })
        }
        break
      }

      case "subscription.charged":
      case "subscription.activated":
      case "subscription.completed":
      case "subscription.halted":
      case "subscription.cancelled":
      case "subscription.paused":
      case "subscription.resumed": {
        const sub = payload.payload?.subscription?.entity
        if (sub) {
          await hq.from("razorpay_subscriptions").upsert({
            id: sub.id, status: sub.status, paid_count: sub.paid_count,
            remaining_count: sub.remaining_count, current_start: sub.current_start,
            current_end: sub.current_end, charge_at: sub.charge_at,
            ended_at: sub.ended_at, synced_at: new Date().toISOString(),
          }, { onConflict: "id" })
        }
        break
      }

      case "payment.dispute.created":
      case "payment.dispute.won":
      case "payment.dispute.lost":
      case "payment.dispute.closed": {
        const d = payload.payload?.dispute?.entity
        if (d) {
          await hq.from("razorpay_disputes").upsert({
            id: d.id, payment_id: d.payment_id, amount: d.amount, currency: d.currency,
            amount_deducted: d.amount_deducted, reason_code: d.reason_code,
            reason_description: d.reason_description, respond_by: d.respond_by,
            status: d.status, phase: d.phase, created_at: d.created_at,
            synced_at: new Date().toISOString(),
          }, { onConflict: "id" })
        }
        break
      }

      case "payout.processed":
      case "payout.reversed":
      case "payout.failed":
      case "payout.pending":
      case "payout.queued": {
        const po = payload.payload?.payout?.entity
        if (po) {
          await hq.from("razorpay_payouts").upsert({
            id: po.id, fund_account_id: po.fund_account_id, amount: po.amount,
            currency: po.currency, mode: po.mode, purpose: po.purpose,
            utr: po.utr, status: po.status, fees: po.fees, tax: po.tax,
            status_details: po.status_details, created_at: po.created_at,
            synced_at: new Date().toISOString(),
          }, { onConflict: "id" })
        }
        break
      }
    }

    // Mark as processed
    await hq.from("razorpay_webhook_events")
      .update({ processed: true })
      .eq("entity_id", entity?.id)
      .eq("event_type", event)

  } catch (err) {
    await hq.from("razorpay_webhook_events")
      .update({ error: (err as Error).message })
      .eq("entity_id", entity?.id)
      .eq("event_type", event)
  }

  return NextResponse.json({ ok: true })
}
