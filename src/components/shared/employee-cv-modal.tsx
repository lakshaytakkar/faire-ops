"use client"

import { useState, useEffect } from "react"
import { X, GraduationCap, Wrench, Star, Briefcase, BarChart3, CheckCircle2, RefreshCw, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface EmployeeSkill {
  id: string
  employee_id: string
  skill_name: string
  proficiency: number
  category: string
  description?: string
  use_cases?: string[]
}

interface EmployeeTask {
  id: string
  title: string
  status: string
  priority: string
}

export interface EmployeeCVModalProps {
  employee: {
    id: string
    name: string
    role: string
    department: string
    avatar_url?: string
    bio?: string
    education?: Array<{ type: string; name: string; year: string }>
    tools_used?: string[]
    connectors?: string[]
    specializations?: Array<{ area: string; detail: string }>
    messages_handled: number
    joined_at?: string
  }
  onClose: () => void
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

function timeAgo(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  const months = (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth())
  if (months < 1) return "less than a month ago"
  if (months === 1) return "1 month ago"
  if (months < 12) return `${months} months ago`
  const years = Math.floor(months / 12)
  return years === 1 ? "1 year ago" : `${years} years ago`
}

function formatJoinDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

const statusIcon: Record<string, { label: string; cls: string }> = {
  done: { label: "Done", cls: "text-emerald-600" },
  completed: { label: "Done", cls: "text-emerald-600" },
  "in-progress": { label: "In Progress", cls: "text-blue-600" },
  in_progress: { label: "In Progress", cls: "text-blue-600" },
  todo: { label: "To Do", cls: "text-slate-500" },
  pending: { label: "Pending", cls: "text-amber-600" },
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EmployeeCVModal({ employee, onClose }: EmployeeCVModalProps) {
  const [skills, setSkills] = useState<EmployeeSkill[]>([])
  const [tasks, setTasks] = useState<EmployeeTask[]>([])
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)
  const [loadingSkills, setLoadingSkills] = useState(true)
  const [loadingTasks, setLoadingTasks] = useState(true)

  /* Fetch skills */
  useEffect(() => {
    supabase
      .from("employee_skills")
      .select("*")
      .eq("employee_id", employee.id)
      .order("proficiency", { ascending: false })
      .then(({ data }) => {
        if (data) setSkills(data as EmployeeSkill[])
        setLoadingSkills(false)
      })
  }, [employee.id])

  /* Fetch recent tasks */
  useEffect(() => {
    supabase
      .from("tasks")
      .select("id, title, status, priority")
      .eq("assignee", employee.name)
      .order("due_date", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (data) setTasks(data as EmployeeTask[])
        setLoadingTasks(false)
      })
  }, [employee.name, employee.id])

  /* Close on Escape */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const joinedAt = employee.joined_at
  const education = employee.education ?? []
  const toolsUsed = employee.tools_used ?? []
  const connectors = employee.connectors ?? []
  const specializations = employee.specializations ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-3xl h-[85vh] rounded-md border bg-card shadow-lg flex flex-col overflow-hidden">
        {/* ── Header ── */}
        <div className="shrink-0 px-6 py-5 border-b flex items-start gap-4">
          {/* Avatar */}
          <div className="shrink-0">
            {employee.avatar_url ? (
              <img
                src={employee.avatar_url}
                alt={employee.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                {getInitials(employee.name)}
              </div>
            )}
          </div>

          {/* Name / Role / Meta */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold font-heading leading-tight">{employee.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {employee.role} &middot; {employee.department}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              {joinedAt && <span>Joined: {formatJoinDate(joinedAt)}</span>}
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Online
              </span>
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

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* ABOUT */}
          {employee.bio && (
            <section>
              <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground mb-2">
                About
              </h3>
              <p className="text-sm text-foreground leading-relaxed">{employee.bio}</p>
            </section>
          )}

          {/* SKILLS */}
          <section>
            <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Star className="size-3.5" />
              Skills
              <span className="flex-1 h-px bg-border" />
            </h3>
            {loadingSkills ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : skills.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {skills.map((skill) => {
                  const isExpanded = expandedSkill === skill.id
                  return (
                    <button
                      key={skill.id}
                      onClick={() => setExpandedSkill(isExpanded ? null : skill.id)}
                      className={`text-left rounded-md border bg-card p-3 ${
                        isExpanded ? "col-span-2 sm:col-span-3" : ""
                      }`}
                    >
                      <div className="text-sm font-semibold leading-tight">{skill.skill_name}</div>
                      {/* Proficiency bar */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${proficiencyColor(skill.proficiency)}`}
                            style={{ width: `${skill.proficiency}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-bold ${proficiencyTextColor(skill.proficiency)}`}>
                          {skill.proficiency}%
                        </span>
                      </div>
                      {/* Category */}
                      <span className="inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {skill.category}
                      </span>
                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-3 border-t pt-3 space-y-2">
                          {skill.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {skill.description}
                            </p>
                          )}
                          {skill.use_cases && skill.use_cases.length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Use Cases
                              </span>
                              <ul className="mt-1 space-y-0.5">
                                {skill.use_cases.map((uc, i) => (
                                  <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                                    <span className="text-muted-foreground mt-0.5">&bull;</span>
                                    {uc}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No skills data available.</p>
            )}
          </section>

          {/* EDUCATION & TRAINING */}
          {education.length > 0 && (
            <section>
              <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <GraduationCap className="size-3.5" />
                Education & Training
                <span className="flex-1 h-px bg-border" />
              </h3>
              <div className="space-y-1.5">
                {education.map((edu, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">&#128196;</span>
                    <span className="font-medium">{edu.name}</span>
                    <span className="text-muted-foreground">({edu.year})</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TOOLS & CONNECTORS */}
          {(toolsUsed.length > 0 || connectors.length > 0) && (
            <section>
              <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Wrench className="size-3.5" />
                Tools & Connectors
                <span className="flex-1 h-px bg-border" />
              </h3>
              {toolsUsed.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {toolsUsed.map((tool) => (
                    <span
                      key={tool}
                      className="inline-block text-xs font-medium px-2 py-1 rounded-md border bg-muted/50 text-foreground"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              )}
              {connectors.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Connectors:</span>{" "}
                  {connectors.join(" \u00b7 ")}
                </p>
              )}
            </section>
          )}

          {/* SPECIALIZATIONS */}
          {specializations.length > 0 && (
            <section>
              <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Briefcase className="size-3.5" />
                Specializations
                <span className="flex-1 h-px bg-border" />
              </h3>
              <div className="space-y-2">
                {specializations.map((spec, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-semibold">{spec.area}</span>
                    <span className="text-muted-foreground"> &mdash; {spec.detail}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* RECENT PROJECTS */}
          <section>
            <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <BarChart3 className="size-3.5" />
              Recent Projects
              <span className="flex-1 h-px bg-border" />
            </h3>
            {loadingTasks ? (
              <div className="space-y-1.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-6 rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : tasks.length > 0 ? (
              <div className="space-y-1.5">
                {tasks.map((task) => {
                  const s = statusIcon[task.status] ?? statusIcon.todo ?? { label: task.status, cls: "text-slate-500" }
                  const isDone = task.status === "done" || task.status === "completed"
                  return (
                    <div key={task.id} className="flex items-center gap-2 text-sm">
                      {isDone ? (
                        <CheckCircle2 className={`size-3.5 shrink-0 ${s.cls}`} />
                      ) : task.status === "in-progress" || task.status === "in_progress" ? (
                        <RefreshCw className={`size-3.5 shrink-0 ${s.cls}`} />
                      ) : (
                        <Clock className={`size-3.5 shrink-0 ${s.cls}`} />
                      )}
                      <span className="truncate">{task.title}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No recent tasks found.</p>
            )}
          </section>

          {/* STATS */}
          <section>
            <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              Stats
              <span className="flex-1 h-px bg-border" />
            </h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                <span className="font-semibold">{employee.messages_handled}</span>{" "}
                <span className="text-muted-foreground">messages</span>
              </span>
              <span className="text-muted-foreground">&middot;</span>
              <span>
                <span className="font-semibold">{tasks.length}</span>{" "}
                <span className="text-muted-foreground">tasks</span>
              </span>
              {joinedAt && (
                <>
                  <span className="text-muted-foreground">&middot;</span>
                  <span>
                    <span className="text-muted-foreground">Joined</span>{" "}
                    <span className="font-semibold">{timeAgo(joinedAt)}</span>
                  </span>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
