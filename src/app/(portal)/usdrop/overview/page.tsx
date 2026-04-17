import Link from "next/link"
import {
  Package,
  Users,
  Layers,
  BookOpen,
  ArrowRight,
  Truck,
  type LucideIcon,
} from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { StatusBadge } from "@/components/shared/status-badge"

export const dynamic = "force-dynamic"
export const metadata = { title: "Overview — USDrop | Suprans" }

/* ── Types ────────────────────────────────────────────────────────── */
interface ProfileRow {
  subscription_status: string | null
}

interface CourseRow {
  id: string
  title: string | null
  published: boolean | null
  level: string | null
  lessons_count: number | null
  students_count: number | null
}

interface CategoryRow {
  id: string
  name: string | null
}

/* ── Data fetching ────────────────────────────────────────────────── */
async function fetchDashboard() {
  const [
    profilesCount,
    productsCount,
    categoriesCount,
    coursesCount,
    suppliersCount,
    profilesRes,
    coursesRes,
    categoriesRes,
    productsByCat,
  ] = await Promise.all([
    supabaseUsdrop.from("profiles").select("id", { count: "exact", head: true }),
    supabaseUsdrop.from("products").select("id", { count: "exact", head: true }),
    supabaseUsdrop.from("categories").select("id", { count: "exact", head: true }),
    supabaseUsdrop.from("courses").select("id", { count: "exact", head: true }),
    supabaseUsdrop.from("suppliers").select("id", { count: "exact", head: true }),
    supabaseUsdrop
      .from("profiles")
      .select("subscription_status")
      .limit(5000),
    supabaseUsdrop
      .from("courses")
      .select("id, title, published, level, lessons_count, students_count")
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseUsdrop
      .from("categories")
      .select("id, name")
      .limit(100),
    supabaseUsdrop
      .from("products")
      .select("category_id")
      .limit(50000),
  ])

  return {
    totalProfiles: profilesCount.count ?? 0,
    totalProducts: productsCount.count ?? 0,
    totalCategories: categoriesCount.count ?? 0,
    totalCourses: coursesCount.count ?? 0,
    totalSuppliers: suppliersCount.count ?? 0,
    profiles: (profilesRes.data ?? []) as ProfileRow[],
    courses: (coursesRes.data ?? []) as CourseRow[],
    categories: (categoriesRes.data ?? []) as CategoryRow[],
    productCategories: (productsByCat.data ?? []) as Array<{ category_id: string | null }>,
  }
}

