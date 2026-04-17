"use server"

import { revalidatePath } from "next/cache"
import { legalAdmin, type ActionResult } from "./_client"

export const LEGAL_TABLES = [
  "clients",
  "onboarding_checklist",
  "tax_filings",
  "documents",
  "payments",
] as const

export type LegalTable = (typeof LEGAL_TABLES)[number]

const ALLOWED = new Set<string>(LEGAL_TABLES)

function assertAllowed(table: string) {
  if (!ALLOWED.has(table)) {
    throw new Error(`Legal admin: table "${table}" is not in the write allow-list.`)
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
    const { data, error } = await legalAdmin()
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
    const { error } = await legalAdmin().from(table).update(values).eq("id", id)
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
    const { error } = await legalAdmin().from(table).delete().eq("id", id)
    if (error) return { ok: false, error: error.message }
    if (revalidate) revalidatePath(revalidate)
    return { ok: true, id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}
