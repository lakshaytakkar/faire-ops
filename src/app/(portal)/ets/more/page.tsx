"use client"

import { SubNav } from "@/components/shared/sub-nav"
import { Clock } from "lucide-react"

const SUB_NAV_ITEMS = [
  { title: "Dashboard", href: "/ets/dashboard" },
  { title: "Products", href: "/ets/products" },
  { title: "Stores", href: "/ets/stores" },
  { title: "Clients", href: "/ets/clients" },
  { title: "Vendors", href: "/ets/vendors" },
  { title: "More", href: "/ets/more" },
]

interface PlannedPage {
  name: string
  path: string
  desc: string
}

interface Group {
  title: string
  pages: PlannedPage[]
}

const GROUPS: Group[] = [
  {
    title: "Sales & Pipeline",
    pages: [
      { name: "Pipeline", path: "/ets/pipeline", desc: "Kanban of clients by stage; drag between stages" },
      { name: "Proposals", path: "/ets/proposals", desc: "Generate + track package proposals sent to leads" },
      { name: "Calculator", path: "/ets/calculator", desc: "Price engine: EXW → CIF → Duty → GST → INR landed" },
      { name: "Milestones", path: "/ets/milestones", desc: "Milestone payments tracker per client" },
    ],
  },
  {
    title: "Products & Catalog",
    pages: [
      { name: "Bulk upload", path: "/ets/bulk-upload", desc: "CSV/XLSX import of Haoduobao product sheets" },
      { name: "Price settings", path: "/ets/price-settings", desc: "Global rates: freight, duty, GST, markup %" },
      { name: "Collections admin", path: "/ets/collections-admin", desc: "Curated product collections for stores" },
    ],
  },
  {
    title: "Stores & Partners",
    pages: [
      { name: "Setup kit admin", path: "/ets/setup-kit-admin", desc: "Fixtures/interior kit item catalog" },
      { name: "Staff admin", path: "/ets/staff-admin", desc: "Partner store staff + PIN codes" },
      { name: "Store detail", path: "/ets/stores/[id]", desc: "Per-store dashboard, BOQ, staff, orders" },
    ],
  },
  {
    title: "Orders & Fulfillment",
    pages: [
      { name: "Orders", path: "/ets/orders", desc: "All orders — opening inventory + replenishment" },
      { name: "Fulfillment", path: "/ets/fulfillment", desc: "Order queue, assignment, status transitions" },
      { name: "Dispatch", path: "/ets/dispatch", desc: "Freight dispatch, tracking, DC" },
      { name: "Warehouse", path: "/ets/warehouse", desc: "Inbound/outbound from India warehouse" },
      { name: "Returns", path: "/ets/returns-admin", desc: "Return merchandise auth + processing" },
      { name: "Invoices", path: "/ets/invoices-admin", desc: "GST invoices per order" },
    ],
  },
  {
    title: "China Sourcing",
    pages: [
      { name: "Launches", path: "/ets/launches", desc: "Launch-batch planning: which stores open when" },
      { name: "China batches", path: "/ets/china-batches", desc: "Shipment manifests, CBM, freight, CHA" },
      { name: "Stock overview", path: "/ets/stock-overview", desc: "Live stock across warehouse + stores" },
      { name: "Stock receives", path: "/ets/stock-receives-admin", desc: "GRN + QC on received shipments" },
    ],
  },
  {
    title: "Finance & POS",
    pages: [
      { name: "Finance", path: "/ets/finance", desc: "P&L, cash position, pending receivables" },
      { name: "Payments", path: "/ets/payments", desc: "Payment log — Razorpay + manual" },
      { name: "POS audit", path: "/ets/pos-audit", desc: "Partner POS session + cash-drawer reconciliation" },
      { name: "Sales analytics", path: "/ets/sales-analytics", desc: "Revenue per store / product / period" },
    ],
  },
  {
    title: "Vendors",
    pages: [
      { name: "Vendor orders", path: "/ets/vendor-orders", desc: "POs issued to Indian vendors" },
      { name: "Vendor payouts", path: "/ets/vendor-payouts", desc: "Commission settlement runs" },
      { name: "Vendor detail", path: "/ets/vendors/[id]", desc: "Per-vendor dashboard, products, orders" },
    ],
  },
  {
    title: "Customers",
    pages: [
      { name: "Customers admin", path: "/ets/customers-admin", desc: "End-shopper database across stores" },
      { name: "Client detail", path: "/ets/clients/[id]", desc: "70-column client dossier + journey" },
      { name: "Order detail", path: "/ets/orders/[id]", desc: "Per-order line items, payments, tracking" },
    ],
  },
  {
    title: "Docs & Content",
    pages: [
      { name: "Documents admin", path: "/ets/documents-admin", desc: "Signed docs: MOU, NDA, onboarding" },
      { name: "Templates", path: "/ets/templates", desc: "Doc templates: MOU v1, NDA v2, etc." },
      { name: "Prompts", path: "/ets/prompts", desc: "AI prompt library (5 seeded)" },
    ],
  },
  {
    title: "System",
    pages: [
      { name: "Tasks", path: "/ets/tasks", desc: "Internal dev/ops task board (73 seeded)" },
      { name: "Team", path: "/ets/team", desc: "Internal team directory + roles" },
      { name: "Tickets", path: "/ets/tickets", desc: "Partner/vendor support tickets" },
      { name: "Settings", path: "/ets/settings", desc: "App settings, integrations, webhooks" },
    ],
  },
]

export default function EtsMorePage() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={SUB_NAV_ITEMS} />

      <div>
        <h1 className="text-2xl font-bold">More tools — scaffolded</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These admin pages are planned and route-reserved. They'll be built iteratively — each
          maps to live data in the <code className="text-xs bg-muted px-1 py-0.5 rounded">ets.*</code> schema.
        </p>
      </div>

      <div className="space-y-6">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">
              {group.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.pages.map((p) => (
                <div
                  key={p.path}
                  className="rounded-lg border border-border/80 bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
                        {p.path}
                      </div>
                    </div>
                    <Clock className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-snug">
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
