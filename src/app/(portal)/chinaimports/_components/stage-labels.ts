import type { StatusTone } from "@/components/shared/status-badge"

// Ordered 9-stage pipeline used by both RFQs and Orders. Stage keys match
// the chinaimports.order_stages.stage_key check constraint exactly.
export const STAGE_ORDER = [
  "rfq_received",
  "sourcing_in_progress",
  "quote_delivered",
  "sample_shipped",
  "sample_approved",
  "bulk_production",
  "pre_shipment_qc",
  "in_transit",
  "delivered",
] as const

export type StageKey = (typeof STAGE_ORDER)[number]

export const STAGE_LABELS: Record<string, string> = {
  rfq_received:         "RFQ received",
  sourcing_in_progress: "Sourcing",
  quote_delivered:      "Quote delivered",
  sample_shipped:       "Sample shipped",
  sample_approved:      "Sample approved",
  bulk_production:      "Bulk production",
  pre_shipment_qc:      "Pre-shipment QC",
  in_transit:           "In transit",
  delivered:            "Delivered",
  cancelled:            "Cancelled",
}

export const BUCKET_LABELS: Record<string, string> = {
  new:            "New",
  sourcing:       "Sourcing",
  quote_ready:    "Quote ready",
  sample_phase:   "Sample phase",
  bulk_phase:     "Bulk phase",
  shipping_phase: "Shipping phase",
  closed:         "Closed",
}

export function bucketLabel(key: string | null | undefined): string {
  if (!key) return "—"
  return BUCKET_LABELS[key] ?? key
}

export function bucketTone(key: string | null | undefined): StatusTone {
  switch (key) {
    case "new":            return "blue"
    case "sourcing":       return "amber"
    case "quote_ready":    return "violet"
    case "sample_phase":   return "amber"
    case "bulk_phase":     return "amber"
    case "shipping_phase": return "violet"
    case "closed":         return "emerald"
    default:               return "slate"
  }
}

export function stageLabel(key: string | null | undefined): string {
  if (!key) return "—"
  return STAGE_LABELS[key] ?? key
}

export function stageTone(key: string | null | undefined): StatusTone {
  switch (key) {
    case "delivered":         return "emerald"
    case "in_transit":        return "violet"
    case "pre_shipment_qc":   return "amber"
    case "bulk_production":   return "amber"
    case "sample_approved":   return "emerald"
    case "sample_shipped":    return "amber"
    case "quote_delivered":   return "violet"
    case "sourcing_in_progress": return "amber"
    case "rfq_received":      return "blue"
    case "cancelled":         return "red"
    default:                  return "slate"
  }
}

export function priorityTone(priority: string | null | undefined): StatusTone {
  switch (priority) {
    case "urgent": return "red"
    case "high":   return "red"
    case "medium": return "amber"
    case "low":    return "slate"
    default:       return "slate"
  }
}
