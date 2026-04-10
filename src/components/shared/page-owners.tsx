"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Users, X, Crown, Briefcase, UserCheck, UserPlus, Trash2, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PageOwnersProps {
  pageRoute: string
}

interface Owner {
  id: string
  page_route: string
  user_id: string
  role: "owner" | "manager" | "executive" | "contributor"
  notes: string | null
  created_at: string
  user?: {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
    phone: string | null
  } | null
}

interface UserOption {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  phone: string | null
}

const ROLE_META: Record<string, { label: string; icon: typeof Crown; badge: string; weight: number }> = {
  executive:   { label: "Executive",   icon: Crown,     badge: "bg-amber-50 text-amber-700 border-amber-200",     weight: 3 },
  manager:     { label: "Manager",     icon: Briefcase, badge: "bg-violet-50 text-violet-700 border-violet-200",   weight: 2 },
  owner:       { label: "Owner",       icon: UserCheck, badge: "bg-emerald-50 text-emerald-700 border-emerald-200", weight: 1 },
  contributor: { label: "Contributor", icon: Users,     badge: "bg-slate-100 text-slate-700 border-slate-200",     weight: 0 },
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

export function PageOwnersButton({ pageRoute }: PageOwnersProps) {
  const [open, setOpen] = useState(false)
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(0)
  const [users, setUsers] = useState<UserOption[]>([])
  const [adding, setAdding] = useState(false)
  const [newUserId, setNewUserId] = useState("")
  const [newRole, setNewRole] = useState<Owner["role"]>("owner")
  const [newNotes, setNewNotes] = useState("")

  // Fetch count for badge
  useEffect(() => {
    let cancelled = false
    async function fetchCount() {
      const { count: c } = await supabase
        .from("page_owners")
        .select("id", { count: "exact", head: true })
        .eq("page_route", pageRoute)
      if (!cancelled) setCount(c ?? 0)
    }
    fetchCount()
    return () => { cancelled = true }
  }, [pageRoute])

  const fetchOwners = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("page_owners")
      .select("id, page_route, user_id, role, notes, created_at, user:users(id, full_name, email, avatar_url, phone)")
      .eq("page_route", pageRoute)
      .order("role", { ascending: true })
    const rows = (data ?? []) as unknown as Owner[]
    // Sort by role weight desc (Executive → Manager → Owner → Contributor)
    rows.sort((a, b) => (ROLE_META[b.role]?.weight ?? 0) - (ROLE_META[a.role]?.weight ?? 0))
    setOwners(rows)
    setCount(rows.length)
    setLoading(false)
  }, [pageRoute])

  async function fetchUsers() {
    const { data } = await supabase
      .from("users")
      .select("id, full_name, email, avatar_url, phone")
      .order("full_name")
    setUsers((data ?? []) as UserOption[])
  }

  function handleOpen() {
    setOpen(true)
    fetchOwners()
    fetchUsers()
  }

  async function handleAdd() {
    if (!newUserId) return
    await supabase.from("page_owners").insert({
      page_route: pageRoute,
      user_id: newUserId,
      role: newRole,
      notes: newNotes || null,
    })
    setNewUserId("")
    setNewRole("owner")
    setNewNotes("")
    setAdding(false)
    fetchOwners()
  }

  async function handleRemove(id: string) {
    await supabase.from("page_owners").delete().eq("id", id)
    fetchOwners()
  }

  async function handleRoleChange(id: string, role: Owner["role"]) {
    await supabase.from("page_owners").update({ role }).eq("id", id)
    fetchOwners()
  }

  const assignedUserIds = new Set(owners.map(o => o.user_id))
  const availableUsers = users.filter(u => !assignedUserIds.has(u.id))

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <Users className="size-3.5 mr-1" />
        Owners
        {count > 0 && (
          <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
            {count}
          </span>
        )}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center">
                  <Users className="size-4 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Page Owners</h3>
                  <p className="text-xs text-muted-foreground">Who manages and is responsible for this page</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
              ) : owners.length === 0 ? (
                <div className="py-10 text-center">
                  <Users className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No owners assigned yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Click "Add Owner" below to assign someone</p>
                </div>
              ) : (
                owners.map((o) => {
                  const meta = ROLE_META[o.role] ?? ROLE_META.owner
                  const Icon = meta.icon
                  return (
                    <div
                      key={o.id}
                      className={`rounded-lg border p-4 flex items-start gap-3 ${
                        o.role === "executive" ? "border-amber-200 bg-amber-50/30" :
                        o.role === "manager" ? "border-violet-200 bg-violet-50/30" :
                        "border-border/80 bg-card"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="shrink-0">
                        {o.user?.avatar_url ? (
                          <img src={o.user.avatar_url} alt={o.user.full_name} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                            {getInitials(o.user?.full_name ?? "?")}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-foreground">{o.user?.full_name ?? "Unknown user"}</h4>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${meta.badge}`}>
                            <Icon className="size-2.5" />
                            {meta.label}
                          </span>
                        </div>
                        {o.user?.email && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Mail className="size-3" /> {o.user.email}
                          </p>
                        )}
                        {o.user?.phone && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Phone className="size-3" /> {o.user.phone}
                          </p>
                        )}
                        {o.notes && (
                          <p className="text-xs text-muted-foreground mt-1.5 italic">{o.notes}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <select
                          value={o.role}
                          onChange={(e) => handleRoleChange(o.id, e.target.value as Owner["role"])}
                          className="h-7 rounded border border-border bg-background px-2 text-xs cursor-pointer"
                        >
                          <option value="executive">Executive</option>
                          <option value="manager">Manager</option>
                          <option value="owner">Owner</option>
                          <option value="contributor">Contributor</option>
                        </select>
                        <button
                          onClick={() => handleRemove(o.id)}
                          className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Remove"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}

              {/* Add owner form */}
              {adding && (
                <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <UserPlus className="size-4" /> Add Owner
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</label>
                      <select
                        value={newUserId}
                        onChange={(e) => setNewUserId(e.target.value)}
                        className="mt-1 w-full h-9 rounded-md border border-border px-3 text-sm bg-background"
                      >
                        <option value="">Select user...</option>
                        {availableUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as Owner["role"])}
                        className="mt-1 w-full h-9 rounded-md border border-border px-3 text-sm bg-background"
                      >
                        <option value="executive">Executive</option>
                        <option value="manager">Manager</option>
                        <option value="owner">Owner</option>
                        <option value="contributor">Contributor</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes (optional)</label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="e.g. Approves all changes"
                      className="mt-1 w-full h-9 rounded-md border border-border px-3 text-sm bg-background"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setAdding(false); setNewUserId(""); setNewRole("owner"); setNewNotes("") }}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleAdd} disabled={!newUserId}>
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!adding && (
              <div className="px-5 py-3 border-t shrink-0 flex justify-end">
                <Button onClick={() => setAdding(true)} disabled={availableUsers.length === 0}>
                  <UserPlus className="size-4 mr-1" />
                  Add Owner
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
