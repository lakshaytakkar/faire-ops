"use client"

import { useState, useEffect } from "react"
import {
  X,
  GraduationCap,
  Star,
  Briefcase,
  BarChart3,
  Clock,
  Calendar,
  MapPin,
  Building2,
  User,
  Award,
  Globe,
  BadgeCheck,
  FolderKanban,
  TrendingUp,
  MessageSquareQuote,
  Target,
  Lightbulb,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface EmployeeCVModalProps {
  memberId: string
  memberName: string
  onClose: () => void
}

interface EmployeeProfile {
  id: string
  team_member_id: string
  bio?: string
  designation?: string
  department?: string
  previous_company?: string
  previous_role?: string
  years_experience?: number
  address_city?: string
  address_state?: string
  joining_date?: string
  reporting_to?: string
  education?: Array<{ degree: string; institution: string; year: string | number; grade?: string }>
  certifications?: Array<{ name: string; issuer: string; year: string | number }>
  languages?: string[]
}

interface EmployeeSkill {
  id: string
  team_member_id: string
  skill_name: string
  proficiency: number
  category: string
  description?: string
  use_cases?: string[]
}

interface EmployeeProject {
  id: string
  team_member_id: string
  project_name: string
  role_in_project?: string
  status?: string
  start_date?: string
  end_date?: string
  description?: string
  outcomes?: string
  tags?: string[]
}

interface PerformanceRating {
  id: string
  team_member_id: string
  month: string
  productivity_rating?: number
  quality_rating?: number
  communication_rating?: number
  initiative_rating?: number
  overall_rating?: number
  feedback?: string
  goals_met?: string
  areas_of_improvement?: string
}

interface TaskRow {
  id: string
  title: string
  status: string
  priority: string
  due_date?: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function proficiencyColor(p: number): string {
  if (p > 80) return "bg-emerald-500"
  if (p > 60) return "bg-blue-500"
  return "bg-amber-500"
}

function proficiencyTextColor(p: number): string {
  if (p > 80) return "text-emerald-600"
  if (p > 60) return "text-blue-600"
  return "text-amber-600"
}

function tenure(dateStr: string): { years: number; months: number; label: string } {
  const now = new Date()
  const then = new Date(dateStr)
  let months = (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth())
  if (months < 0) months = 0
  const y = Math.floor(months / 12)
  const m = months % 12
  const parts: string[] = []
  if (y > 0) parts.push(`${y} year${y > 1 ? "s" : ""}`)
  if (m > 0 || y === 0) parts.push(`${m} month${m !== 1 ? "s" : ""}`)
  return { years: y, months: m, label: parts.join(", ") }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatMonth(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed: { label: "Completed", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  on_hold: { label: "On Hold", cls: "bg-amber-50 text-amber-700 border-amber-200" },
}

const memberStatusBadge: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  online: { label: "Online", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  away: { label: "Away", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  offline: { label: "Offline", cls: "bg-slate-50 text-slate-500 border-slate-200" },
}

const priorityDot: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-slate-400",
}

const taskStatusBadge: Record<string, { label: string; cls: string }> = {
  done: { label: "Done", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed: { label: "Done", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "in-progress": { label: "In Progress", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "In Progress", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  todo: { label: "To Do", cls: "bg-slate-50 text-slate-500 border-slate-200" },
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-muted animate-pulse ${className}`} />
}

function CardShell({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm">
      <div className="px-5 py-3.5 border-b flex items-center gap-2">
        {icon}
        <h3 className="text-[0.9375rem] font-semibold tracking-tight">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function RatingBar({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`h-2.5 w-6 rounded-sm ${i < value ? "bg-amber-400" : "bg-muted"}`}
        />
      ))}
      <span className="ml-1.5 text-xs font-semibold text-muted-foreground">{value}/{max}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EmployeeCVModal({ memberId, memberName, onClose }: EmployeeCVModalProps) {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [skills, setSkills] = useState<EmployeeSkill[]>([])
  const [projects, setProjects] = useState<EmployeeProject[]>([])
  const [ratings, setRatings] = useState<PerformanceRating[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [managerName, setManagerName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  /* Fetch all data */
  useEffect(() => {
    let cancelled = false

    async function load() {
      const [profileRes, skillsRes, projectsRes, ratingsRes, tasksRes] = await Promise.all([
        supabase.from("employee_profiles").select("*").eq("team_member_id", memberId).single(),
        supabase.from("team_member_skills").select("*").eq("team_member_id", memberId).order("proficiency", { ascending: false }),
        supabase.from("employee_projects").select("*").eq("team_member_id", memberId),
        supabase.from("employee_performance_ratings").select("*").eq("team_member_id", memberId).order("month", { ascending: false }),
        supabase.from("tasks").select("id, title, status, priority, due_date").eq("assignee", memberName).order("due_date", { ascending: false }).limit(10),
      ])

      if (cancelled) return

      const p = profileRes.data as EmployeeProfile | null
      setProfile(p)
      setSkills((skillsRes.data as EmployeeSkill[]) ?? [])
      setProjects((projectsRes.data as EmployeeProject[]) ?? [])
      setRatings((ratingsRes.data as PerformanceRating[]) ?? [])
      setTasks((tasksRes.data as TaskRow[]) ?? [])

      // Fetch team member avatar + manager name
      const { data: memberData } = await supabase.from("team_members").select("avatar_url").eq("id", memberId).single()
      if (!cancelled && memberData?.avatar_url) setAvatarUrl(memberData.avatar_url)

      if (p?.reporting_to) {
        const { data: mgr } = await supabase.from("team_members").select("name").eq("id", p.reporting_to).single()
        if (!cancelled && mgr) setManagerName((mgr as { name: string }).name)
      }

      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [memberId, memberName])

  /* Close on Escape */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  /* Derived */
  const doneCount = tasks.filter((t) => t.status === "done" || t.status === "completed").length
  const tenureInfo = profile?.joining_date ? tenure(profile.joining_date) : null
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((s, r) => s + (r.overall_rating ?? 0), 0) / ratings.length).toFixed(1)
      : "-"
  const latestRating = ratings[0] ?? null
  const statusInfo = memberStatusBadge["active"]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-card shadow-2xl">
        {loading ? (
          <div className="p-8 space-y-6">
            <div className="flex items-start gap-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-3 w-80" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
            </div>
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : (
          <>
            {/* ── 1. Header ── */}
            <div className="sticky top-0 z-10 bg-card border-b px-6 py-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={memberName}
                    className="w-20 h-20 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shrink-0">
                    {getInitials(memberName)}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold font-heading leading-tight">{memberName}</h2>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusInfo.cls}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  {profile?.designation && (
                    <p className="text-sm text-muted-foreground mt-0.5">{profile.designation}</p>
                  )}
                  {profile?.department && (
                    <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                      {profile.department}
                    </span>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {managerName && (
                      <span className="flex items-center gap-1">
                        <User className="size-3" />
                        Reports to: {managerName}
                      </span>
                    )}
                    {profile?.joining_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        Joined: {formatDate(profile.joining_date)}
                      </span>
                    )}
                    {tenureInfo && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        Tenure: {tenureInfo.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Close */}
                <button
                  onClick={onClose}
                  className="shrink-0 p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="px-6 py-5 space-y-5">
              {/* ── 2. Stats Bar ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4 text-center">
                  <p className="text-2xl font-bold font-heading">
                    {tenureInfo ? `${tenureInfo.years}.${tenureInfo.months}` : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tenure (yrs)</p>
                </div>
                <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4 text-center">
                  <p className="text-2xl font-bold font-heading">{doneCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tasks Completed</p>
                </div>
                <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4 text-center">
                  <p className="text-2xl font-bold font-heading">{projects.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Projects</p>
                </div>
                <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4 text-center">
                  <p className="text-2xl font-bold font-heading">{avgRating}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Avg Rating</p>
                </div>
              </div>

              {/* ── 3. About ── */}
              <CardShell title="About" icon={<User className="size-4 text-muted-foreground" />}>
                <div className="space-y-4">
                  {profile?.bio && (
                    <p className="text-sm text-foreground leading-relaxed">{profile.bio}</p>
                  )}

                  {/* Info grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    {profile?.previous_company && (
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="size-3" /> Previous Company
                        </p>
                        <p className="font-medium mt-0.5">{profile.previous_company}</p>
                        {profile.previous_role && (
                          <p className="text-xs text-muted-foreground">{profile.previous_role}</p>
                        )}
                      </div>
                    )}
                    {profile?.years_experience != null && (
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Briefcase className="size-3" /> Experience
                        </p>
                        <p className="font-medium mt-0.5">{profile.years_experience} years</p>
                      </div>
                    )}
                    {(profile?.address_city || profile?.address_state) && (
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3" /> Location
                        </p>
                        <p className="font-medium mt-0.5">
                          {[profile.address_city, profile.address_state].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Education */}
                  {profile?.education && profile.education.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                        <GraduationCap className="size-3.5" /> Education
                      </p>
                      <div className="space-y-1.5">
                        {profile.education.map((edu, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{edu.degree}</span>
                            <span className="text-muted-foreground">&mdash;</span>
                            <span className="text-muted-foreground">{edu.institution}</span>
                            <span className="text-xs text-muted-foreground">({edu.year})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {profile?.certifications && profile.certifications.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                        <BadgeCheck className="size-3.5" /> Certifications
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.certifications.map((cert, ci) => (
                          <span
                            key={ci}
                            className="text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200"
                          >
                            {typeof cert === "string" ? cert : `${cert.name} — ${cert.issuer} (${cert.year})`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {profile?.languages && profile.languages.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                        <Globe className="size-3.5" /> Languages
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.languages.map((lang) => (
                          <span
                            key={lang}
                            className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardShell>

              {/* ── 4. Skills ── */}
              {skills.length > 0 && (
                <CardShell title="Skills" icon={<Star className="size-4 text-muted-foreground" />}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {skills.map((skill) => (
                      <div key={skill.id} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate">{skill.skill_name}</span>
                            <span className={`text-xs font-bold ${proficiencyTextColor(skill.proficiency)}`}>
                              {skill.proficiency}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${proficiencyColor(skill.proficiency)}`}
                              style={{ width: `${skill.proficiency}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                          {skill.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardShell>
              )}

              {/* ── 5. Projects ── */}
              {projects.length > 0 && (
                <CardShell title="Projects" icon={<FolderKanban className="size-4 text-muted-foreground" />}>
                  <div className="space-y-4">
                    {projects.map((proj) => {
                      const sb = statusBadge[proj.status ?? "active"] ?? statusBadge.active
                      return (
                        <div key={proj.id} className="rounded-md border border-border/60 p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-semibold">{proj.project_name}</h4>
                              {proj.role_in_project && (
                                <p className="text-xs text-muted-foreground mt-0.5">{proj.role_in_project}</p>
                              )}
                            </div>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${sb.cls}`}>
                              {sb.label}
                            </span>
                          </div>
                          {(proj.start_date || proj.end_date) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="size-3" />
                              {proj.start_date ? formatDate(proj.start_date) : "?"} &ndash;{" "}
                              {proj.end_date ? formatDate(proj.end_date) : "Present"}
                            </p>
                          )}
                          {proj.description && (
                            <p className="text-sm text-foreground leading-relaxed">{proj.description}</p>
                          )}
                          {proj.outcomes && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">Outcomes:</span> {proj.outcomes}
                            </p>
                          )}
                          {proj.tags && proj.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {proj.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardShell>
              )}

              {/* ── 6. Performance Ratings ── */}
              {ratings.length > 0 && (
                <CardShell title="Performance Ratings" icon={<TrendingUp className="size-4 text-muted-foreground" />}>
                  <div className="space-y-5">
                    {/* Latest rating breakdown */}
                    {latestRating && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Latest: {formatMonth(latestRating.month)}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {([
                            ["Productivity", latestRating.productivity_rating],
                            ["Quality", latestRating.quality_rating],
                            ["Communication", latestRating.communication_rating],
                            ["Initiative", latestRating.initiative_rating],
                            ["Overall", latestRating.overall_rating],
                          ] as [string, number | undefined][]).map(([label, val]) => (
                            <div key={label} className="flex items-center justify-between gap-3">
                              <span className="text-sm text-foreground w-28 shrink-0">{label}</span>
                              <RatingBar value={val ?? 0} />
                            </div>
                          ))}
                        </div>

                        {latestRating.feedback && (
                          <div className="mt-3 rounded-md bg-muted/40 p-3 flex items-start gap-2">
                            <MessageSquareQuote className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                            <p className="text-sm italic text-muted-foreground leading-relaxed">
                              &ldquo;{latestRating.feedback}&rdquo;
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {latestRating.goals_met && (
                            <div className="flex items-start gap-2">
                              <Target className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-foreground">Goals Met</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{latestRating.goals_met}</p>
                              </div>
                            </div>
                          )}
                          {latestRating.areas_of_improvement && (
                            <div className="flex items-start gap-2">
                              <Lightbulb className="size-3.5 text-amber-600 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-foreground">Areas of Improvement</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{latestRating.areas_of_improvement}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* History table */}
                    {ratings.length > 1 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">History</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-xs text-muted-foreground">
                                <th className="text-left py-2 pr-3 font-medium">Month</th>
                                <th className="text-left py-2 pr-3 font-medium">Overall</th>
                                <th className="text-left py-2 font-medium">Feedback</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ratings.slice(0, 6).map((r) => (
                                <tr key={r.id} className="border-b border-border/50">
                                  <td className="py-2 pr-3 text-xs">{formatMonth(r.month)}</td>
                                  <td className="py-2 pr-3 text-xs font-semibold">{r.overall_rating ?? "-"}/5</td>
                                  <td className="py-2 text-xs text-muted-foreground truncate max-w-[300px]">
                                    {r.feedback
                                      ? r.feedback.length > 80
                                        ? r.feedback.slice(0, 80) + "..."
                                        : r.feedback
                                      : "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </CardShell>
              )}

              {/* ── 7. Recent Tasks ── */}
              {tasks.length > 0 && (
                <CardShell title="Recent Tasks" icon={<BarChart3 className="size-4 text-muted-foreground" />}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left py-2 pr-3 font-medium">Title</th>
                          <th className="text-left py-2 pr-3 font-medium">Status</th>
                          <th className="text-left py-2 pr-3 font-medium">Priority</th>
                          <th className="text-left py-2 font-medium">Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((t) => {
                          const ts = taskStatusBadge[t.status] ?? taskStatusBadge.todo
                          const pd = priorityDot[t.priority] ?? priorityDot.low
                          return (
                            <tr key={t.id} className="border-b border-border/50">
                              <td className="py-2 pr-3 text-sm truncate max-w-[250px]">{t.title}</td>
                              <td className="py-2 pr-3">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ts.cls}`}>
                                  {ts.label}
                                </span>
                              </td>
                              <td className="py-2 pr-3">
                                <span className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${pd}`} />
                                  <span className="text-xs capitalize">{t.priority}</span>
                                </span>
                              </td>
                              <td className="py-2 text-xs text-muted-foreground">
                                {t.due_date ? formatDate(t.due_date) : "-"}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardShell>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