/* ── Helpers ──────────────────────────────────────────────────────── */
function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`
  return n.toLocaleString("en-IN")
}

function levelTone(level: string | null): "blue" | "amber" | "red" | "slate" {
  switch (level?.toLowerCase()) {
    case "beginner":
      return "blue"
    case "intermediate":
      return "amber"
    case "advanced":
      return "red"
    default:
      return "slate"
  }
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default async function UsdropOverviewPage() {
  const {
    totalProfiles,
    totalProducts,
    totalCategories,
    totalCourses,
    totalSuppliers,
    profiles,
    courses,
    categories,
    productCategories,
  } = await fetchDashboard()

  /* ── User breakdown by subscription_status ─────────────────────── */
  const statusMap = new Map<string, number>()
  for (const p of profiles) {
    const s = p.subscription_status || "Unknown"
    statusMap.set(s, (statusMap.get(s) || 0) + 1)
  }
  const statusEntries = [...statusMap.entries()].sort((a, b) => b[1] - a[1])
  const maxStatusCount = Math.max(...statusEntries.map(([, c]) => c), 1)

  /* ── Category product counts ───────────────────────────────────── */
  const catCountMap = new Map<string, number>()
  for (const p of productCategories) {
    const cid = p.category_id ?? "uncategorized"
    catCountMap.set(cid, (catCountMap.get(cid) || 0) + 1)
  }
  const catIdToName = new Map(categories.map((c) => [c.id, c.name ?? "Unnamed"]))
  const categoryRows = categories
    .map((c) => ({
      id: c.id,
      name: c.name ?? "Unnamed",
      count: catCountMap.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count)

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* ── 1. Hero Banner ─────────────────────────────────────── */}
      <div
        className="rounded-md px-8 py-7 text-white"
        style={{
          background:
            "linear-gradient(135deg, hsl(260,50%,12%) 0%, hsl(270,70%,35%) 100%)",
        }}
      >
        <p className="text-sm font-medium opacity-75">USDrop</p>
        <h1 className="mt-1 text-3xl font-bold font-heading tracking-tight">
          AI-Powered Dropshipping Platform
        </h1>
        <p className="mt-1 text-sm opacity-60">
          Product catalog, users &amp; course management
        </p>
        <div className="mt-5 flex items-center gap-8">
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {fmtCount(totalProducts)}
            </p>
            <p className="text-xs opacity-50">Products</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {fmtCount(totalProfiles)}
            </p>
            <p className="text-xs opacity-50">Users</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{totalSuppliers}</p>
            <p className="text-xs opacity-50">Suppliers</p>
          </div>
        </div>
      </div>

      {/* ── 2. KPI Stat Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Products"
          value={totalProducts.toLocaleString("en-IN")}
          hint={`across ${totalCategories} categories`}
          icon={Package}
          color="#3b82f6"
        />
        <StatCard
          label="Active Users"
          value={totalProfiles.toLocaleString("en-IN")}
          hint="registered profiles"
          icon={Users}
          color="#10b981"
        />
        <StatCard
          label="Categories"
          value={totalCategories.toLocaleString("en-IN")}
          hint="product taxonomy"
          icon={Layers}
          color="#8b5cf6"
        />
        <StatCard
          label="Courses"
          value={totalCourses.toLocaleString("en-IN")}
          hint="learning modules"
          icon={BookOpen}
          color="#f59e0b"
        />
      </div>

      {/* ── 3. Two-column: User Breakdown | Course Catalog ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Breakdown */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <span className="text-[0.9375rem] font-semibold tracking-tight">
              User Breakdown
            </span>
            <Link
              href="/usdrop/users"
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y">
            {statusEntries.map(([status, count]) => {
              const pct = Math.round((count / maxStatusCount) * 100)
              return (
                <div
                  key={status}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium">{status}</p>
                      <span className="text-sm font-bold tabular-nums shrink-0">
                        {count.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all bg-violet-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            {statusEntries.length === 0 && (
              <div className="px-5 py-6 text-sm text-muted-foreground text-center">
                No user data available
              </div>
            )}
          </div>
        </div>

        {/* Course Catalog */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <span className="text-[0.9375rem] font-semibold tracking-tight">
              Course Catalog
            </span>
            <Link
              href="/usdrop/courses"
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y">
            {courses.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors"
              >
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#8b5cf618" }}
                >
                  <BookOpen className="h-4 w-4" style={{ color: "#8b5cf6" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {c.title ?? "Untitled"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge tone={c.published ? "emerald" : "slate"}>
                      {c.published ? "Published" : "Draft"}
                    </StatusBadge>
                    {c.level && (
                      <StatusBadge tone={levelTone(c.level)}>
                        {c.level}
                      </StatusBadge>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {c.lessons_count != null && (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {c.lessons_count} lessons
                    </p>
                  )}
                  {c.students_count != null && (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {c.students_count} students
                    </p>
                  )}
                </div>
              </div>
            ))}
            {courses.length === 0 && (
              <div className="px-5 py-6 text-sm text-muted-foreground text-center">
                No courses found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Top Categories ──────────────────────────────────── */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="border-b px-5 py-3.5 text-[0.9375rem] font-semibold tracking-tight">
          Top Categories
        </div>
        <div className="p-5">
          {categoryRows.length > 0 ? (
            <>
              <div className="h-6 rounded-full overflow-hidden flex">
                {categoryRows.filter((c) => c.count > 0).map((c) => {
                  const pct = totalProducts > 0 ? (c.count / totalProducts) * 100 : 0
                  if (pct < 0.5) return null
                  return (
                    <div
                      key={c.id}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: `hsl(${(parseInt(c.id, 36) * 137) % 360}, 55%, 50%)`,
                      }}
                      title={`${c.name}: ${c.count}`}
                    />
                  )
                })}
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categoryRows.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-md border border-border/60 px-3.5 py-2.5 hover:bg-muted/20 transition-colors"
                  >
                    <span className="text-sm font-medium truncate">
                      {c.name}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-muted-foreground ml-2 shrink-0">
                      {c.count.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No categories found.
            </p>
          )}
        </div>
      </div>

      {/* ── 5. Quick Actions ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/usdrop/products"
          className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow block"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex size-9 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
              <Package className="size-4" />
            </span>
            <span className="text-[0.9375rem] font-semibold tracking-tight">
              Product Catalog
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {totalProducts.toLocaleString("en-IN")} products in the catalog
          </p>
        </Link>

        <Link
          href="/usdrop/users"
          className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow block"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex size-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
              <Users className="size-4" />
            </span>
            <span className="text-[0.9375rem] font-semibold tracking-tight">
              User Directory
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {totalProfiles.toLocaleString("en-IN")} registered users
          </p>
        </Link>

        <Link
          href="/usdrop/courses"
          className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow block"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex size-9 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
              <BookOpen className="size-4" />
            </span>
            <span className="text-[0.9375rem] font-semibold tracking-tight">
              Course Manager
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {totalCourses} courses available
          </p>
        </Link>
      </div>
    </div>
  )
}

/* ── Inline Stat Card (matches LegalNations overview pattern) ────── */
function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  color,
  highlight,
}: {
  label: string
  value: string | number
  hint: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={`text-2xl font-bold font-heading mt-2 tabular-nums ${highlight ? "text-red-600" : ""}`}
        >
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </div>
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}18` }}
      >
        <span style={{ color }}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  )
}
