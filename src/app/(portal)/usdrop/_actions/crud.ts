"use server"

import { revalidatePath } from "next/cache"
import { usdropAdmin, type ActionResult } from "./_client"

/**
 * Generic CRUD server actions for the USDrop admin space.
 *
 * Only a curated allow-list of tables can be mutated — the allow-list both
 * documents which surfaces have drawer-edit support and prevents a bug in a
 * client component from targeting an unexpected table via service role.
 */
const ALLOWED_TABLES = new Set([
  "profiles",
  "products",
  "product_metadata",
  "product_source",
  "categories",
  "suppliers",
  "courses",
  "course_modules",
  "shopify_stores",
  "support_tickets",
  "ticket_messages",
  "sms_templates",
  "sms_automations",
  "email_templates",
  "email_automations",
  "intelligence_articles",
  "important_links",
  "ad_videos",
  "onboarding_videos",
  "roadmap_stages",
  "roadmap_tasks",
  "cro_categories",
  "cro_items",
  "mentorship_sessions",
  "mentorship_leads",
  "payment_links",
  "llc_applications",
])

function assertAllowed(table: string) {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`USDrop admin: table "${table}" is not in the write allow-list.`)
  }
}

export async function updateRow(
  table: string,
  id: string,
  patch: Record<string, unknown>,
  revalidate?: string,
): Promise<ActionResult> {
  try {
    assertAllowed(table)
    const { error } = await usdropAdmin().from(table).update(patch).eq("id", id)
    if (error) return { ok: false, error: error.message }
    if (revalidate) revalidatePath(revalidate)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function insertRow(
  table: string,
  payload: Record<string, unknown>,
  revalidate?: string,
): Promise<ActionResult> {
  try {
    assertAllowed(table)
    const { error } = await usdropAdmin().from(table).insert(payload)
    if (error) return { ok: false, error: error.message }
    if (revalidate) revalidatePath(revalidate)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function deleteRow(
  table: string,
  id: string,
  revalidate?: string,
): Promise<ActionResult> {
  try {
    assertAllowed(table)
    const { error } = await usdropAdmin().from(table).delete().eq("id", id)
    if (error) return { ok: false, error: error.message }
    if (revalidate) revalidatePath(revalidate)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

/**
 * Reply to a ticket — creates a ticket_messages row and touches the parent
 * ticket's updated_at. Used by the ticket detail page.
 */
export async function replyToTicket(
  ticketId: string,
  senderId: string | null,
  content: string,
  isInternal: boolean,
): Promise<ActionResult> {
  try {
    const admin = usdropAdmin()
    const { error } = await admin.from("ticket_messages").insert({
      ticket_id: ticketId,
      sender_id: senderId,
      content,
      is_internal: isInternal,
    })
    if (error) return { ok: false, error: error.message }
    await admin
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticketId)
    revalidatePath(`/usdrop/tickets/${ticketId}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

/**
 * Force-resync a Shopify store by stamping last_synced_at = now(). Stub for
 * the full Shopify resync pipeline.
 */
export async function forceResyncStore(storeId: string): Promise<ActionResult> {
  try {
    const { error } = await usdropAdmin()
      .from("shopify_stores")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", storeId)
    if (error) return { ok: false, error: error.message }
    revalidatePath("/usdrop/stores")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

/**
 * Approve an AI-pipeline product metadata entry — stamps standardized_at on
 * the paired product_source row.
 */
export async function approvePipelineItem(productId: string): Promise<ActionResult> {
  try {
    const { error } = await usdropAdmin()
      .from("product_source")
      .update({
        standardized_at: new Date().toISOString(),
        standardized_by: "admin",
      })
      .eq("product_id", productId)
    if (error) return { ok: false, error: error.message }
    revalidatePath("/usdrop/pipeline")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function rejectPipelineItem(productId: string): Promise<ActionResult> {
  try {
    const { error } = await usdropAdmin()
      .from("product_metadata")
      .update({ is_winning: false, is_trending: false })
      .eq("product_id", productId)
    if (error) return { ok: false, error: error.message }
    revalidatePath("/usdrop/pipeline")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}
