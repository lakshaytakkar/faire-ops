"use client"

/**
 * CreateChannelModal — Slack-style multi-step new-channel wizard.
 *
 * Three centered steps inside a portaled backdrop-blur modal:
 *
 *   1. Basics   — channel name (slugified), description, public/private toggle.
 *   2. Members  — searchable list of team_members, multi-select with chips.
 *                 The current user is pinned and auto-included.
 *   3. Review   — summary card + primary "Create channel" button.
 *
 * The modal is fully controlled by the parent. When the user clicks Create,
 * we call `onCreate(data)` which returns a result — the parent handles the
 * Supabase INSERTs and rollback so the modal stays presentation-only and
 * reusable.
 *
 * Keyboard: Esc closes, Enter advances on steps 1 & 2, triggers create on
 * step 3. Arrow keys do not navigate within the member list on purpose —
 * members are clickable chips, not radio items.
 */

import { useState, useEffect, useMemo, useCallback } from "react"
import { createPortal } from "react-dom"
import {
  X,
  ArrowLeft,
  ArrowRight,
  Hash,
  Globe,
  Lock,
  Users,
  Search,
  Check,
  Sparkles,
} from "lucide-react"

interface TeamMemberLite {
  id: string
  name: string
  role: string
  avatar_url?: string | null
}

export interface CreateChannelResult {
  ok: boolean
  errorMessage?: string
}

export interface CreateChannelPayload {
  name: string
  description: string
  isPrivate: boolean
  memberIds: string[]
}

interface Props {
  open: boolean
  onClose: () => void
  /** Async handler that actually persists the channel + membership. Should
   * return { ok, errorMessage? }. Modal stays open on failure so the user
   * can see the toast and retry; closes automatically on success. */
  onCreate: (payload: CreateChannelPayload) => Promise<CreateChannelResult>
  teamMembers: TeamMemberLite[]
  currentUserName: string
  /** Optional display avatar for the current user — pinned at the top of
   * the "selected" strip since they're always included. */
  currentUserAvatar?: string | null
}

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48)
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <span
      className={[
        "inline-block h-1.5 rounded-full transition-all",
        active ? "w-8 bg-primary" : done ? "w-4 bg-primary/50" : "w-4 bg-border",
      ].join(" ")}
    />
  )
}

