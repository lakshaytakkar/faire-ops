/**
 * Wise (TransferWise) API Client
 * Docs: https://docs.wise.com/api-docs
 * Base URL: https://api.transferwise.com
 */

const WISE_BASE = "https://api.transferwise.com"

function getApiKey(): string {
  return process.env.WISE_API_KEY ?? ""
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
  }
}

export function isWiseConfigured(): boolean {
  const key = getApiKey()
  return key !== "" && key !== "your-wise-api-key-here"
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface WiseProfile {
  id: number
  type: string // "PERSONAL" | "BUSINESS"
  fullName: string
}

export interface WiseBalance {
  id: number
  currency: string
  amount: { value: number; currency: string }
  reservedAmount: { value: number; currency: string }
}

export interface WiseTransaction {
  type: string
  date: string
  amount: { value: number; currency: string }
  totalFees: { value: number; currency: string }
  details: {
    type: string
    description: string
    senderName?: string
    senderAccount?: string
    paymentReference?: string
    category?: string
  }
  exchangeDetails: { toAmount?: { value: number; currency: string }; rate?: number } | null
  runningBalance: { value: number; currency: string }
  referenceNumber: string
}

/* ------------------------------------------------------------------ */
/*  API Calls                                                          */
/* ------------------------------------------------------------------ */

export async function getProfiles(): Promise<WiseProfile[]> {
  if (!getApiKey()) return []
  try {
    const res = await fetch(`${WISE_BASE}/v1/profiles`, { headers: headers() })
    if (!res.ok) throw new Error(`Wise API ${res.status}`)
    return res.json()
  } catch (err) {
    console.error("Wise getProfiles error:", err)
    return []
  }
}

export async function getBalances(profileId: number): Promise<WiseBalance[]> {
  if (!getApiKey()) return []
  try {
    const res = await fetch(`${WISE_BASE}/v4/profiles/${profileId}/balances?types=STANDARD`, { headers: headers() })
    if (!res.ok) throw new Error(`Wise API ${res.status}`)
    return res.json()
  } catch (err) {
    console.error("Wise getBalances error:", err)
    return []
  }
}

export async function getStatement(
  profileId: number,
  balanceId: number,
  currency: string,
  startDate: string,
  endDate: string
): Promise<{ transactions: WiseTransaction[] }> {
  if (!getApiKey()) return { transactions: [] }
  try {
    const params = new URLSearchParams({
      currency,
      intervalStart: startDate,
      intervalEnd: endDate,
      type: "COMPACT",
    })
    // Try multiple endpoint formats (Wise API has changed over versions)
    const endpoints = [
      `${WISE_BASE}/v1/profiles/${profileId}/balance-statements/${balanceId}/statement?${params}`,
      `${WISE_BASE}/v3/profiles/${profileId}/borderless-accounts/${balanceId}/statement?${params}`,
      `${WISE_BASE}/v1/profiles/${profileId}/borderless-accounts/statement?${params}`,
    ]
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { headers: headers() })
        if (res.ok) return res.json()
      } catch { /* try next */ }
    }
    return { transactions: [] }
  } catch (err) {
    console.error("Wise getStatement error:", err)
    return { transactions: [] }
  }
}

/* ------------------------------------------------------------------ */
/*  Extract transaction for DB storage                                 */
/* ------------------------------------------------------------------ */

export function extractWiseTransaction(txn: WiseTransaction) {
  const amountCents = Math.round(txn.amount.value * 100)
  const isDebit = amountCents < 0

  let txnType = "other"
  const desc = (txn.details?.description ?? "").toLowerCase()
  const ref = (txn.details?.paymentReference ?? "").toLowerCase()

  if (desc.includes("faire") || ref.includes("faire")) txnType = "payout"
  else if (txn.details?.type === "TRANSFER" || desc.includes("transfer")) txnType = isDebit ? "withdrawal" : "deposit"
  else if (txn.details?.type === "CONVERSION") txnType = "conversion"
  else if (desc.includes("fee") || txn.totalFees?.value > 0) txnType = "fee"
  else txnType = isDebit ? "withdrawal" : "deposit"

  return {
    amount_cents: amountCents,
    currency: txn.amount.currency,
    transaction_type: txnType,
    description: txn.details?.description ?? `${txn.type} transaction`,
    reference: txn.referenceNumber ?? txn.details?.paymentReference ?? null,
    transaction_date: txn.date?.split("T")[0] ?? new Date().toISOString().split("T")[0],
    category: txn.details?.category ?? "uncategorized",
    is_reconciled: false,
    matched_order_id: null,
    matched_vendor_id: null,
  }
}
