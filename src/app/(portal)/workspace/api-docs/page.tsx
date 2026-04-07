"use client"

/* ------------------------------------------------------------------ */
/*  Mock API endpoint data                                             */
/* ------------------------------------------------------------------ */

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE"

interface Endpoint {
  method: HttpMethod
  path: string
  description: string
}

interface ApiSection {
  title: string
  description: string
  endpoints: Endpoint[]
}

const METHOD_BADGE: Record<HttpMethod, string> = {
  GET:    "bg-emerald-50 text-emerald-700",
  POST:   "bg-blue-50 text-blue-700",
  PUT:    "bg-amber-50 text-amber-700",
  DELETE: "bg-red-50 text-red-700",
}

const API_SECTIONS: ApiSection[] = [
  {
    title: "Orders API",
    description: "Manage wholesale orders, accept or decline, and update fulfillment status.",
    endpoints: [
      { method: "GET",    path: "/api/v1/orders",                   description: "List all orders with optional status and date filters" },
      { method: "GET",    path: "/api/v1/orders/{id}",              description: "Retrieve a single order by ID with full line-item details" },
      { method: "POST",   path: "/api/v1/orders/{id}/accept",       description: "Accept a pending order and trigger fulfillment workflow" },
      { method: "POST",   path: "/api/v1/orders/{id}/decline",      description: "Decline a pending order with a reason code" },
      { method: "PUT",    path: "/api/v1/orders/{id}/shipment",     description: "Add tracking number and carrier to mark an order shipped" },
      { method: "DELETE", path: "/api/v1/orders/{id}",              description: "Cancel a draft or test order (non-production only)" },
    ],
  },
  {
    title: "Products API",
    description: "Create, update, and manage product listings across all brand stores.",
    endpoints: [
      { method: "GET",  path: "/api/v1/products",                  description: "List all products with pagination, filtering by brand or category" },
      { method: "GET",  path: "/api/v1/products/{id}",             description: "Get product details including variants, images, and pricing" },
      { method: "POST", path: "/api/v1/products",                  description: "Create a new product listing with variants and images" },
      { method: "PUT",  path: "/api/v1/products/{id}",             description: "Update product details, pricing, or inventory levels" },
      { method: "PUT",  path: "/api/v1/products/{id}/inventory",   description: "Bulk update inventory quantities for a product" },
      { method: "DELETE", path: "/api/v1/products/{id}",           description: "Archive a product listing (soft delete)" },
    ],
  },
  {
    title: "Analytics API",
    description: "Access revenue, traffic, and conversion analytics for reporting and dashboards.",
    endpoints: [
      { method: "GET", path: "/api/v1/analytics/revenue",          description: "Revenue breakdown by brand, time period, and order type" },
      { method: "GET", path: "/api/v1/analytics/traffic",          description: "Store traffic and page view analytics with source attribution" },
      { method: "GET", path: "/api/v1/analytics/conversion",       description: "Conversion funnel data from views to orders by product" },
      { method: "GET", path: "/api/v1/analytics/brands",           description: "Aggregate performance metrics per brand store" },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ApiDocsPage() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Faire API Reference</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Integration documentation</p>
      </div>

      {/* API Sections */}
      {API_SECTIONS.map((section) => (
        <div key={section.title} className="rounded-md border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b">
            <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{section.description}</p>
          </div>

          <div className="divide-y">
            {section.endpoints.map((ep, idx) => (
              <div key={idx} className="px-5 py-3.5 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                <span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 min-w-[52px] text-center ${METHOD_BADGE[ep.method]}`}>
                  {ep.method}
                </span>
                <div className="min-w-0">
                  <code className="text-sm text-foreground">{ep.path}</code>
                  <p className="mt-0.5 text-xs text-muted-foreground">{ep.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
