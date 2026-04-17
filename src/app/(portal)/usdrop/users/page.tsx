import Link from "next/link"
import { Users, Crown, UserCheck, UserX } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { UsersClient, type ProfileRow } from "./users-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Users — USDrop | Suprans" }

type Profile = {
  id: string
  email: string | null
  full_name: string | null
  account_type: string | null
  internal_role: string | null
  status: string | null
  subscription_status: string | null
  created_at: string | null
  onboarding_completed: boolean | null
}

async function fetchProfiles(): Promise<{ rows: Profile[]; count: number }> {
  const { data, count, error } = await supabaseUsdrop
    .from("profiles")
    .select(
      "id, email, full_name, account_type, internal_role, status, subscription_status, created_at, onboarding_completed",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .limit(1000)
  if (error) {
    console.error("usdrop.profiles fetch error:", error)
    return { rows: [], count: 0 }
  }
  return { rows: (data ?? []) as Profile[], count: count ?? 0 }
}

export default async function UsersPage() {
  const [{ rows, count }, totalRes, proRes, inactiveRes, onboardedRes] = await Promise.all([
    fetchProfiles(),
    supabaseUsdrop.from("profiles").select("id", { count: "exact", head: true }),
    supabaseUsdrop.from("profiles").select("id", { count: "exact", head: true }).in("account_type", ["pro", "enterprise"]),
    supabaseUsdrop.from("profiles").select("id", { count: "exact", head: true }).not("status", "eq", "active"),
    supabaseUsdrop.from("profiles").select("id", { count: "exact", head: true }).eq("onboarding_completed", true),
  ])

  const totalCount = totalRes.count ?? 0
  const proCount = proRes.count ?? 0
  const freeCount = totalCount - proCount
  const inactiveCount = inactiveRes.count ?? 0
  const onboardedCount = onboardedRes.count ?? 0

  const profileRows: ProfileRow[] = rows.map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    account_type: p.account_type,
    internal_role: p.internal_role,
    status: p.status,
    subscription_status: p.subscription_status,
    created_at: p.created_at,
    onboarding_completed: p.onboarding_completed,
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        subtitle={`${totalCount.toLocaleString("en-IN")} registered users`}
        actions={
          <Link href="/usdrop/users/create" className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center">
            + Create User
          </Link>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Pro / Enterprise"
          value={proCount}
          icon={Crown}
          iconTone="violet"
          hint="paid tiers"
        />
        <MetricCard
          label="Free tier"
          value={freeCount}
          icon={Users}
          iconTone="slate"
          hint="all users"
        />
        <MetricCard
          label="Onboarded"
          value={onboardedCount}
          icon={UserCheck}
          iconTone="emerald"
          hint="completed setup"
        />
        <MetricCard
          label="Inactive"
          value={inactiveCount}
          icon={UserX}
          iconTone={inactiveCount > 0 ? "red" : "slate"}
          hint="non-active status"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users yet"
          description="New signups from the USDrop app appear here with plan, onboarding progress, and internal role."
        />
      ) : (
        <UsersClient rows={profileRows} />
      )}
    </div>
  )
}
