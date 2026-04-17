import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

function getHqClient() {
  return createClient(supabaseUrl, supabaseKey, { db: { schema: "hq" } })
}

const RP_BASE = "https://api.razorpay.com/v1"

function rpHeaders() {
  const keyId = process.env.RAZORPAY_KEY_ID ?? ""
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? ""
  return {
    Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
    "Content-Type": "application/json",
  }
}

async function rpRequest(method: string, endpoint: string, body?: unknown) {
  const res = await fetch(`${RP_BASE}${endpoint}`, {
    method,
    headers: rpHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.description ?? `API error ${res.status}`)
  return data
}

export const maxDuration = 60

export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID
  if (!keyId) return NextResponse.json({ error: "RAZORPAY_KEY_ID not configured" }, { status: 400 })

  const { action, ...params } = await request.json()
  const hq = getHqClient()

  try {
    let result: unknown

    switch (action) {
      // ---- Payments ----
      case "capture_payment": {
        result = await rpRequest("POST", `/payments/${params.payment_id}/capture`, {
          amount: params.amount,
          currency: params.currency ?? "INR",
        })
        // Update local record
        await hq.from("razorpay_payments").update({
          status: "captured", captured: true, synced_at: new Date().toISOString(),
        }).eq("id", params.payment_id)
        break
      }

      // ---- Orders ----
      case "create_order": {
        result = await rpRequest("POST", "/orders", {
          amount: params.amount,
          currency: params.currency ?? "INR",
          receipt: params.receipt,
          notes: params.notes ?? {},
        })
        const o = result as Record<string, unknown>
        await hq.from("razorpay_orders").upsert({
          id: o.id, amount: o.amount, amount_paid: o.amount_paid, amount_due: o.amount_due,
          currency: o.currency, receipt: o.receipt, status: o.status, attempts: o.attempts,
          notes: o.notes, created_at: o.created_at, vertical: params.vertical,
          space_slug: params.space_slug, synced_at: new Date().toISOString(),
        })
        break
      }

      // ---- Refunds ----
      case "create_refund": {
        result = await rpRequest("POST", `/payments/${params.payment_id}/refund`, {
          amount: params.amount,
          speed: params.speed ?? "normal",
          notes: params.notes ?? {},
          receipt: params.receipt,
        })
        const r = result as Record<string, unknown>
        await hq.from("razorpay_refunds").upsert({
          id: r.id, amount: r.amount, currency: r.currency, payment_id: r.payment_id,
          status: r.status, speed_requested: r.speed_requested,
          speed_processed: r.speed_processed, notes: r.notes, receipt: r.receipt,
          created_at: r.created_at, synced_at: new Date().toISOString(),
        })
        break
      }

      // ---- Payment Links ----
      case "create_payment_link": {
        result = await rpRequest("POST", "/payment_links", {
          amount: params.amount,
          currency: params.currency ?? "INR",
          accept_partial: params.accept_partial ?? false,
          first_min_partial_amount: params.first_min_partial_amount,
          description: params.description,
          customer: {
            name: params.customer_name,
            email: params.customer_email,
            contact: params.customer_contact,
          },
          notify: { sms: params.notify_sms ?? true, email: params.notify_email ?? true },
          reminder_enable: params.reminder_enable ?? true,
          notes: params.notes ?? {},
          callback_url: params.callback_url,
          callback_method: params.callback_url ? "get" : undefined,
          expire_by: params.expire_by,
          upi_link: params.upi_link ?? false,
        })
        const l = result as Record<string, unknown>
        await hq.from("razorpay_payment_links").upsert({
          id: l.id, amount: l.amount, currency: l.currency, amount_paid: l.amount_paid,
          description: l.description, short_url: l.short_url, status: l.status,
          customer_name: params.customer_name, customer_email: params.customer_email,
          customer_contact: params.customer_contact, upi_link: l.upi_link,
          reminder_enable: l.reminder_enable, notes: l.notes,
          expire_by: l.expire_by, created_at: l.created_at, updated_at: l.updated_at,
          vertical: params.vertical, space_slug: params.space_slug,
          synced_at: new Date().toISOString(),
        })
        break
      }

      case "cancel_payment_link": {
        result = await rpRequest("POST", `/payment_links/${params.link_id}/cancel`)
        await hq.from("razorpay_payment_links").update({
          status: "cancelled", cancelled_at: Math.floor(Date.now() / 1000),
          synced_at: new Date().toISOString(),
        }).eq("id", params.link_id)
        break
      }

      case "resend_payment_link": {
        result = await rpRequest("POST", `/payment_links/${params.link_id}/notify_by/${params.medium ?? "sms"}`)
        break
      }

      // ---- Invoices ----
      case "create_invoice": {
        result = await rpRequest("POST", "/invoices", {
          type: "invoice",
          description: params.description,
          customer_id: params.customer_id,
          customer: params.customer_id ? undefined : {
            name: params.customer_name,
            email: params.customer_email,
            contact: params.customer_contact,
            billing_address: params.billing_address,
            shipping_address: params.shipping_address,
          },
          line_items: params.line_items,
          expire_by: params.expire_by,
          sms_notify: params.sms_notify ?? 1,
          email_notify: params.email_notify ?? 1,
          partial_payment: params.partial_payment ?? false,
          currency: params.currency ?? "INR",
          terms: params.terms,
          notes: params.notes ?? {},
        })
        const inv = result as Record<string, unknown>
        await hq.from("razorpay_invoices").upsert({
          id: inv.id, type: inv.type, invoice_number: inv.invoice_number,
          customer_id: inv.customer_id, order_id: inv.order_id, amount: inv.amount,
          amount_paid: inv.amount_paid, amount_due: inv.amount_due,
          gross_amount: inv.gross_amount, tax_amount: inv.tax_amount,
          currency: inv.currency, description: inv.description, terms: inv.terms,
          short_url: inv.short_url, status: inv.status, line_items: inv.line_items,
          customer_details: inv.customer_details, notes: inv.notes,
          created_at: inv.created_at, vertical: params.vertical,
          space_slug: params.space_slug, synced_at: new Date().toISOString(),
        })
        break
      }

      case "issue_invoice": {
        result = await rpRequest("POST", `/invoices/${params.invoice_id}/issue`)
        await hq.from("razorpay_invoices").update({
          status: "issued", synced_at: new Date().toISOString(),
        }).eq("id", params.invoice_id)
        break
      }

      case "cancel_invoice": {
        result = await rpRequest("POST", `/invoices/${params.invoice_id}/cancel`)
        await hq.from("razorpay_invoices").update({
          status: "cancelled", cancelled_at: Math.floor(Date.now() / 1000),
          synced_at: new Date().toISOString(),
        }).eq("id", params.invoice_id)
        break
      }

      // ---- Customers ----
      case "create_customer": {
        result = await rpRequest("POST", "/customers", {
          name: params.name,
          email: params.email,
          contact: params.contact,
          gstin: params.gstin,
          notes: params.notes ?? {},
          fail_existing: params.fail_existing ?? 0,
        })
        const c = result as Record<string, unknown>
        await hq.from("razorpay_customers").upsert({
          id: c.id, name: c.name, email: c.email, contact: c.contact, gstin: c.gstin,
          notes: c.notes, created_at: c.created_at, synced_at: new Date().toISOString(),
        })
        break
      }

      // ---- Subscriptions ----
      case "create_plan": {
        result = await rpRequest("POST", "/plans", {
          period: params.period,
          interval: params.interval,
          item: { name: params.item_name, amount: params.item_amount, currency: params.currency ?? "INR", description: params.item_description },
          notes: params.notes ?? {},
        })
        const pl = result as Record<string, unknown>
        const item = pl.item as Record<string, unknown>
        await hq.from("razorpay_plans").upsert({
          id: pl.id, period: pl.period, interval: pl.interval,
          item_id: item?.id, item_name: item?.name, item_amount: item?.amount,
          item_currency: item?.currency, item_description: item?.description,
          notes: pl.notes, created_at: pl.created_at, synced_at: new Date().toISOString(),
        })
        break
      }

      case "create_subscription": {
        result = await rpRequest("POST", "/subscriptions", {
          plan_id: params.plan_id,
          customer_id: params.customer_id,
          total_count: params.total_count,
          quantity: params.quantity ?? 1,
          customer_notify: params.customer_notify ?? 1,
          notes: params.notes ?? {},
          expire_by: params.expire_by,
        })
        const sub = result as Record<string, unknown>
        await hq.from("razorpay_subscriptions").upsert({
          id: sub.id, plan_id: sub.plan_id, customer_id: sub.customer_id, status: sub.status,
          total_count: sub.total_count, paid_count: sub.paid_count,
          remaining_count: sub.remaining_count, short_url: sub.short_url,
          notes: sub.notes, created_at: sub.created_at, synced_at: new Date().toISOString(),
        })
        break
      }

      case "cancel_subscription": {
        result = await rpRequest("POST", `/subscriptions/${params.subscription_id}/cancel`, {
          cancel_at_cycle_end: params.cancel_at_cycle_end ?? 0,
        })
        await hq.from("razorpay_subscriptions").update({
          status: "cancelled", synced_at: new Date().toISOString(),
        }).eq("id", params.subscription_id)
        break
      }

      // ---- QR Codes ----
      case "create_qr_code": {
        result = await rpRequest("POST", "/payments/qr_codes", {
          type: "upi_qr",
          name: params.name,
          usage: params.usage ?? "multiple_use",
          fixed_amount: params.fixed_amount ?? false,
          payment_amount: params.payment_amount,
          description: params.description,
          customer_id: params.customer_id,
          close_by: params.close_by,
          notes: params.notes ?? {},
        })
        const qr = result as Record<string, unknown>
        await hq.from("razorpay_qr_codes").upsert({
          id: qr.id, name: qr.name, usage: qr.usage, type: qr.type,
          image_url: qr.image_url, payment_amount: qr.payment_amount,
          status: qr.status, description: qr.description, fixed_amount: qr.fixed_amount,
          notes: qr.notes, customer_id: qr.customer_id, close_by: qr.close_by,
          created_at: qr.created_at, vertical: params.vertical, space_slug: params.space_slug,
          synced_at: new Date().toISOString(),
        })
        break
      }

      case "close_qr_code": {
        result = await rpRequest("POST", `/payments/qr_codes/${params.qr_id}/close`)
        await hq.from("razorpay_qr_codes").update({
          status: "closed", closed_at: Math.floor(Date.now() / 1000),
          close_reason: "on_demand", synced_at: new Date().toISOString(),
        }).eq("id", params.qr_id)
        break
      }

      // ---- Payouts (Razorpay X) ----
      case "create_payout": {
        result = await rpRequest("POST", "/payouts", {
          account_number: params.account_number,
          fund_account_id: params.fund_account_id,
          amount: params.amount,
          currency: "INR",
          mode: params.mode ?? "IMPS",
          purpose: params.purpose ?? "payout",
          reference_id: params.reference_id,
          narration: params.narration,
          notes: params.notes ?? {},
        })
        const po = result as Record<string, unknown>
        await hq.from("razorpay_payouts").upsert({
          id: po.id, fund_account_id: po.fund_account_id, amount: po.amount,
          currency: po.currency, mode: po.mode, purpose: po.purpose, utr: po.utr,
          status: po.status, fees: po.fees, tax: po.tax, reference_id: po.reference_id,
          narration: po.narration, notes: po.notes, status_details: po.status_details,
          created_at: po.created_at, synced_at: new Date().toISOString(),
        })
        break
      }

      case "cancel_payout": {
        result = await rpRequest("POST", `/payouts/${params.payout_id}/cancel`)
        await hq.from("razorpay_payouts").update({
          status: "cancelled", synced_at: new Date().toISOString(),
        }).eq("id", params.payout_id)
        break
      }

      // ---- Contacts (Razorpay X) ----
      case "create_contact": {
        result = await rpRequest("POST", "/contacts", {
          name: params.name,
          email: params.email,
          contact: params.contact,
          type: params.type ?? "vendor",
          reference_id: params.reference_id,
          notes: params.notes ?? {},
        })
        const ct = result as Record<string, unknown>
        await hq.from("razorpay_contacts").upsert({
          id: ct.id, name: ct.name, email: ct.email, contact: ct.contact,
          type: ct.type, reference_id: ct.reference_id, active: ct.active,
          notes: ct.notes, created_at: ct.created_at, synced_at: new Date().toISOString(),
        })
        break
      }

      // ---- Fund Accounts ----
      case "create_fund_account": {
        result = await rpRequest("POST", "/fund_accounts", {
          contact_id: params.contact_id,
          account_type: params.account_type ?? "bank_account",
          bank_account: params.account_type === "vpa" ? undefined : {
            name: params.bank_name,
            ifsc: params.ifsc,
            account_number: params.account_number,
          },
          vpa: params.account_type === "vpa" ? { address: params.vpa_address } : undefined,
        })
        const fa = result as Record<string, unknown>
        await hq.from("razorpay_fund_accounts").upsert({
          id: fa.id, contact_id: fa.contact_id, account_type: fa.account_type,
          bank_account: fa.bank_account, vpa: fa.vpa, active: fa.active,
          created_at: fa.created_at, synced_at: new Date().toISOString(),
        })
        break
      }

      // ---- Disputes ----
      case "accept_dispute": {
        result = await rpRequest("POST", `/disputes/${params.dispute_id}/accept`)
        await hq.from("razorpay_disputes").update({
          status: "lost", synced_at: new Date().toISOString(),
        }).eq("id", params.dispute_id)
        break
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    return NextResponse.json({ ok: true, result })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
