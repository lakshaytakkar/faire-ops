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

async function rpFetchAll(endpoint: string, params: Record<string, string> = {}) {
  const items: unknown[] = []
  let skip = 0
  const count = 100
  let hasMore = true

  while (hasMore) {
    const qs = new URLSearchParams({ count: String(count), skip: String(skip), ...params })
    const res = await fetch(`${RP_BASE}${endpoint}?${qs}`, { headers: rpHeaders() })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Razorpay API error ${res.status}: ${err}`)
    }
    const data = await res.json()
    const batch = data.items ?? []
    items.push(...batch)
    skip += count
    hasMore = batch.length === count
  }

  return items
}

type SyncResult = { entity: string; synced: number; failed: number; error?: string }

async function syncEntity(
  entityType: string,
  endpoint: string,
  table: string,
  mapFn: (item: Record<string, unknown>) => Record<string, unknown>,
  params: Record<string, string> = {}
): Promise<SyncResult> {
  try {
    const items = await rpFetchAll(endpoint, params) as Record<string, unknown>[]
    if (items.length === 0) return { entity: entityType, synced: 0, failed: 0 }

    const hq = getHqClient()
    const mapped = items.map(mapFn)

    // Upsert in batches of 50
    let synced = 0
    let failed = 0
    let lastError: string | undefined
    for (let i = 0; i < mapped.length; i += 50) {
      const batch = mapped.slice(i, i + 50)
      const { error } = await hq.from(table).upsert(batch, { onConflict: "id" })
      if (error) {
        failed += batch.length
        lastError = error.message + (error.details ? ` | ${error.details}` : "") + (error.hint ? ` | hint: ${error.hint}` : "")
      } else {
        synced += batch.length
      }
    }

    return { entity: entityType, synced, failed, error: lastError }
  } catch (err) {
    return { entity: entityType, synced: 0, failed: 0, error: (err as Error).message }
  }
}

export const maxDuration = 300

export async function POST() {
  const keyId = process.env.RAZORPAY_KEY_ID
  if (!keyId) {
    return NextResponse.json({ error: "RAZORPAY_KEY_ID not configured" }, { status: 400 })
  }

  const hq = getHqClient()
  const startedAt = new Date().toISOString()

  // Log sync start
  const { data: logRow } = await hq.from("razorpay_sync_log").insert({
    entity_type: "all",
    direction: "pull",
    status: "running",
    triggered_by: "manual",
  }).select("id").single()

  const results: SyncResult[] = []

  // Sync all entities
  results.push(await syncEntity("payments", "/payments", "razorpay_payments", (p) => ({
    id: p.id, amount: p.amount, currency: p.currency, status: p.status, method: p.method,
    order_id: p.order_id, invoice_id: p.invoice_id, description: p.description,
    international: p.international, captured: p.captured, amount_refunded: p.amount_refunded,
    refund_status: p.refund_status, email: p.email, contact: p.contact,
    customer_id: p.customer_id, card_id: p.card_id, card: p.card, bank: p.bank,
    vpa: p.vpa, wallet: p.wallet, fee: p.fee, tax: p.tax,
    error_code: p.error_code, error_description: p.error_description,
    error_source: p.error_source, error_step: p.error_step, error_reason: p.error_reason,
    notes: p.notes, acquirer_data: p.acquirer_data, created_at: p.created_at,
    synced_at: new Date().toISOString(),
  })))

  results.push(await syncEntity("orders", "/orders", "razorpay_orders", (o) => ({
    id: o.id, amount: o.amount, amount_paid: o.amount_paid, amount_due: o.amount_due,
    currency: o.currency, receipt: o.receipt, status: o.status, attempts: o.attempts,
    notes: o.notes, created_at: o.created_at, synced_at: new Date().toISOString(),
  })))

  results.push(await syncEntity("refunds", "/refunds", "razorpay_refunds", (r) => ({
    id: r.id, amount: r.amount, currency: r.currency, payment_id: r.payment_id,
    notes: r.notes, receipt: r.receipt, status: r.status,
    speed_requested: r.speed_requested, speed_processed: r.speed_processed,
    batch_id: r.batch_id, acquirer_data: r.acquirer_data, created_at: r.created_at,
    synced_at: new Date().toISOString(),
  })))

  results.push(await syncEntity("settlements", "/settlements", "razorpay_settlements", (s) => ({
    id: s.id, amount: s.amount, status: s.status, fees: s.fees, tax: s.tax,
    utr: s.utr, created_at: s.created_at, synced_at: new Date().toISOString(),
  })))

  results.push(await syncEntity("customers", "/customers", "razorpay_customers", (c) => ({
    id: c.id, name: c.name, email: c.email, contact: c.contact, gstin: c.gstin,
    notes: c.notes, created_at: c.created_at, synced_at: new Date().toISOString(),
  })))

  results.push(await syncEntity("payment_links", "/payment_links", "razorpay_payment_links", (l) => ({
    id: l.id, amount: l.amount, currency: l.currency, accept_partial: l.accept_partial,
    first_min_partial_amount: l.first_min_partial_amount, amount_paid: l.amount_paid,
    description: l.description, reference_id: l.reference_id,
    customer_name: (l.customer as Record<string, unknown>)?.name,
    customer_email: (l.customer as Record<string, unknown>)?.email,
    customer_contact: (l.customer as Record<string, unknown>)?.contact,
    expire_by: l.expire_by, expired_at: l.expired_at, cancelled_at: l.cancelled_at,
    short_url: l.short_url, status: l.status, upi_link: l.upi_link,
    callback_url: l.callback_url, reminder_enable: l.reminder_enable,
    notes: l.notes, created_at: l.created_at, updated_at: l.updated_at,
    synced_at: new Date().toISOString(),
  })))

  results.push(await syncEntity("invoices", "/invoices", "razorpay_invoices", (inv) => ({
    id: inv.id, type: inv.type, invoice_number: inv.invoice_number,
    customer_id: inv.customer_id, order_id: inv.order_id, payment_id: inv.payment_id,
    receipt: inv.receipt, customer_details: inv.customer_details, line_items: inv.line_items,
    amount: inv.amount, amount_paid: inv.amount_paid, amount_due: inv.amount_due,
    gross_amount: inv.gross_amount, tax_amount: inv.tax_amount, taxable_amount: inv.taxable_amount,
    currency: inv.currency, description: inv.description, terms: inv.terms, comment: inv.comment,
    partial_payment: inv.partial_payment, short_url: inv.short_url, status: inv.status,
    sms_status: inv.sms_status, email_status: inv.email_status, date: inv.date,
    issued_at: inv.issued_at, paid_at: inv.paid_at, cancelled_at: inv.cancelled_at,
    expired_at: inv.expired_at, expire_by: inv.expire_by, notes: inv.notes,
    created_at: inv.created_at, synced_at: new Date().toISOString(),
  })))

  results.push(await syncEntity("items", "/items", "razorpay_items", (it) => ({
    id: it.id, active: it.active, name: it.name, description: it.description,
    amount: it.amount, unit_amount: it.unit_amount, currency: it.currency, type: it.type,
    unit: it.unit, tax_inclusive: it.tax_inclusive, hsn_code: it.hsn_code, sac_code: it.sac_code,
    tax_rate: it.tax_rate, created_at: it.created_at, synced_at: new Date().toISOString(),
  })))

  results.push(await syncEntity("plans", "/plans", "razorpay_plans", (pl) => ({
    id: pl.id, period: pl.period, interval: pl.interval,
    item_id: (pl.item as Record<string, unknown>)?.id,
    item_name: (pl.item as Record<string, unknown>)?.name,
    item_amount: (pl.item as Record<string, unknown>)?.amount,
    item_currency: (pl.item as Record<string, unknown>)?.currency,
    item_description: (pl.item as Record<string, unknown>)?.description,
    notes: pl.notes, created_at: pl.created_at, synced_at: new Date().toISOString(),
  })))

  results.push(await syncEntity("subscriptions", "/subscriptions", "razorpay_subscriptions", (sub) => ({
    id: sub.id, plan_id: sub.plan_id, customer_id: sub.customer_id, status: sub.status,
    total_count: sub.total_count, paid_count: sub.paid_count, remaining_count: sub.remaining_count,
    current_start: sub.current_start, current_end: sub.current_end, charge_at: sub.charge_at,
    start_at: sub.start_at, end_at: sub.end_at, ended_at: sub.ended_at,
    quantity: sub.quantity, customer_notify: sub.customer_notify,
    has_scheduled_changes: sub.has_scheduled_changes, offer_id: sub.offer_id,
    short_url: sub.short_url, notes: sub.notes, created_at: sub.created_at,
    synced_at: new Date().toISOString(),
  })))

  results.push(await syncEntity("disputes", "/disputes", "razorpay_disputes", (d) => ({
    id: d.id, payment_id: d.payment_id, amount: d.amount, currency: d.currency,
    amount_deducted: d.amount_deducted, reason_code: d.reason_code,
    reason_description: d.reason_description, respond_by: d.respond_by,
    status: d.status, phase: d.phase, created_at: d.created_at,
    synced_at: new Date().toISOString(),
  })))

  // Update sync log
  const totalSynced = results.reduce((s, r) => s + r.synced, 0)
  const totalFailed = results.reduce((s, r) => s + r.failed, 0)
  const errors = results.filter((r) => r.error).map((r) => `${r.entity}: ${r.error}`)

  if (logRow?.id) {
    await hq.from("razorpay_sync_log").update({
      records_synced: totalSynced,
      records_failed: totalFailed,
      status: errors.length > 0 ? "failed" : "completed",
      error: errors.length > 0 ? errors.join("; ") : null,
      completed_at: new Date().toISOString(),
    }).eq("id", logRow.id)
  }

  return NextResponse.json({
    ok: true,
    synced: totalSynced,
    failed: totalFailed,
    results,
    duration_ms: Date.now() - new Date(startedAt).getTime(),
  })
}