export function CreateChannelModal({
  open,
  onClose,
  onCreate,
  teamMembers,
  currentUserName,
  currentUserAvatar,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1 state
  const [name, setName] = useState("")
  const [nameEdited, setNameEdited] = useState(false)
  const [description, setDescription] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)

  // Step 2 state
  const [query, setQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Submission
  const [submitting, setSubmitting] = useState(false)

  // Reset everything when the modal opens (fresh flow each time).
  useEffect(() => {
    if (open) {
      setStep(1)
      setName("")
      setNameEdited(false)
      setDescription("")
      setIsPrivate(false)
      setQuery("")
      setSelectedIds(new Set())
      setSubmitting(false)
    }
  }, [open])

  const slug = useMemo(() => slugify(name), [name])
  const canContinueStep1 = slug.length >= 2 && slug.length <= 48

  const filteredMembers = useMemo(() => {
    if (!query.trim()) return teamMembers
    const q = query.toLowerCase()
    return teamMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.role ?? "").toLowerCase().includes(q),
    )
  }, [teamMembers, query])

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

  const advance = useCallback(() => {
    if (step === 1 && canContinueStep1) setStep(2)
    else if (step === 2) setStep(3)
  }, [step, canContinueStep1])

  const retreat = useCallback(() => {
    if (step === 2) setStep(1)
    else if (step === 3) setStep(2)
  }, [step])

  async function handleCreate() {
    if (submitting) return
    setSubmitting(true)
    const res = await onCreate({
      name: slug,
      description: description.trim(),
      isPrivate,
      memberIds: Array.from(selectedIds),
    })
    setSubmitting(false)
    if (res.ok) onClose()
  }

  // Keyboard
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      } else if (e.key === "Enter") {
        // Only auto-advance when no input is focused (let the composer flow
        // control its own Enter behavior).
        const target = e.target as HTMLElement | null
        const tag = target?.tagName?.toLowerCase()
        const typing = tag === "textarea" || (tag === "input" && (target as HTMLInputElement).type !== "button")
        if (step === 3) {
          if (!typing) handleCreate()
        } else if (step === 1 && typing) {
          // Allow Enter in step-1 inputs to advance
          e.preventDefault()
          if (canContinueStep1) advance()
        } else if (step === 2 && typing && tag === "input") {
          // Enter in the member-search input advances
          e.preventDefault()
          advance()
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, canContinueStep1, advance])

  if (!open || typeof window === "undefined") return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create new channel"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-[toolbarIn_120ms_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-3 border-b border-border/80">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Hash className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold font-heading text-foreground leading-tight">
              Create a channel
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {step === 1 && "Give it a name and tell people what it's for."}
              {step === 2 && "Invite the people who should be here from day one."}
              {step === 3 && "Take one last look before you create it."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 py-3">
          <StepDot active={step === 1} done={step > 1} />
          <StepDot active={step === 2} done={step > 2} />
          <StepDot active={step === 3} done={false} />
        </div>

        {/* Body — flex-1, scrollable so tall content doesn't blow the modal */}
        <div className="flex-1 overflow-y-auto px-6 pb-5">
          {step === 1 && (
            <div className="space-y-4 animate-[toolbarIn_140ms_ease-out]">
              <div>
                <label htmlFor="cc-name" className="text-xs font-semibold text-foreground">
                  Name
                </label>
                <div className="mt-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    #
                  </span>
                  <input
                    id="cc-name"
                    type="text"
                    autoFocus
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      setNameEdited(true)
                    }}
                    placeholder="launch-plans"
                    className="w-full h-9 rounded-md border border-border/80 bg-background pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    maxLength={60}
                    aria-describedby="cc-name-hint"
                  />
                </div>
                <p id="cc-name-hint" className="mt-1 text-[11px] text-muted-foreground">
                  Lowercase, hyphens, no spaces.{" "}
                  {nameEdited && slug && slug !== name.trim() && (
                    <>
                      Saved as <code className="font-mono bg-muted/60 px-1 rounded">#{slug}</code>.
                    </>
                  )}
                </p>
              </div>

              <div>
                <label htmlFor="cc-desc" className="text-xs font-semibold text-foreground">
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  id="cc-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this channel for?"
                  rows={2}
                  maxLength={240}
                  className="mt-1 w-full rounded-md border border-border/80 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {description.length}/240
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground">Visibility</p>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPrivate(false)}
                    aria-pressed={!isPrivate}
                    className={`flex items-start gap-2 text-left rounded-lg border px-3 py-2.5 transition-all active:scale-[0.98] ${
                      !isPrivate
                        ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/80 bg-background hover:border-foreground/20"
                    }`}
                  >
                    <Globe className={`h-4 w-4 mt-0.5 shrink-0 ${!isPrivate ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${!isPrivate ? "text-primary" : "text-foreground"}`}>Public</p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                        Anyone can find + join
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(true)}
                    aria-pressed={isPrivate}
                    className={`flex items-start gap-2 text-left rounded-lg border px-3 py-2.5 transition-all active:scale-[0.98] ${
                      isPrivate
                        ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/80 bg-background hover:border-foreground/20"
                    }`}
                  >
                    <Lock className={`h-4 w-4 mt-0.5 shrink-0 ${isPrivate ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${isPrivate ? "text-primary" : "text-foreground"}`}>Private</p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                        Invite-only
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 animate-[toolbarIn_140ms_ease-out]">
              {/* Selected chips strip */}
              <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                {/* Current user — pinned + non-removable */}
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary px-2 py-1 text-xs font-medium"
                  title={`${currentUserName} (you) — always included`}
                >
                  {currentUserAvatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={currentUserAvatar}
                      alt=""
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px] font-bold">
                      {getInitials(currentUserName)}
                    </span>
                  )}
                  {currentUserName}
                  <span className="text-[9px] uppercase tracking-wider font-bold opacity-70">
                    you
                  </span>
                </span>
                {selectedMembers.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2 py-1 text-xs font-medium text-foreground"
                  >
                    {m.avatar_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={m.avatar_url}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-muted-foreground/20 flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                        {getInitials(m.name)}
                      </span>
                    )}
                    {m.name}
                    <button
                      type="button"
                      onClick={() => toggleMember(m.id)}
                      className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors active:scale-95"
                      aria-label={`Remove ${m.name}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people…"
                  className="w-full h-9 rounded-md border border-border/80 bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Search team members"
                />
              </div>

              {/* Member list */}
              <div className="border border-border/80 rounded-md overflow-hidden">
                {filteredMembers.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No matches.
                  </div>
                ) : (
                  <ul className="max-h-64 overflow-y-auto divide-y divide-border/60">
                    {filteredMembers.map((m) => {
                      const isSelected = selectedIds.has(m.id)
                      const isCurrent = m.name === currentUserName
                      return (
                        <li key={m.id}>
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => toggleMember(m.id)}
                            className={`flex items-center gap-3 w-full px-3 py-2 text-left text-sm transition-colors ${
                              isCurrent
                                ? "bg-muted/30 cursor-default"
                                : isSelected
                                  ? "bg-primary/5 hover:bg-primary/10"
                                  : "hover:bg-muted/40"
                            }`}
                            aria-pressed={isSelected || isCurrent}
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
                                {isCurrent && (
                                  <span className="ml-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                                    you
                                  </span>
                                )}
                              </p>
                              {m.role && (
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {m.role}
                                </p>
                              )}
                            </div>
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                isSelected || isCurrent
                                  ? "bg-primary text-primary-foreground"
                                  : "border border-border/80 bg-background"
                              }`}
                              aria-hidden="true"
                            >
                              {(isSelected || isCurrent) && <Check className="w-3 h-3" />}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground">
                {selectedMembers.length} selected · {currentUserName} (you) is
                always included.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 animate-[toolbarIn_140ms_ease-out]">
              <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
                <div className="flex items-center gap-2.5">
                  <span className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Hash className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground leading-tight truncate">
                      #{slug}
                    </p>
                    {description.trim() && (
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                        {description.trim()}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground ring-1 ring-inset ring-border/60">
                    {isPrivate ? (
                      <>
                        <Lock className="h-3 w-3" /> Private
                      </>
                    ) : (
                      <>
                        <Globe className="h-3 w-3" /> Public
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border/80 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground">
                    {selectedMembers.length + 1} member
                    {selectedMembers.length + 1 === 1 ? "" : "s"} at launch
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                    {currentUserName}
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                      admin
                    </span>
                  </span>
                  {selectedMembers.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground"
                    >
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-foreground leading-snug">
                  Everyone you invited will see <code className="font-mono bg-background px-1 rounded">#{slug}</code> in
                  their sidebar next time they open chat.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-border/80 bg-muted/20">
          {step > 1 && (
            <button
              type="button"
              onClick={retreat}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border/80 bg-background text-sm font-medium text-foreground hover:bg-muted/40 transition-colors active:scale-95 disabled:opacity-50"
              aria-label="Previous step"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <button
              type="button"
              onClick={advance}
              disabled={step === 1 && !canContinueStep1}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 2 && selectedMembers.length === 0 ? "Skip" : "Continue"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Create channel
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
