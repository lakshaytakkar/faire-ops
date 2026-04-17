import Link from "next/link"
import { Package, Users, Layers, Truck, ArrowRight, type LucideIcon } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Overview — ETS | Suprans" }

/* ---------- types ---------- */
interface ClientRow {
  id: string
  name: string | null
  stage: string | null
  is_lost: boolean | null
  city: string | null
  phone: string | null
  created_at: string | null
}

interface CategoryRow {
  id: string
  name: string | null
  product_count: number | null
}

/* ---------- page ---------- */
export default async function EtsOverviewPage() {
  /* --- parallel data fetches --- */
  const [
    productsRes,
    clientsCountRes,
    categoriesCountRes,
    vendorsCountRes,
    clientsRes,
    categoriesRes,
  ] = await Promise.all([
    supabaseEts.from("products").select("id", { count: "exact", head: true }),
    supabaseEts
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("is_lost", false),
    supabaseEts.from("categories").select("id", { count: "exact", head: true }),
    supabaseEts
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabaseEts
      .from("clients")
      .select("id, name, stage, is_lost, city, phone, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabaseEts
      .from("categories")
      .select("id, name, product_count")
      .order("product_count", { ascending: false })
      .limit(7),
  ])

  const totalProducts = productsRes.count ?? 0
  const activeClients = clientsCountRes.count ?? 0
  const totalCategories = categoriesCountRes.count ?? 0
  const activeVendors = vendorsCountRes.count ?? 0
  const clients = (clientsRes.data as ClientRow[]) ?? []
  const topCategories = (categoriesRes.data as CategoryRow[]) ?? []

  /* --- stage pipeline --- */
  const stageCounts: Record<string, number> = {}
  for (const c of clients) {
    const s = c.stage ?? "unknown"
    stageCounts[s] = (stageCounts[s] ?? 0) + 1
  }
  const stageEntries = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])
  const maxStageCount = Math.max(...stageEntries.map(([, v]) => v), 1)

  /* --- top categories max --- */
  const maxCatCount = Math.max(
    ...topCategories.map((c) => c.product_count ?? 0),
    1,
  )

  /* --- recent 10 --- */
  const recentClients = clients.slice(0, 10)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* ─── 1. Hero Banner ─── */}
      <section
        className="relative overflow-hidden rounded-xl px-8 py-10"
        style={{
          background:
            "linear-gradient(135deg, hsl(25,50%,12%) 0%, hsl(30,70%,35%) 100%)",
        }}
      >
        <div className="relative z-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-300/80">
            EazyToSell
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white font-heading">
            Store Launch Program
          </h1>
          <p className="mt-1.5 text-sm text-white/60">
            Products, clients &amp; operations management
          </p>

          <div className="mt-8 flex gap-10">
            <HeroStat label="Products" value={totalProducts} />
            <HeroStat label="Clients" value={activeClients} />
            <HeroStat label="Vendors" value={activeVendors} />
          </div>
        </div>

        {/* decorative circles */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-white/5" />
      </section>

      {/* ─── 2. KPI Stat Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Products"
          value={totalProducts}
          icon={Package}
          color="#3b82f6"
        />
        <StatCard
          label="Active Clients"
          value={activeClients}
          icon={Users}
          color="#10b981"
        />
        <StatCard
          label="Categories"
          value={totalCategories}
          icon={Layers}
          color="#8b5cf6"
        />
        <StatCard
          label="Active Vendors"
          value={activeVendors}
          icon={Truck}
          color="#f59e0b"
        />
      </div>

      {/* ─── 3. Two-column grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Client Pipeline */}
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
            Client Pipeline
          </div>
          <div className="p-5 space-y-3">
            {stageEntries.length === 0 && (
              <p className="text-sm text-muted-foreground">No client data</p>
            )}
            {stageEntries.map(([stage, count]) => (
              <div key={stage} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize font-medium">{stage}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(count / maxStageCount) * 100}%`,
                      backgroundColor: stageColor(stage),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Categories */}
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
            Top Categories
          </div>
          <div className="p-5 space-y-3">
            {topCategories.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No category data
              </p>
            )}
            {topCategories.map((cat) => (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate max-w-[70%]">
                    {cat.name ?? "Unnamed"}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {(cat.product_count ?? 0).toLocaleString()} products
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all"
                    style={{
                      width: `${((cat.product_count ?? 0) / maxCatCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 4. Recent Clients Table ─── */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
          Recent Clients
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentClients.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No clients found
                </TableCell>
              </TableRow>
            )}
            {recentClients.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge tone={toneForStatus(c.stage)}>
                    {c.stage ?? "—"}
                  </StatusBadge>
                </TableCell>
                <TableCell>{c.city ?? "—"}</TableCell>
                <TableCell>{c.phone ?? "—"}</TableCell>
                <TableCell className="tabular-nums">
                  {formatDate(c.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ─── 5. Quick Actions ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction
          href="/ets/catalog/products"
          title="Product Catalog"
          description="Browse and manage the full product catalog"
        />
        <QuickAction
          href="/ets/sales/pipeline"
          title="Client Pipeline"
          description="Track clients from lead to launch"
        />
        <QuickAction
          href="/ets/supply/launches"
          title="Supply Chain"
          description="Launches, batches and dispatch tracking"
        />
      </div>
    </div>
  )
}

/* ================================================================
   Inline components
   ================================================================ */

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-bold text-white tabular-nums">
        {value.toLocaleString()}
      </div>
      <div className="mt-0.5 text-sm text-white/50">{label}</div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: LucideIcon
  color: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <span
          className="inline-flex size-9 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
        {value.toLocaleString()}
      </div>
    </div>
  )
}

function QuickAction({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-lg border border-border bg-card p-5 shadow-sm hover:bg-muted/40 transition-colors"
    >
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">
          {description}
        </div>
      </div>
      <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  )
}

/* --- helpers --- */
const STAGE_COLORS: Record<string, string> = {
  lead: "#3b82f6",
  proposal: "#f59e0b",
  signed: "#10b981",
  launched: "#059669",
  lost: "#ef4444",
  unknown: "#94a3b8",
}

function stageColor(stage: string): string {
  return STAGE_COLORS[stage.toLowerCase()] ?? "#6366f1"
}
