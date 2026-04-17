"use server"

import { revalidatePath } from "next/cache"
import { usdropAdmin, type ActionResult } from "./_client"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function logAdminAction(
  userId: string,
  activityType: string,
  data: Record<string, unknown>,
) {
  await usdropAdmin()
    .from("user_activity_log")
    .insert({
      user_id: userId,
      activity_type: activityType,
      activity_data: { performed_by: "admin", ...data },
    })
}

const USERS_PATH = "/usdrop/users"

// ---------------------------------------------------------------------------
// 0. updateProfile (edit profile fields)
// ---------------------------------------------------------------------------

export async function updateProfile(
  id: string,
  fields: {
    full_name?: string
    email?: string
    phone_number?: string
    username?: string
    preferred_niche?: string
    ecommerce_experience?: string
  },
): Promise<ActionResult> {
  try {
    const update: Record<string, unknown> = {}
    if (fields.full_name !== undefined) update.full_name = fields.full_name
    if (fields.email !== undefined) update.email = fields.email
    if (fields.phone_number !== undefined) update.phone_number = fields.phone_number
    if (fields.username !== undefined) update.username = fields.username
    if (fields.preferred_niche !== undefined) update.preferred_niche = fields.preferred_niche
    if (fields.ecommerce_experience !== undefined) update.ecommerce_experience = fields.ecommerce_experience

    if (Object.keys(update).length === 0) return { ok: false, error: "No fields to update" }

    const { error } = await usdropAdmin()
      .from("profiles")
      .update(update)
      .eq("id", id)
    if (error) return { ok: false, error: error.message }

    await logAdminAction(id, "admin_edit_profile", { fields: Object.keys(update) })
    revalidatePath(USERS_PATH)
    revalidatePath(`${USERS_PATH}/${id}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

// ---------------------------------------------------------------------------
// 1. suspendUser
// ---------------------------------------------------------------------------

export async function suspendUser(
  id: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const { error } = await usdropAdmin()
      .from("profiles")
      .update({ status: "suspended" })
      .eq("id", id)
    if (error) return { ok: false, error: error.message }

    await logAdminAction(id, "admin_suspend", { reason })
    revalidatePath(USERS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

// ---------------------------------------------------------------------------
// 2. reactivateUser
// ---------------------------------------------------------------------------

export async function reactivateUser(
  id: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const { error } = await usdropAdmin()
      .from("profiles")
      .update({ status: "active" })
      .eq("id", id)
    if (error) return { ok: false, error: error.message }

    await logAdminAction(id, "admin_reactivate", { reason })
    revalidatePath(USERS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

// ---------------------------------------------------------------------------
// 3. resetPassword
// ---------------------------------------------------------------------------

export async function resetPassword(email: string): Promise<ActionResult> {
  try {
    // Profiles aren't linked to auth.users — log the request and return
    // instructions for the admin to handle manually.
    await usdropAdmin()
      .from("user_activity_log")
      .insert({
        user_id: null,
        activity_type: "admin_password_reset_request",
        activity_data: { performed_by: "admin", email },
      })

    revalidatePath(USERS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

// ---------------------------------------------------------------------------
// 4. createUser
// ---------------------------------------------------------------------------

export async function createUser(payload: {
  email: string
  full_name: string
  phone_number?: string
  account_type?: string
}): Promise<ActionResult> {
  try {
    const row = {
      email: payload.email,
      full_name: payload.full_name,
      phone_number: payload.phone_number ?? null,
      account_type: payload.account_type ?? "free",
      status: "active",
      onboarding_completed: false,
      onboarding_progress: 0,
      credits: 0,
      subscription_status: "inactive",
    }

    const { data, error } = await usdropAdmin()
      .from("profiles")
      .insert(row)
      .select("id")
      .single()
    if (error) return { ok: false, error: error.message }

    await logAdminAction(data.id, "admin_create_user", {
      email: payload.email,
      full_name: payload.full_name,
    })
    revalidatePath(USERS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

// ---------------------------------------------------------------------------
// 5. deleteUser
// ---------------------------------------------------------------------------

export async function deleteUser(
  id: string,
  hard?: boolean,
): Promise<ActionResult> {
  try {
    if (hard) {
      const { error } = await usdropAdmin()
        .from("profiles")
        .delete()
        .eq("id", id)
      if (error) return { ok: false, error: error.message }
    } else {
      const { error } = await usdropAdmin()
        .from("profiles")
        .update({ status: "deleted" })
        .eq("id", id)
      if (error) return { ok: false, error: error.message }
    }

    await logAdminAction(id, hard ? "admin_hard_delete" : "admin_soft_delete", {})
    revalidatePath(USERS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

// ---------------------------------------------------------------------------
// 6. promoteUser
// ---------------------------------------------------------------------------

export async function promoteUser(
  id: string,
  opts: {
    to_plan: string
    plan_id?: string
    narration?: string
    proof_url?: string
  },
): Promise<ActionResult> {
  try {
    const admin = usdropAdmin()

    // Fetch current profile for from_plan
    const { data: profile, error: fetchErr } = await admin
      .from("profiles")
      .select("account_type")
      .eq("id", id)
      .single()
    if (fetchErr) return { ok: false, error: fetchErr.message }

    const fromPlan = (profile as Record<string, unknown>).account_type as string

    // Update profile
    const { error: updateErr } = await admin
      .from("profiles")
      .update({
        account_type: opts.to_plan,
        subscription_status: "active",
        subscription_started_at: new Date().toISOString(),
        subscription_plan_id: opts.plan_id ?? null,
      })
      .eq("id", id)
    if (updateErr) return { ok: false, error: updateErr.message }

    // Insert plan change record
    await admin.from("plan_changes").insert({
      user_id: id,
      from_plan: fromPlan,
      to_plan: opts.to_plan,
      narration: opts.narration ?? null,
      proof_url: opts.proof_url ?? null,
    })

    await logAdminAction(id, "admin_promote", {
      from_plan: fromPlan,
      to_plan: opts.to_plan,
      plan_id: opts.plan_id ?? null,
    })
    revalidatePath(USERS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

// ---------------------------------------------------------------------------
// 7. demoteUser
// ---------------------------------------------------------------------------

export async function demoteUser(id: string): Promise<ActionResult> {
  try {
    const admin = usdropAdmin()

    // Fetch current profile for from_plan
    const { data: profile, error: fetchErr } = await admin
      .from("profiles")
      .select("account_type")
      .eq("id", id)
      .single()
    if (fetchErr) return { ok: false, error: fetchErr.message }

    const fromPlan = (profile as Record<string, unknown>).account_type as string

    // Update profile
    const { error: updateErr } = await admin
      .from("profiles")
      .update({
        account_type: "free",
        subscription_status: "inactive",
      })
      .eq("id", id)
    if (updateErr) return { ok: false, error: updateErr.message }

    // Insert plan change record
    await admin.from("plan_changes").insert({
      user_id: id,
      from_plan: fromPlan,
      to_plan: "free",
      narration: "Demoted by admin",
    })

    await logAdminAction(id, "admin_demote", { from_plan: fromPlan })
    revalidatePath(USERS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

// ---------------------------------------------------------------------------
// 8. grantCredits
// ---------------------------------------------------------------------------

export async function grantCredits(
  id: string,
  amount: number,
  reason: string,
): Promise<ActionResult> {
  try {
    const admin = usdropAdmin()

    // Fetch current credits
    const { data: profile, error: fetchErr } = await admin
      .from("profiles")
      .select("credits")
      .eq("id", id)
      .single()
    if (fetchErr) return { ok: false, error: fetchErr.message }

    const oldCredits = ((profile as Record<string, unknown>).credits as number) ?? 0
    const newCredits = oldCredits + amount

    const { error: updateErr } = await admin
      .from("profiles")
      .update({ credits: newCredits })
      .eq("id", id)
    if (updateErr) return { ok: false, error: updateErr.message }

    await logAdminAction(id, "admin_grant_credits", {
      amount,
      reason,
      old_credits: oldCredits,
      new_credits: newCredits,
    })
    revalidatePath(USERS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

// ---------------------------------------------------------------------------
// 9. updateInternalRole
// ---------------------------------------------------------------------------

export async function updateInternalRole(
  id: string,
  role: string,
): Promise<ActionResult> {
  try {
    const { error } = await usdropAdmin()
      .from("profiles")
      .update({ internal_role: role })
      .eq("id", id)
    if (error) return { ok: false, error: error.message }

    await logAdminAction(id, "admin_update_role", { role })
    revalidatePath(USERS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

// ---------------------------------------------------------------------------
// 10. forceCompleteOnboarding
// ---------------------------------------------------------------------------

export async function forceCompleteOnboarding(
  id: string,
): Promise<ActionResult> {
  try {
    const { error } = await usdropAdmin()
      .from("profiles")
      .update({
        onboarding_completed: true,
        onboarding_progress: 100,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", id)
    if (error) return { ok: false, error: error.message }

    await logAdminAction(id, "admin_force_onboarding", {})
    revalidatePath(USERS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}
