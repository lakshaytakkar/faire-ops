// Shared formatters — promoted out of ets/_components/ets-ui.tsx and
// development/dev-primitives.tsx so any space can import them without
// cross-space pollution. See SPACE_PATTERN.md §2.

export function formatCurrency(n: number | string | null | undefined, currency = "₹"): string {
  if (n === null || n === undefined) return "—"
  const num = typeof n === "string" ? parseFloat(n) : n
  if (isNaN(num)) return "—"
  return `${currency}${num.toLocaleString("en-IN")}`
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—"
  try {
    const date = typeof d === "string" ? new Date(d) : d
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return String(d)
  }
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—"
  try {
    const date = typeof d === "string" ? new Date(d) : d
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return String(d)
  }
}

// Relative time for activity feeds: "2h ago", "3d ago", "just now".
export function relativeTime(d: string | Date | null | undefined): string {
  if (!d) return "—"
  const date = typeof d === "string" ? new Date(d) : d
  const ms = Date.now() - date.getTime()
  if (Number.isNaN(ms)) return "—"
  const s = Math.round(ms / 1000)
  if (s < 45) return "just now"
  if (s < 90) return "1 min ago"
  const m = Math.round(s / 60)
  if (m < 45) return `${m} min ago`
  if (m < 90) return "1 hr ago"
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  const days = Math.round(h / 24)
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.round(days / 7)}w ago`
  if (days < 365) return `${Math.round(days / 30)} mo ago`
  return `${Math.round(days / 365)}y ago`
}

export function formatInitials(name: string | null | undefined): string {
  if (!name) return "??"
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function formatCbm(m3: number | null | undefined): string {
  if (m3 === null || m3 === undefined || isNaN(m3)) return "—"
  return `${m3.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³`
}

export function formatNumber(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "—"
  const num = typeof n === "string" ? parseFloat(n) : n
  if (isNaN(num)) return "—"
  return num.toLocaleString("en-IN")
}
