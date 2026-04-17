import { supabase, supabaseB2B } from "@/lib/supabase"

/**
 * Contact auto-matching utility for calls.
 * Given a list of phone numbers, returns a map of normalized phone -> contact info.
 *
 * Searches across:
 * - faire_retailers (customers)
 * - faire_vendors (suppliers)
 * - user_phone_numbers → users (internal employees)
 */

export type ContactType = "retailer" | "vendor" | "employee"

export interface MatchedContact {
  type: ContactType
  id: string
  name: string
  link: string         // workspace path to detail page
  badgeClass: string   // tailwind classes for the badge
}

/**
 * Normalize phone number for matching:
 * - Strip all non-digits
 * - Remove leading country code (91) if present
 * - Take last 10 digits (Indian numbers)
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ""
  const digits = phone.replace(/\D/g, "")
  // Strip 91 prefix if present
  const stripped = digits.startsWith("91") && digits.length > 10 ? digits.slice(2) : digits
  // Take last 10 digits
  return stripped.length > 10 ? stripped.slice(-10) : stripped
}

/**
 * Match a list of phone numbers against all contact tables.
 * Returns a Map<normalizedPhone, MatchedContact>.
 * Phones with no match are simply absent from the map.
 */
export async function matchContactsByPhone(
  phones: (string | null | undefined)[]
): Promise<Map<string, MatchedContact>> {
  const normalized = Array.from(
    new Set(phones.map(normalizePhone).filter((p) => p.length >= 10))
  )

  if (normalized.length === 0) return new Map()

  // Build LIKE patterns to handle stored format variations
  // Matching strategy: substring match on the last 10 digits
  const likePatterns = normalized.map((p) => `%${p}%`)

  const [retailersRes, vendorsRes, phoneNumbersRes] = await Promise.all([
    supabaseB2B
      .from("faire_retailers")
      .select("faire_retailer_id, name, company_name, phone")
      .or(likePatterns.map((p) => `phone.ilike.${p}`).join(",")),
    supabaseB2B
      .from("faire_vendors")
      .select("id, name, contact_name, phone")
      .or(likePatterns.map((p) => `phone.ilike.${p}`).join(",")),
    supabase
      .from("user_phone_numbers")
      .select("id, phone, user_id, users:user_id(id, full_name)")
      .or(likePatterns.map((p) => `phone.ilike.${p}`).join(",")),
  ])

  const map = new Map<string, MatchedContact>()

  // Retailers
  for (const r of retailersRes.data ?? []) {
    const norm = normalizePhone((r as { phone: string }).phone)
    if (norm && !map.has(norm)) {
      const data = r as { faire_retailer_id: string; name: string | null; company_name: string | null }
      map.set(norm, {
        type: "retailer",
        id: data.faire_retailer_id,
        name: data.company_name || data.name || "Unknown Retailer",
        link: `/retailers/directory/${data.faire_retailer_id}`,
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      })
    }
  }

  // Vendors
  for (const v of vendorsRes.data ?? []) {
    const norm = normalizePhone((v as { phone: string }).phone)
    if (norm && !map.has(norm)) {
      const data = v as { id: string; name: string | null; contact_name: string | null }
      map.set(norm, {
        type: "vendor",
        id: data.id,
        name: data.name || data.contact_name || "Unknown Vendor",
        link: `/workspace/vendors`,
        badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
      })
    }
  }

  // Internal employees (user_phone_numbers → users)
  for (const p of phoneNumbersRes.data ?? []) {
    const data = p as unknown as {
      id: string
      phone: string
      user_id: string
      users: { id: string; full_name: string } | { id: string; full_name: string }[] | null
    }
    const norm = normalizePhone(data.phone)
    const userObj = Array.isArray(data.users) ? data.users[0] : data.users
    if (norm && !map.has(norm) && userObj) {
      map.set(norm, {
        type: "employee",
        id: userObj.id,
        name: userObj.full_name,
        link: `/hq/calls/employees/${userObj.id}`,
        badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
      })
    }
  }

  return map
}

/**
 * Single-phone variant — convenient for detail pages.
 */
export async function matchContactByPhone(phone: string | null | undefined): Promise<MatchedContact | null> {
  if (!phone) return null
  const map = await matchContactsByPhone([phone])
  return map.get(normalizePhone(phone)) ?? null
}
