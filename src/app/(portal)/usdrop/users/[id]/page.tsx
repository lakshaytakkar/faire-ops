import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { FullPageDetail } from "@/components/shared/detail-views"
import { UserDetailTabs, type StoreItem, type TicketItem, type ActivityItem, type EnrollmentItem, type ModuleCompletionItem, type PicklistItem } from "./user-detail-tabs"
import { UserActionsMenu } from "./user-actions-menu"

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export const dynamic = "force-dynamic"

type Params = { id: string }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params
  return { title: `User ${id.slice(0, 8)} — USDrop | Suprans` }
}

async function fetchUser(id: string) {
  // First fetch profile to get created_at for prev/next queries
  const profile = await supabaseUsdrop
    .from("profiles")
    .select(
      "id, email, full_name, username, avatar_url, account_type, internal_role, status, subscription_status, subscription_plan_id, subscription_started_at, subscription_ends_at, created_at, is_trial, trial_ends_at, credits, phone_number, ecommerce_experience, preferred_niche, onboarding_completed, onboarding_completed_at, onboarding_progress",
    )
    .eq("id", id)
    .maybeSingle()

  if (!profile.data) return { profile: null, plans: [], stores: [] as StoreItem[], tickets: [] as TicketItem[], activity: [] as ActivityItem[], prevId: null, nextId: null, emailTemplates: [] as Array<{ id: string; name: string | null; subject: string | null; type: string | null; category: string | null; is_active: boolean | null }>, planChanges: [] as Array<{ id: string; from_plan: string | null; to_plan: string | null; narration: string | null; proof_url: string | null; performed_by: string | null; created_at: string | null }>, enrollments: [] as EnrollmentItem[], moduleCompletions: [] as ModuleCompletionItem[], picklist: [] as PicklistItem[] }

  const profileCreatedAt = profile.data.created_at

  const [plans, stores, tickets, activity, prev, next, emailTemplates, planChanges, enrollments, moduleCompletions, picklist] = await Promise.all([
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
    // Get previous user (created before this one)
    supabaseUsdrop
      .from("profiles")
      .select("id")
      .lt("created_at", profileCreatedAt)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Get next user (created after this one)
    supabaseUsdrop
      .from("profiles")
      .select("id")
      .gt("created_at", profileCreatedAt)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabaseUsdrop
      .from("email_templates")
      .select("id, name, subject, type, category, is_active")
      .eq("is_active", true),
    supabaseUsdrop
      .from("plan_changes")
      .select("id, from_plan, to_plan, narration, proof_url, performed_by, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    // Course enrollments
    supabaseUsdrop
      .from("course_enrollments")
      .select("id, course_id, status, enrolled_at, completed_at, progress")
      .eq("user_id", id)
      .order("enrolled_at", { ascending: false }),
    // Module completions
    supabaseUsdrop
      .from("module_completions")
      .select("id, module_id, course_id, completed_at, score")
      .eq("user_id", id)
      .order("completed_at", { ascending: false }),
    // Saved products (picklist)
    supabaseUsdrop
      .from("user_picklist")
      .select("id, product_id, product_title, product_image_url, added_at, notes")
      .eq("user_id", id)
      .order("added_at", { ascending: false }),
  ])
  return {
    profile: profile.data,
    plans: (plans.data ?? []) as Array<{ id: string; name: string | null; price_monthly: number | null; price_yearly: number | null }>,
    stores: (stores.data ?? []) as StoreItem[],
    tickets: (tickets.data ?? []) as TicketItem[],
    activity: (activity.data ?? []) as ActivityItem[],
    prevId: (prev.data?.id as string) ?? null,
    nextId: (next.data?.id as string) ?? null,
    emailTemplates: (emailTemplates.data ?? []) as Array<{ id: string; name: string | null; subject: string | null; type: string | null; category: string | null; is_active: boolean | null }>,
    planChanges: (planChanges.data ?? []) as Array<{ id: string; from_plan: string | null; to_plan: string | null; narration: string | null; proof_url: string | null; performed_by: string | null; created_at: string | null }>,
    enrollments: (enrollments.data ?? []) as EnrollmentItem[],
    moduleCompletions: (moduleCompletions.data ?? []) as ModuleCompletionItem[],
    picklist: (picklist.data ?? []) as PicklistItem[],
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
  const { profile, plans, stores, tickets, activity, prevId, nextId, emailTemplates, planChanges, enrollments, moduleCompletions, picklist } = await fetchUser(id)
  if (!profile) notFound()

  const plan = plans.find((p) => p.id === profile.subscription_plan_id)
  const isPro = profile.account_type === "pro" || profile.account_type === "enterprise"

  const profileForActions = {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    status: profile.status,
    account_type: profile.account_type,
    internal_role: profile.internal_role,
    onboarding_completed: profile.onboarding_completed,
    credits: profile.credits,
  }

  const plansForActions = plans.map((p) => ({
    id: p.id,
    name: p.name,
    price_monthly: p.price_monthly,
  }))

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
      actions={
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="size-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ backgroundColor: `hsl(${profile.id.charCodeAt(0) * 137 % 360}, 45%, 55%)` }}
          >
            {getInitials(profile.full_name ?? profile.email ?? "U")}
          </div>
          {/* Actions Menu */}
          <UserActionsMenu profile={profileForActions} plans={plansForActions} />
          {/* Prev/Next */}
          <div className="flex items-center gap-1">
            {prevId ? (
              <Link href={`/usdrop/users/${prevId}`} className="h-8 w-8 rounded-md border flex items-center justify-center hover:bg-muted/40 transition-colors">
                <ChevronLeft className="size-4" />
              </Link>
            ) : (
              <span className="h-8 w-8 rounded-md border flex items-center justify-center opacity-30">
                <ChevronLeft className="size-4" />
              </span>
            )}
            {nextId ? (
              <Link href={`/usdrop/users/${nextId}`} className="h-8 w-8 rounded-md border flex items-center justify-center hover:bg-muted/40 transition-colors">
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span className="h-8 w-8 rounded-md border flex items-center justify-center opacity-30">
                <ChevronRight className="size-4" />
              </span>
            )}
          </div>
        </div>
      }
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
        emailTemplates={emailTemplates}
        planChanges={planChanges}
        enrollments={enrollments}
        moduleCompletions={moduleCompletions}
        picklist={picklist}
      />
    </FullPageDetail>
  )
}
