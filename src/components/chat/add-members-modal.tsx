"use client"

/**
 * AddMembersToChannelModal — invite existing team members to a channel
 * that already exists. Shares the chip-picker pattern with the
 * create-channel flow but filters out users who are already in.
 *
 * Presentation-only: the parent owns the DB write via onSubmit, which
 * receives the selected user ids and must return { ok, errorMessage? }.
 */

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { X, Search, Check, UserPlus } from "lucide-react"

interface TeamMemberLite {
  id: string
  name: string
  role: string
  avatar_url?: string | null
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface Props {
  open: boolean
  channelName: string
  teamMembers: TeamMemberLite[]
  /** Names already in the channel — excluded from the picker. */
  existingMemberNames: string[]
  onClose: () => void
  onSubmit: (
    userIds: string[],
  ) => Promise<{ ok: boolean; errorMessage?: string }>
}

export function AddMembersToChannelModal({
  open,
  channelName,
  teamMembers,
  existingMemberNames,
  onClose,
  onSubmit,
}: Props) {
  const [query, setQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setQuery("")
      setSelectedIds(new Set())
      setSubmitting(false)
    }
  }, [open])

  // Eligible = not already a member
  const eligibleMembers = useMemo(() => {
    const existing = new Set(existingMemberNames)
    return teamMembers.filter((m) => !existing.has(m.name))
  }, [teamMembers, existingMemberNames])

  const filtered = useMemo(() => {
    if (!query.trim()) return eligibleMembers
    const q = query.toLowerCase()
    return eligibleMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.role ?? "").toLowerCase().includes(q),
    )
  }, [eligibleMembers, query])

  const selectedMembers = useMemo(
    () => teamMembers.filter((m) => selectedIds.has(m.id)),
    [teamMembers, selectedIds],
  )

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit() {
    if (submitting || selectedIds.size === 0) return
    setSubmitting(true)
    const res = await onSubmit(Array.from(selectedIds))
    setSubmitting(false)
    if (res.ok) onClose()
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open || typeof window === "undefined") return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Add people to #${channelName}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-[toolbarIn_120ms_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-3 border-b border-border/80">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <UserPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold font-heading text-foreground leading-tight">
              Add people to #{channelName}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              They&apos;ll see the channel in their sidebar right away.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {/* Selected chips */}
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedMembers.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary px-2 py-1 text-xs font-medium"
                >
                  {m.avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.avatar_url}
                      alt=""
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold">
                      {getInitials(m.name)}
                    </span>
                  )}
                  {m.name}
                  <button
                    type="button"
                    onClick={() => toggleMember(m.id)}
                    className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors"
                    aria-label={`Remove ${m.name}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people…"
              className="w-full h-9 rounded-md border border-border/80 bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Search team members"
            />
          </div>

          {/* List */}
          <div className="border border-border/80 rounded-md overflow-hidden">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {eligibleMembers.length === 0
                  ? "Everyone is already here."
                  : "No matches."}
              </div>
            ) : (
              <ul className="max-h-72 overflow-y-auto divide-y divide-border/60">
                {filtered.map((m) => {
                  const isSelected = selectedIds.has(m.id)
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => toggleMember(m.id)}
                        className={`flex items-center gap-3 w-full px-3 py-2 text-left text-sm transition-colors active:scale-[0.99] ${
                          isSelected
                            ? "bg-primary/5 hover:bg-primary/10"
                            : "hover:bg-muted/40"
                        }`}
                        aria-pressed={isSelected}
                      >
                        {m.avatar_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={m.avatar_url}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                            {getInitials(m.name)}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground leading-tight truncate">
                            {m.name}
                          </p>
                          {m.role && (
                            <p className="text-xs text-muted-foreground truncate">
                              {m.role}
                            </p>
                          )}
                        </div>
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "border border-border/80 bg-background"
                          }`}
                          aria-hidden="true"
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {selectedMembers.length} selected
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-border/80 bg-muted/20">
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-9 px-4 rounded-md border border-border/80 bg-background text-sm font-medium text-foreground hover:bg-muted/40 transition-colors active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || selectedIds.size === 0}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                Adding…
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5" />
                {selectedIds.size === 0
                  ? "Add"
                  : `Add ${selectedIds.size} ${selectedIds.size === 1 ? "person" : "people"}`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
