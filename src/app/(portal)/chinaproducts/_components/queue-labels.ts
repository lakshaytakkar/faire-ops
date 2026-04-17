import type { StatusTone } from "@/components/shared/status-badge"

// Intent labels/tones. The chinaproducts rep queue tags each customer with an
// intent, which drives both the badge on the row and the script loaded on
// the detail page.
export const INTENT_LABELS: Record<string, string> = {
  price_objection: "Price objection",
  moq_question: "MOQ question",
  delivery_query: "Delivery query",
  new_buyer: "New buyer",
  private_label: "Private label",
  custom_quote: "Custom quote",
  abandoned_cart: "Abandoned cart",
}

export function intentLabel(key: string | null | undefined): string {
  if (!key) return "—"
  return INTENT_LABELS[key] ?? key
}

export function intentTone(key: string | null | undefined): StatusTone {
  switch (key) {
    case "price_objection":
      return "red"
    case "moq_question":
      return "amber"
    case "delivery_query":
      return "blue"
    case "new_buyer":
      return "emerald"
    case "private_label":
      return "violet"
    case "custom_quote":
      return "violet"
    case "abandoned_cart":
      return "amber"
    default:
      return "slate"
  }
}

export function priorityTone(priority: string | null | undefined): StatusTone {
  switch (priority) {
    case "high":
      return "red"
    case "medium":
      return "amber"
    case "low":
      return "slate"
    default:
      return "slate"
  }
}
