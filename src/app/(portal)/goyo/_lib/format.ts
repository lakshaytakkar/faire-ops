import type { StatusTone } from "@/components/shared/status-badge"

export function formatINR(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—"
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}

export function formatMoney(
  n: number | null | undefined,
  ccy: string | null | undefined,
): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—"
  const code = (ccy || "INR").toUpperCase()
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(Number(n))
  } catch {
    return `${code} ${Number(n).toLocaleString("en-IN")}`
  }
}

export function clientStatusTone(s: string | null | undefined): StatusTone {
  switch (s) {
    case "prospect": return "blue"
    case "active": return "emerald"
    case "vip": return "violet"
    case "churned": return "slate"
    default: return "slate"
  }
}

export function bookingStatusTone(s: string | null | undefined): StatusTone {
  switch (s) {
    case "draft": return "slate"
    case "confirmed": return "blue"
    case "in_progress": return "amber"
    case "completed": return "emerald"
    case "cancelled": return "red"
    default: return "slate"
  }
}

export function tourStatusTone(s: string | null | undefined): StatusTone {
  switch (s) {
    case "active": return "emerald"
    case "draft": return "amber"
    case "archived": return "slate"
    default: return "slate"
  }
}

export function flightStatusTone(s: string | null | undefined): StatusTone {
  switch (s) {
    case "draft": return "slate"
    case "confirmed": return "blue"
    case "ticketed": return "emerald"
    case "flown": return "slate"
    case "cancelled": return "red"
    default: return "slate"
  }
}

export function hotelStatusTone(s: string | null | undefined): StatusTone {
  switch (s) {
    case "draft": return "slate"
    case "booked": return "blue"
    case "confirmed": return "blue"
    case "in_house": return "emerald"
    case "completed": return "slate"
    case "cancelled": return "red"
    default: return "slate"
  }
}

export function visaStatusTone(s: string | null | undefined): StatusTone {
  switch (s) {
    case "pending": return "slate"
    case "submitted": return "amber"
    case "approved": return "emerald"
    case "rejected": return "red"
    case "on_arrival": return "blue"
    default: return "slate"
  }
}

export function guideStatusTone(s: string | null | undefined): StatusTone {
  switch (s) {
    case "active": return "emerald"
    case "on_assignment": return "amber"
    case "unavailable": return "slate"
    case "retired": return "slate"
    default: return "slate"
  }
}

export function itineraryStatusTone(s: string | null | undefined): StatusTone {
  switch (s) {
    case "draft": return "slate"
    case "sent": return "blue"
    case "approved": return "emerald"
    case "locked": return "violet"
    default: return "slate"
  }
}

export function tripStatusTone(s: string | null | undefined): StatusTone {
  const v = (s || "").toLowerCase()
  if (v === "going") return "emerald"
  if (v === "cancel" || v === "cancelled") return "red"
  if (v === "select") return "amber"
  return "slate"
}

export function refundStatusTone(s: string | null | undefined): StatusTone {
  const v = (s || "").toLowerCase()
  if (v.includes("client")) return "amber"
  if (v.includes("par reject") || v.includes("reject")) return "red"
  if (v === "pending") return "slate"
  return "blue"
}

export function agencyStatusTone(s: string | null | undefined): StatusTone {
  return s === "active" ? "emerald" : "slate"
}
