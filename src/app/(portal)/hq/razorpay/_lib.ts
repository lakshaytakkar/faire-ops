// Razorpay helpers shared across all payment pages
// All amounts from Razorpay API are in paise (1/100 of currency unit)

export function paiseToRupees(paise: number | bigint | null | undefined): number {
  if (paise === null || paise === undefined) return 0
  return Number(paise) / 100
}

export function formatPaise(paise: number | bigint | null | undefined, currency = "₹"): string {
  if (paise === null || paise === undefined) return "—"
  const rupees = Number(paise) / 100
  return `${currency}${rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function epochToDate(epoch: number | null | undefined): Date | null {
  if (!epoch) return null
  return new Date(epoch * 1000)
}

export function formatEpoch(epoch: number | null | undefined): string {
  if (!epoch) return "—"
  return new Date(epoch * 1000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatEpochDateTime(epoch: number | null | undefined): string {
  if (!epoch) return "—"
  return new Date(epoch * 1000).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function rpMethodLabel(method: string | null): string {
  const map: Record<string, string> = {
    card: "Card",
    netbanking: "Netbanking",
    wallet: "Wallet",
    emi: "EMI",
    upi: "UPI",
    bank_transfer: "Bank Transfer",
  }
  return method ? map[method] ?? method : "—"
}

export const RP_PAYMENT_STATUSES = ["created", "authorized", "captured", "refunded", "failed"] as const
export const RP_ORDER_STATUSES = ["created", "attempted", "paid"] as const
export const RP_REFUND_STATUSES = ["pending", "processed", "failed"] as const
export const RP_SETTLEMENT_STATUSES = ["created", "processed", "failed"] as const
export const RP_LINK_STATUSES = ["created", "partially_paid", "expired", "cancelled", "paid"] as const
export const RP_INVOICE_STATUSES = ["draft", "issued", "partially_paid", "paid", "cancelled", "expired", "deleted"] as const
export const RP_SUBSCRIPTION_STATUSES = ["created", "authenticated", "active", "pending", "halted", "cancelled", "completed", "expired"] as const
export const RP_DISPUTE_STATUSES = ["open", "under_review", "won", "lost", "closed"] as const
export const RP_PAYOUT_STATUSES = ["queued", "pending", "rejected", "processing", "processed", "cancelled", "reversed", "failed"] as const

// Maps Razorpay statuses to our toneForStatus convention
export function rpTone(status: string | null): string {
  if (!status) return "slate"
  const s = status.toLowerCase().replace(/_/g, " ")
  // direct match for toneForStatus
  return s
}
