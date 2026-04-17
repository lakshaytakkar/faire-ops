"use client"

import { useState, useTransition } from "react"
import {
  MoreHorizontal,
  Ban,
  Play,
  Key,
  Trash2,
  Crown,
  ArrowDown,
  Coins,
  Shield,
  CheckCircle2,
  Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { LargeModal } from "@/components/shared/detail-views"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  suspendUser,
  reactivateUser,
  promoteUser,
  demoteUser,
  grantCredits,
  updateInternalRole,
  deleteUser,
  resetPassword,
  forceCompleteOnboarding,
  updateProfile,
} from "../../_actions/user-actions"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserActionsMenuProps {
  profile: {
    id: string
    email: string | null
    full_name: string | null
    status: string | null
    account_type: string | null
    internal_role: string | null
    onboarding_completed: boolean | null
    credits: number | null
  }
  plans: Array<{ id: string; name: string | null; price_monthly: number | null }>
}

type DialogKey =
  | "suspend"
  | "reactivate"
  | "promote"
  | "grant-credits"
  | "update-role"
  | "delete"
  | "edit-profile"
  | null

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function UserActionsMenu({ profile, plans }: UserActionsMenuProps) {
  const [openDialog, setOpenDialog] = useState<DialogKey>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  /* form state ---------------------------------------------------- */
  const [reason, setReason] = useState("")
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? "")
  const [narration, setNarration] = useState("")
  const [proofUrl, setProofUrl] = useState("")
  const [creditAmount, setCreditAmount] = useState(1)
  const [creditReason, setCreditReason] = useState("")
  const [selectedRole, setSelectedRole] = useState(profile.internal_role ?? "none")
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("")

  /* edit profile state */
  const [editName, setEditName] = useState(profile.full_name ?? "")
  const [editEmail, setEditEmail] = useState(profile.email ?? "")
  const [editPhone, setEditPhone] = useState("")

  const isSuspended = profile.status === "suspended"
  const isFree = profile.account_type === "free" || !profile.account_type
  const isProOrAbove =
    profile.account_type === "pro" || profile.account_type === "enterprise"

  function resetFormState() {
    setReason("")
    setNarration("")
    setProofUrl("")
    setCreditAmount(1)
    setCreditReason("")
    setSelectedRole(profile.internal_role ?? "none")
    setDeleteConfirmEmail("")
    setEditName(profile.full_name ?? "")
    setEditEmail(profile.email ?? "")
    setEditPhone("")
    setError(null)
  }

  function close() {
    setOpenDialog(null)
    resetFormState()
  }

  function handleAction(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.error ?? "Something went wrong")
      } else {
        close()
      }
    })
  }

  /* ---------------------------------------------------------------- */
  /*  Quick actions (no dialog)                                        */
  /* ---------------------------------------------------------------- */

  function handleResetPassword() {
    if (!window.confirm(`Send a password reset email to ${profile.email ?? "this user"}?`)) return
    startTransition(async () => {
      const result = await resetPassword(profile.id)
      if (!result.ok) {
        alert(result.error ?? "Failed to reset password")
      } else {
        alert("Password reset email sent successfully.")
      }
    })
  }

  function handleForceOnboarding() {
    if (!window.confirm("Mark onboarding as completed for this user?")) return
    startTransition(async () => {
      const result = await forceCompleteOnboarding(profile.id)
      if (!result.ok) {
        alert(result.error ?? "Failed to complete onboarding")
      } else {
        alert("Onboarding marked as completed.")
      }
    })
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              Actions <MoreHorizontal className="ml-1" />
            </Button>
          }
        />

        <DropdownMenuContent align="end">
          {/* Account group */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Account</DropdownMenuLabel>

            <DropdownMenuItem onClick={() => setOpenDialog("edit-profile")}>
              <Pencil /> Edit Profile
            </DropdownMenuItem>

            {isSuspended ? (
              <DropdownMenuItem onClick={() => setOpenDialog("reactivate")}>
                <Play /> Reactivate User
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setOpenDialog("suspend")}>
                <Ban /> Suspend User
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={handleResetPassword}>
              <Key /> Reset Password
            </DropdownMenuItem>

            <DropdownMenuItem
              variant="destructive"
              onClick={() => setOpenDialog("delete")}
            >
              <Trash2 /> Delete User
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Plan group */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Plan</DropdownMenuLabel>

            {!isProOrAbove && (
              <DropdownMenuItem onClick={() => setOpenDialog("promote")}>
                <Crown /> Promote to Pro
              </DropdownMenuItem>
            )}

            {!isFree && (
              <DropdownMenuItem onClick={() => {
                handleAction(() => demoteUser(profile.id))
              }}>
                <ArrowDown /> Demote to Free
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={() => setOpenDialog("grant-credits")}>
              <Coins /> Grant Credits
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Admin group */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Admin</DropdownMenuLabel>

            <DropdownMenuItem onClick={() => setOpenDialog("update-role")}>
              <Shield /> Update Internal Role
            </DropdownMenuItem>

            {!profile.onboarding_completed && (
              <DropdownMenuItem onClick={handleForceOnboarding}>
                <CheckCircle2 /> Force Complete Onboarding
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* -------------------------------------------------------------- */}
      {/*  Dialogs                                                        */}
      {/* -------------------------------------------------------------- */}

      {/* Edit Profile */}
      {openDialog === "edit-profile" && (
        <LargeModal title="Edit Profile" onClose={close} footer={
          <>
            <Button variant="outline" size="sm" onClick={close}>Cancel</Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => handleAction(() => updateProfile(profile.id, {
                full_name: editName,
                email: editEmail,
                phone_number: editPhone || undefined,
              }))}
            >
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </>
        }>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Full name</label>
              <input
                type="text"
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Phone number</label>
              <input
                type="text"
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={profile.email ?? ""}
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </LargeModal>
      )}

      {/* Suspend */}
      {openDialog === "suspend" && (
        <LargeModal title="Suspend User" onClose={close} footer={
          <>
            <Button variant="outline" size="sm" onClick={close}>Cancel</Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isPending}
              onClick={() => handleAction(() => suspendUser(profile.id, reason))}
            >
              {isPending ? "Suspending..." : "Suspend"}
            </Button>
          </>
        }>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Suspending <span className="font-semibold text-foreground">{profile.full_name ?? profile.email ?? profile.id}</span> will
              immediately revoke their access. They will not be able to log in until reactivated.
            </p>
            <div>
              <label className="text-sm font-medium text-foreground">Reason</label>
              <textarea
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                placeholder="Why is this user being suspended?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </LargeModal>
      )}

      {/* Reactivate */}
      {openDialog === "reactivate" && (
        <LargeModal title="Reactivate User" onClose={close} footer={
          <>
            <Button variant="outline" size="sm" onClick={close}>Cancel</Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => handleAction(() => reactivateUser(profile.id, reason))}
            >
              {isPending ? "Reactivating..." : "Reactivate"}
            </Button>
          </>
        }>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Reactivating <span className="font-semibold text-foreground">{profile.full_name ?? profile.email ?? profile.id}</span> will
              restore their access. They will be able to log in again.
            </p>
            <div>
              <label className="text-sm font-medium text-foreground">Reason</label>
              <textarea
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                placeholder="Why is this user being reactivated?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </LargeModal>
      )}

      {/* Promote */}
      {openDialog === "promote" && (
        <LargeModal title="Promote to Pro" onClose={close} footer={
          <>
            <Button variant="outline" size="sm" onClick={close}>Cancel</Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => handleAction(() => promoteUser(profile.id, {
                to_plan: "pro",
                plan_id: selectedPlanId || undefined,
                narration: narration || undefined,
                proof_url: proofUrl || undefined,
              }))}
            >
              {isPending ? "Promoting..." : "Confirm Promotion"}
            </Button>
          </>
        }>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Current Plan</span>
              <span className="text-sm font-semibold text-foreground capitalize">
                {profile.account_type ?? "free"}
              </span>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Target Plan</label>
              <select
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name ?? plan.id}
                    {plan.price_monthly != null ? ` — $${(plan.price_monthly / 100).toFixed(2)}/mo` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Notes / Reason (optional)</label>
              <textarea
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                placeholder="Internal notes about this promotion"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Payment proof URL (optional)</label>
              <input
                type="text"
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://..."
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
              />
            </div>

            <p className="text-sm text-amber-600">
              This will upgrade the user immediately.
            </p>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </LargeModal>
      )}

      {/* Grant Credits */}
      {openDialog === "grant-credits" && (
        <LargeModal title="Grant Credits" onClose={close} footer={
          <>
            <Button variant="outline" size="sm" onClick={close}>Cancel</Button>
            <Button
              size="sm"
              disabled={isPending || creditAmount < 1}
              onClick={() => handleAction(() => grantCredits(profile.id, creditAmount, creditReason))}
            >
              {isPending ? "Granting..." : "Grant Credits"}
            </Button>
          </>
        }>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Current Credits</span>
              <span className="text-sm font-semibold text-foreground">
                {profile.credits ?? 0}
              </span>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Amount</label>
              <input
                type="number"
                min={1}
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={creditAmount}
                onChange={(e) => setCreditAmount(Math.max(1, Number(e.target.value)))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Reason</label>
              <textarea
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                placeholder="Why are credits being granted?"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </LargeModal>
      )}

      {/* Update Role */}
      {openDialog === "update-role" && (
        <LargeModal title="Update Internal Role" onClose={close} footer={
          <>
            <Button variant="outline" size="sm" onClick={close}>Cancel</Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => handleAction(() => updateInternalRole(profile.id, selectedRole))}
            >
              {isPending ? "Updating..." : "Update"}
            </Button>
          </>
        }>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Internal Role</label>
              <select
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="none">None</option>
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
                <option value="support">Support</option>
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </LargeModal>
      )}

      {/* Delete */}
      {openDialog === "delete" && (
        <LargeModal title="Delete User" onClose={close} footer={
          <>
            <Button variant="outline" size="sm" onClick={close}>Cancel</Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={isPending}
              onClick={() => handleAction(() => deleteUser(profile.id, false))}
            >
              {isPending ? "Deleting..." : "Soft Delete (set inactive)"}
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isPending || deleteConfirmEmail !== (profile.email ?? "")}
              onClick={() => handleAction(() => deleteUser(profile.id, true))}
            >
              {isPending ? "Deleting..." : "Permanently Delete"}
            </Button>
          </>
        }>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Soft delete</strong> will set the user to inactive status. Their data will be preserved
              and the account can be restored later.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong className="text-red-600">Permanent delete</strong> will irreversibly remove all data associated with this user.
              This action cannot be undone.
            </p>

            <div>
              <label className="text-sm font-medium text-foreground">
                To permanently delete, type the user&apos;s email: <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{profile.email}</code>
              </label>
              <input
                type="text"
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={profile.email ?? "user@example.com"}
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </LargeModal>
      )}
    </>
  )
}
