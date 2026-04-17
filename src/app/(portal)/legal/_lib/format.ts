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

export function clientHealthTone(h: string | null | undefined): StatusTone {
  switch (h) {
    case "Healthy": return "emerald"
    case "At Risk": return "amber"
    case "Critical": return "red"
    case "Churned": return "red"
    case "Neutral": return "slate"
    case "Inactive": return "slate"
    default: return "slate"
  }
}

export function llcStatusTone(s: string | null | undefined): StatusTone {
  switch (s) {
    case "Delivered": return "emerald"
    case "Processing": return "blue"
    case "Pending": return "amber"
    case "On Hold": return "slate"
    case "Cancelled": return "red"
    default: return "slate"
  }
}

export function filingStatusTone(s: string | null | undefined): StatusTone {
  switch (s) {
    case "Completed": return "emerald"
    case "Filed": return "blue"
    case "In progress": return "amber"
    case "Document Collection": return "violet"
    case "Pending": return "slate"
    default: return "slate"
  }
}

export function filingStageTone(s: string | null | undefined): StatusTone {
  switch (s) {
    case "Complete": return "emerald"
    case "Filing": return "blue"
    case "Preparation": return "amber"
    case "Review": return "violet"
    case "Document Collection": return "slate"
    default: return "slate"
  }
}

export function planTone(p: string | null | undefined): StatusTone {
  switch (p) {
    case "Elite": return "violet"
    case "Pro": return "blue"
    case "Starter": return "amber"
    case "Basic": return "slate"
    default: return "slate"
  }
}
