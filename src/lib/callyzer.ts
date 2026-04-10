/**
 * Callyzer API v2.1 client
 * https://developers.callyzer.co/
 *
 * Rate limit: 1 request per 2 seconds (429 on exceeded)
 */

const BASE = "https://api1.callyzer.co/api/v2.1"
const TOKEN = process.env.CALLYZER_API_KEY ?? ""

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CallyzerEmployee {
  emp_code: string
  emp_name: string
  emp_number: string
  emp_country_code: string
  emp_tags?: string[]
}

export interface CallyzerCallRecord {
  id: string
  emp_name: string
  emp_code: string
  emp_number: string
  emp_country_code: string
  emp_tags?: string[]
  client_name?: string
  client_number: string
  client_country_code?: string
  duration: number
  call_type: string
  call_date: string
  call_time: string
  note?: string
  call_recording_url?: string
  crm_status?: string
  reminder_date?: string
  reminder_time?: string
  synced_at: string
  modified_at: string
  lead_id?: string
}

export interface CallyzerCallSummary {
  total_incoming_calls: number
  total_outgoing_calls: number
  total_connected_calls: number
  total_missed_calls: number
  total_rejected_calls: number
  total_never_attended_calls: number
  total_not_pickup_by_clients_calls: number
  total_unique_clients: number
  total_duration?: string
  avg_duration_per_call?: number
  total_working_hours?: string
}

export interface CallyzerEmployeeSummary extends CallyzerCallSummary {
  emp_name: string
  emp_code: string
  emp_number: string
  last_call_date?: string
  last_call_time?: string
}

interface CallyzerListResponse<T> {
  data: T[]
  total?: number
  page_no?: number
  page_size?: number
}

interface DateRangeParams {
  call_from?: number  // UNIX timestamp UTC
  call_to?: number
  synced_from?: number
  synced_to?: number
}

interface FilterParams extends DateRangeParams {
  call_types?: string[]
  emp_numbers?: string[]
  emp_tags?: string[]
  client_numbers?: string[]
  duration_les_than?: number
  duration_grt_than?: number
  is_exclude_numbers?: boolean
}

interface PaginationParams {
  page_no?: number
  page_size?: number
}

/* ------------------------------------------------------------------ */
/*  Rate-limited request helper                                        */
/* ------------------------------------------------------------------ */

let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 2100 // 2.1 seconds to be safe

async function callyzerRequest<T>(path: string, body: object = {}, method: "POST" | "DELETE" = "POST"): Promise<T> {
  if (!TOKEN) {
    throw new Error("CALLYZER_API_KEY is not configured")
  }

  // Enforce rate limit
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL - elapsed))
  }
  lastRequestTime = Date.now()

  const url = `${BASE}${path}`
  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  let json: unknown
  try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }

  if (!res.ok) {
    const message = (json as { message?: string })?.message ?? `Callyzer ${res.status}`
    throw new Error(`Callyzer API error: ${message}`)
  }

  return json as T
}

export function isCallyzerConfigured(): boolean {
  return TOKEN !== ""
}

/* ------------------------------------------------------------------ */
/*  Endpoints                                                          */
/* ------------------------------------------------------------------ */

export async function fetchEmployeeDetails(): Promise<CallyzerEmployee[]> {
  const res = await callyzerRequest<{ data: CallyzerEmployee[] }>("/employee-details", {})
  return res.data ?? []
}

export async function fetchCallSummary(params: FilterParams): Promise<CallyzerCallSummary> {
  const res = await callyzerRequest<{ data: CallyzerCallSummary }>("/call-log/summary", params)
  return res.data ?? ({} as CallyzerCallSummary)
}

export async function fetchEmployeeSummary(params: FilterParams & PaginationParams): Promise<CallyzerEmployeeSummary[]> {
  const res = await callyzerRequest<CallyzerListResponse<CallyzerEmployeeSummary>>(
    "/call-log/employee-summary",
    { page_no: 1, page_size: 100, ...params }
  )
  return res.data ?? []
}

export async function fetchAnalysis(params: FilterParams): Promise<unknown> {
  const res = await callyzerRequest<{ data: unknown }>("/call-log/analysis", params)
  return res.data
}

export async function fetchHourlyAnalytics(params: FilterParams): Promise<unknown> {
  const res = await callyzerRequest<{ data: unknown }>("/call-log/hourly-analytics", params)
  return res.data
}

export async function fetchDayWiseAnalytics(params: FilterParams): Promise<unknown> {
  const res = await callyzerRequest<{ data: unknown }>("/call-log/daywise-analytics", params)
  return res.data
}

export async function fetchUniqueClients(params: FilterParams & PaginationParams): Promise<unknown[]> {
  const res = await callyzerRequest<{ data: unknown[] }>(
    "/call-log/unique-clients",
    { page_no: 1, page_size: 100, ...params }
  )
  return res.data ?? []
}

export async function fetchNeverAttended(params: FilterParams & PaginationParams): Promise<CallyzerCallRecord[]> {
  const res = await callyzerRequest<{ data: CallyzerCallRecord[] }>(
    "/call-log/never-attended",
    { page_no: 1, page_size: 100, ...params }
  )
  return res.data ?? []
}

export async function fetchNotPickupByClient(params: FilterParams & PaginationParams): Promise<CallyzerCallRecord[]> {
  const res = await callyzerRequest<{ data: CallyzerCallRecord[] }>(
    "/call-log/not-pickup-by-client",
    { page_no: 1, page_size: 100, ...params }
  )
  return res.data ?? []
}

export async function fetchCallHistory(params: FilterParams & PaginationParams): Promise<CallyzerCallRecord[]> {
  const res = await callyzerRequest<{ data: CallyzerCallRecord[] }>(
    "/call-log/history",
    { page_no: 1, page_size: 100, ...params }
  )
  return res.data ?? []
}

export async function fetchCallByIds(unique_ids: string[]): Promise<CallyzerCallRecord[]> {
  const res = await callyzerRequest<{ data: CallyzerCallRecord[] }>(
    "/call-log/get",
    { unique_ids }
  )
  return res.data ?? []
}

export async function removeCallRecording(unique_ids: string[]): Promise<unknown> {
  return callyzerRequest("/call-log/call-recording/remove", { unique_ids }, "DELETE")
}

/* ------------------------------------------------------------------ */
/*  Pagination helper — fetch ALL pages of call history                */
/* ------------------------------------------------------------------ */

export async function fetchAllCallHistory(
  params: FilterParams,
  maxPages = 50
): Promise<CallyzerCallRecord[]> {
  const all: CallyzerCallRecord[] = []
  for (let page = 1; page <= maxPages; page++) {
    const batch = await fetchCallHistory({ ...params, page_no: page, page_size: 100 })
    if (batch.length === 0) break
    all.push(...batch)
    if (batch.length < 100) break
  }
  return all
}

/* ------------------------------------------------------------------ */
/*  Helper: convert ISO date to UNIX UTC timestamp                     */
/* ------------------------------------------------------------------ */

export function toUnixUTC(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date
  return Math.floor(d.getTime() / 1000)
}
