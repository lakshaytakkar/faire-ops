"use server"

import { revalidatePath } from "next/cache"
import { lifeAdmin, type ActionResult } from "./_client"

/**
 * Generic CRUD server actions for the Life AI admin space. The allow-list
 * enumerates every `life.*` table writable from the portal — both the richer
 * detail-surface tables (life_goals, life_issues, people, personal_projects,
 * trips, vehicles, habits, bucket_list, books, insurance_policies,
 * investments, life_transactions, journal_entries) and the daily quick-log
 * tables (habit_logs, workout_logs, sleep_logs, mood_logs, meditation_logs,
 * gratitude_logs, vital_logs).
 */
export const LIFE_TABLES = [
  "life_goals",
  "life_issues",
  "people",
  "interaction_logs",
  "personal_projects",
  "project_milestones",
  "trips",
  "vehicles",
  "vehicle_service_logs",
  "habits",
  "habit_logs",
  "bucket_list",
  "books",
  "courses",
  "skills",
  "captures",
  "queue_items",
  "investments",
  "insurance_policies",
  "life_transactions",
  "blocked_money",
  "debtors",
  "creditors",
  "monthly_budgets",
  "emis",
  "supplements",
  "doctors",
  "physical_assets",
  "life_documents",
  "thought_notes",
  "decision_logs",
  "wins",
  "letters_to_self",
  "relationship_events",
  "professional_network",
  "net_worth_snapshots",
  "routines",
  "workout_logs",
  "sleep_logs",
  "vital_logs",
  "mood_logs",
  "meditation_logs",
  "gratitude_logs",
  "journal_entries",
  "apps",
  "app_subscriptions",
  "app_credentials",
] as const

export type LifeTable = (typeof LIFE_TABLES)[number]

const ALLOWED = new Set<string>(LIFE_TABLES)

function assertAllowed(table: string) {
  if (!ALLOWED.has(table)) {
    throw new Error(`Life admin: table "${table}" is not in the write allow-list.`)
  }
}

type Values = Record<string, unknown>

export async function insertRow(
  table: string,
  values: Values,
  revalidate?: string,
): Promise<ActionResult> {
  try {
    assertAllowed(table)
    const { data, error } = await lifeAdmin()
      .from(table)
      .insert(values)
      .select("id")
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    if (revalidate) revalidatePath(revalidate)
    return { ok: true, id: (data?.id as string | undefined) ?? undefined }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function updateRow(
  table: string,
  id: string,
  values: Values,
  revalidate?: string,
): Promise<ActionResult> {
  try {
    assertAllowed(table)
    const { error } = await lifeAdmin().from(table).update(values).eq("id", id)
    if (error) return { ok: false, error: error.message }
    if (revalidate) revalidatePath(revalidate)
    return { ok: true, id }
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
    const { error } = await lifeAdmin().from(table).delete().eq("id", id)
    if (error) return { ok: false, error: error.message }
    if (revalidate) revalidatePath(revalidate)
    return { ok: true, id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function bulkDelete(
  table: string,
  ids: string[],
  revalidate?: string,
): Promise<ActionResult> {
  try {
    assertAllowed(table)
    if (ids.length === 0) return { ok: true }
    const { error } = await lifeAdmin().from(table).delete().in("id", ids)
    if (error) return { ok: false, error: error.message }
    if (revalidate) revalidatePath(revalidate)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

/**
 * Upsert a journal entry by date — journal_entries has a natural key on the
 * `date` column. Used by the journal detail editor.
 */
export async function upsertJournalByDate(
  date: string,
  values: Values,
): Promise<ActionResult> {
  try {
    const admin = lifeAdmin()
    const { data: existing } = await admin
      .from("journal_entries")
      .select("id")
      .eq("date", date)
      .maybeSingle()
    if (existing?.id) {
      const { error } = await admin
        .from("journal_entries")
        .update(values)
        .eq("id", existing.id)
      if (error) return { ok: false, error: error.message }
      revalidatePath(`/life/journal/${date}`)
      revalidatePath("/life/journal")
      return { ok: true, id: existing.id as string }
    }
    const { data, error } = await admin
      .from("journal_entries")
      .insert({ ...values, date })
      .select("id")
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    revalidatePath(`/life/journal/${date}`)
    revalidatePath("/life/journal")
    return { ok: true, id: (data?.id as string | undefined) ?? undefined }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}
