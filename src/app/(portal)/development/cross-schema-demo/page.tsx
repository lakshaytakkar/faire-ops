import { supabaseAdmin } from "@/lib/supabase.admin"
import { PageHeader } from "@/components/shared/page-header"
import { DetailCard } from "@/components/shared/detail-views"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatCurrency, formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Cross-schema demo · Development",
  description: "Pilot for the admin.* cross-venture view pattern.",
}

type OrderRow = {
  venture: string
  order_id: string
  order_number: string | null
  customer_ref: string | null
  customer_name: string | null
  total: number | null
  currency: string | null
  status: string | null
  item_count: number | null
  created_at: string | null
}

type ClientRow = {
  venture: string
  client_id: string
  external_code: string | null
  name: string | null
  email: string | null
  phone: string | null
  country: string | null
  status: string | null
  created_at: string | null
}

export default async function CrossSchemaDemoPage() {
  const [ordersResult, clientsResult] = await Promise.all([
    supabaseAdmin
      .from("all_active_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("all_clients")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  const orders = (ordersResult.data ?? []) as OrderRow[]
  const clients = (clientsResult.data ?? []) as ClientRow[]
  const ordersErr = ordersResult.error?.message
  const clientsErr = clientsResult.error?.message

  const byVenture = orders.reduce<Record<string, number>>((acc, r) => {
    acc[r.venture] = (acc[r.venture] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Cross-schema demo"
        description="Pilot for admin.all_active_orders and admin.all_clients — unions across every venture. Service-role reads only. External portals cannot see this data."
      />

      {(ordersErr || clientsErr) && (
        <DetailCard title="Migration not yet applied">
          <div className="text-sm space-y-2">
            <p>
              The <code>admin</code> schema hasn&apos;t been created yet. Apply the migration at{" "}
              <code>team-portal/docs/db-migrations/2026-04-17_create_admin_schema_and_pilot_views.sql</code>{" "}
              then refresh this page.
            </p>
            {ordersErr && <p className="text-red-600">orders: {ordersErr}</p>}
            {clientsErr && <p className="text-red-600">clients: {clientsErr}</p>}
          </div>
        </DetailCard>
      )}

      <KPIGrid>
        <MetricCard label="Orders sampled" value={orders.length} />
        <MetricCard label="Clients sampled" value={clients.length} />
        <MetricCard label="Ventures in orders" value={Object.keys(byVenture).length} />
        <MetricCard
          label="Most-active venture"
          value={
            Object.entries(byVenture).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"
          }
        />
      </KPIGrid>

      <DetailCard title="Recent cross-venture orders (50)">
        {orders.length === 0 ? (
          <EmptyState title="No orders" description="No rows returned from admin.all_active_orders." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-semibold">Venture</th>
                  <th className="py-2 pr-3 font-semibold">Order</th>
                  <th className="py-2 pr-3 font-semibold">Customer</th>
                  <th className="py-2 pr-3 font-semibold text-right tabular-nums">Total</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={`${o.venture}-${o.order_id}`} className="border-b last:border-0">
                    <td className="py-2 pr-3">{o.venture}</td>
                    <td className="py-2 pr-3 font-mono text-[0.8125rem]">{o.order_number ?? o.order_id.slice(0, 8)}</td>
                    <td className="py-2 pr-3">{o.customer_name ?? o.customer_ref ?? "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {o.total != null ? formatCurrency(o.total, o.currency ?? "USD") : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <StatusBadge tone={toneForStatus(o.status ?? "")}>{o.status ?? "—"}</StatusBadge>
                    </td>
                    <td className="py-2 pr-3">{o.created_at ? formatDate(o.created_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>

      <DetailCard title="Recent cross-venture clients (50)">
        {clients.length === 0 ? (
          <EmptyState title="No clients" description="No rows returned from admin.all_clients." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-semibold">Venture</th>
                  <th className="py-2 pr-3 font-semibold">Name</th>
                  <th className="py-2 pr-3 font-semibold">Email</th>
                  <th className="py-2 pr-3 font-semibold">Country</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={`${c.venture}-${c.client_id}`} className="border-b last:border-0">
                    <td className="py-2 pr-3">{c.venture}</td>
                    <td className="py-2 pr-3">{c.name ?? "—"}</td>
                    <td className="py-2 pr-3">{c.email ?? "—"}</td>
                    <td className="py-2 pr-3">{c.country ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <StatusBadge tone={toneForStatus(c.status ?? "")}>{c.status ?? "—"}</StatusBadge>
                    </td>
                    <td className="py-2 pr-3">{c.created_at ? formatDate(c.created_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
