import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  fetchEmployeeDetails,
  fetchAllCallHistory,
  isCallyzerConfigured,
  toUnixUTC,
  type CallyzerCallRecord,
} from "@/lib/callyzer"

export const maxDuration = 300

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

function normalizePhone(phone: string, countryCode?: string): { phone: string; cc: string } {
  const cleaned = (phone ?? "").replace(/[^\d]/g, "")
  // Strip leading 91 if present
  const national = cleaned.startsWith("91") && cleaned.length > 10 ? cleaned.slice(2) : cleaned
  return { phone: national, cc: countryCode || "+91" }
}

function parseCallStartedAt(date: string, time: string): string | null {
  if (!date) return null
  try {
    const dt = new Date(`${date}T${time || "00:00:00"}`)
    return dt.toISOString()
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  if (!isCallyzerConfigured()) {
    return NextResponse.json({ error: "CALLYZER_API_KEY not configured" }, { status: 500 })
  }

  const supabase = getSupabase()
  const url = new URL(request.url)
  const days = parseInt(url.searchParams.get("days") ?? "1", 10)

  // Open log entry
  const { data: logRow } = await supabase
    .from("callyzer_sync_log")
    .insert({ sync_type: "full", status: "running" })
    .select("id")
    .single()

  const stats = { processed: 0, created: 0, updated: 0, failed: 0 }

  try {
    /* ---- 1. Sync employees ---- */
    const employees = await fetchEmployeeDetails()
    for (const emp of employees) {
      const { phone, cc } = normalizePhone(emp.emp_number, emp.emp_country_code)
      // Try to find existing user by phone
      const { data: existingPhone } = await supabase
        .from("user_phone_numbers")
        .select("id, user_id")
        .eq("phone", phone)
        .eq("country_code", cc)
        .maybeSingle()

      if (existingPhone) {
        await supabase
          .from("user_phone_numbers")
          .update({
            callyzer_emp_code: emp.emp_code,
            callyzer_emp_number: emp.emp_number,
            callyzer_synced_at: new Date().toISOString(),
          })
          .eq("id", existingPhone.id)
        stats.updated++
      } else {
        // Create unmapped phone (no user_id yet — admin must link)
        // Skip for now if we can't find a user
        stats.processed++
      }
    }

    /* ---- 2. Sync call history ---- */
    const callTo = new Date()
    const callFrom = new Date()
    callFrom.setDate(callFrom.getDate() - days)

    const calls = await fetchAllCallHistory({
      call_from: toUnixUTC(callFrom),
      call_to: toUnixUTC(callTo),
    })

    // Build lookup of emp_code -> user_id from user_phone_numbers
    const { data: phoneMap } = await supabase
      .from("user_phone_numbers")
      .select("id, user_id, callyzer_emp_code")
      .not("callyzer_emp_code", "is", null)

    const empCodeToUser: Record<string, { user_id: string; phone_id: string }> = {}
    for (const p of phoneMap ?? []) {
      if (p.callyzer_emp_code) {
        empCodeToUser[p.callyzer_emp_code] = { user_id: p.user_id, phone_id: p.id }
      }
    }

    for (const call of calls) {
      stats.processed++
      const mapping = empCodeToUser[call.emp_code]
      const callRow = {
        callyzer_id: call.id,
        user_id: mapping?.user_id ?? null,
        user_phone_id: mapping?.phone_id ?? null,
        call_type: call.call_type,
        emp_name: call.emp_name,
        emp_code: call.emp_code,
        emp_number: call.emp_number,
        emp_country_code: call.emp_country_code,
        client_name: call.client_name ?? null,
        client_number: call.client_number,
        client_country_code: call.client_country_code ?? null,
        call_date: call.call_date,
        call_time: call.call_time,
        call_started_at: parseCallStartedAt(call.call_date, call.call_time),
        duration_seconds: call.duration ?? 0,
        recording_url: call.call_recording_url ?? null,
        note: call.note ?? null,
        crm_status: call.crm_status ?? null,
        reminder_date: call.reminder_date ?? null,
        reminder_time: call.reminder_time ?? null,
        callyzer_lead_id: call.lead_id ?? null,
        emp_tags: call.emp_tags ?? [],
        synced_at: new Date().toISOString(),
        callyzer_modified_at: call.modified_at ?? null,
      }

      const { error } = await supabase
        .from("calls")
        .upsert(callRow, { onConflict: "callyzer_id" })

      if (error) {
        stats.failed++
        console.error("Call upsert error:", error.message, call.id)
      } else {
        stats.created++
      }
    }

    /* ---- 3. Mark log success ---- */
    await supabase
      .from("callyzer_sync_log")
      .update({
        status: stats.failed > 0 ? "partial" : "success",
        records_processed: stats.processed,
        records_created: stats.created,
        records_updated: stats.updated,
        records_failed: stats.failed,
        completed_at: new Date().toISOString(),
        details: { employees: employees.length, calls: calls.length, days },
      })
      .eq("id", logRow?.id ?? "")

    return NextResponse.json({
      success: true,
      employees: employees.length,
      calls: calls.length,
      ...stats,
    })
  } catch (error) {
    const message = (error as Error).message
    await supabase
      .from("callyzer_sync_log")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
        ...stats,
      })
      .eq("id", logRow?.id ?? "")
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  // Allow GET for cron compatibility
  return POST(request)
}
