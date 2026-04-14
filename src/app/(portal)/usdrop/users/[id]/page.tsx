import { notFound } from "next/navigation"
import { supabaseUsdrop } from "@/lib/supabase"
import { FullPageDetail } from "@/components/shared/detail-views"
import { UserDetailTabs, type StoreItem, type TicketItem, type ActivityItem } from "./user-detail-tabs"

export const dynamic = "force-dynamic"

type Params = { id: string }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params
  return { title: `User ${id.slice(0, 8)} — USDrop | Suprans` }
}

async function fetchUser(id: string) {
  const [profile, plans, stores, tickets, activity] = await Promise.all([
    supabaseUsdrop
      .from("profiles")
      .select(
        "id, email, full_name, username, avatar_url, account_type, internal_role, status, subscription_status, subscription_plan_id, subscription_started_at, subscription_ends_at, created_at, is_trial, trial_ends_at, credits, phone_number, ecommerce_experience, preferred_niche, onboarding_completed, onboarding_completed_at, onboarding_progress",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseUsdrop.from("subscription_plans").select("id, name, price_monthly, price_yearly"),
    supabaseUsdrop
      .from("shopify_stores")
      .select("id, shop_domain, store_name, plan, is_active, last_synced_at, currency")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    supabaseUsdrop
      .from("support_tickets")
      .select("id, title, type, priority, status, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseUsdrop
      .from("user_activity_log")
      .select("id, activity_type, activity_data, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(25),
  ])
  return {
    profile: profile.data,
    plans: (plans.data ?? []) as Array<{ id: string; name: string | null }>,
    stores: (stores.data ?? []) as StoreItem[],
    tickets: (tickets.data ?? []) as TicketItem[],
    activity: (activity.data ?? []) as ActivityItem[],
  }
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return d
  }
}

export default async function UsdropUserDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params
  const { profile, plans, stores, tickets, activity } = await fetchUser(id)
  if (!profile) notFound()

  const plan = plans.find((p) => p.id === profile.subscription_plan_id)
  const isPro = profile.account_type === "pro" || profile.account_type === "enterprise"

  const statusLabel = (profile.status ?? "active").toLowerCase()
  const statusTone =
    statusLabel === "active"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
      : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200"

  return (
    <FullPageDetail
      backLink={{ href: "/usdrop/users", label: "All users" }}
      title={profile.full_name ?? profile.email ?? "Unnamed"}
      subtitle={profile.email ?? undefined}
      badges={[
        {
          label: profile.account_type ?? "free",
          className: isPro
            ? "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200"
            : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
        },
        ...(profile.internal_role && profile.internal_role !== "none"
          ? [
              {
                label: profile.internal_role,
                className:
                  "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
              },
            ]
          : []),
        { label: statusLabel, className: statusTone },
      ]}
    >
      <UserDetailTabs
        profile={{
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          username: profile.username,
          account_type: profile.account_type,
          internal_role: profile.internal_role,
          status: profile.status,
          subscription_status: profile.subscription_status,
          subscription_started_at: profile.subscription_started_at,
          subscription_ends_at: profile.subscription_ends_at,
          created_at: profile.created_at,
          is_trial: profile.is_trial,
          trial_ends_at: profile.trial_ends_at,
          credits: profile.credits,
          phone_number: profile.phone_number,
          ecommerce_experience: profile.ecommerce_experience,
          preferred_niche: profile.preferred_niche,
          onboarding_completed: profile.onboarding_completed,
          onboarding_completed_at: profile.onboarding_completed_at,
          onboarding_progress: profile.onboarding_progress,
        }}
        planName={plan?.name ?? null}
        joinedLabel={formatDate(profile.created_at)}
        stores={stores}
        tickets={tickets}
        activity={activity}
      />
    </FullPageDetail>
  )
}
