"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Mail, Phone, Users, UserPlus, MessageCircle, Calendar, Award, Briefcase, ChevronDown, ChevronUp, CheckSquare, Clock, Wifi, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import EmployeeCVModal, { type EmployeeCVModalProps } from "@/components/shared/employee-cv-modal"

interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  role: string
  avatar_url?: string
  status: "active" | "online" | "away" | "offline"
  tasks_completed: number
  created_at: string
}

interface AIEmployee {
  id: string
  name: string
  role: string
  department: string
  avatar_url?: string
  skills: string[]
  messages_handled: number
  bio?: string
  education?: Array<{type: string; name: string; year: string}>
  tools_used?: string[]
  connectors?: string[]
  specializations?: Array<{area: string; detail: string}>
  joined_at?: string
}

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  active: { label: "Active", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  online: { label: "Online", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  away: { label: "Away", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  offline: { label: "Offline", dot: "bg-slate-300", badge: "bg-slate-50 text-slate-500 border-slate-200" },
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

function getDeptBadge(role: string): { label: string; cls: string } {
  if (role.toLowerCase().includes("fulfilment")) return { label: "Fulfilment", cls: "bg-blue-50 text-blue-700 border-blue-200" }
  if (role.toLowerCase().includes("catalog") || role.toLowerCase().includes("marketing")) return { label: "Catalog & Marketing", cls: "bg-purple-50 text-purple-700 border-purple-200" }
  if (role.toLowerCase().includes("manager") || role.toLowerCase().includes("admin")) return { label: "Management", cls: "bg-amber-50 text-amber-700 border-amber-200" }
  return { label: "Operations", cls: "bg-slate-50 text-slate-600 border-slate-200" }
}

function getDeptBadgeFromDept(department: string): { label: string; cls: string } {
  const d = department.toLowerCase()
  if (d.includes("fulfil") || d.includes("logistics") || d.includes("warehouse")) return { label: department, cls: "bg-blue-50 text-blue-700 border-blue-200" }
  if (d.includes("catalog") || d.includes("marketing") || d.includes("content")) return { label: department, cls: "bg-purple-50 text-purple-700 border-purple-200" }
  if (d.includes("sales") || d.includes("customer") || d.includes("support")) return { label: department, cls: "bg-rose-50 text-rose-700 border-rose-200" }
  if (d.includes("analytics") || d.includes("data") || d.includes("finance")) return { label: department, cls: "bg-cyan-50 text-cyan-700 border-cyan-200" }
  if (d.includes("manage") || d.includes("admin") || d.includes("operations")) return { label: department, cls: "bg-amber-50 text-amber-700 border-amber-200" }
  return { label: department, cls: "bg-slate-50 text-slate-600 border-slate-200" }
}

const ACCENT_COLORS = ["#10b981", "#3b5bdb", "#f59e0b", "#8b5cf6"]
const REMOTE_ACCENT_COLORS = ["#6366f1", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6"]

type Tab = "in-house" | "remote"

export default function TeamPage() {
  interface MemberTask { id: string; title: string; status: string; priority: string; due_date: string; tags?: string[] }

  const [activeTab, setActiveTab] = useState<Tab>("in-house")
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [aiEmployees, setAiEmployees] = useState<AIEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [memberTasks, setMemberTasks] = useState<Record<string, MemberTask[]>>({})
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [cvEmployee, setCvEmployee] = useState<EmployeeCVModalProps["employee"] | null>(null)

  /* Fetch in-house team on mount */
  useEffect(() => {
    Promise.all([
      supabase.from("team_members").select("*").order("name"),
      supabase.from("tasks").select("id, title, status, priority, due_date, assignee, tags").order("due_date"),
    ]).then(([teamRes, taskRes]) => {
      if (teamRes.data) setTeamMembers(teamRes.data as TeamMember[])
      if (taskRes.data) {
        const map: Record<string, MemberTask[]> = {}
        for (const t of taskRes.data) {
          const key = t.assignee as string
          if (!map[key]) map[key] = []
          map[key].push(t as MemberTask)
        }
        setMemberTasks(map)
      }
      setLoading(false)
    })
  }, [])

  /* Fetch remote team when tab switches */
  useEffect(() => {
    if (activeTab === "remote" && aiEmployees.length === 0) {
      setRemoteLoading(true)
      supabase
        .from("ai_employees")
        .select("id, name, role, department, avatar_url, skills, messages_handled, bio, education, tools_used, connectors, specializations, joined_at")
        .order("name")
        .then(({ data }) => {
          if (data) setAiEmployees(data as AIEmployee[])
          setRemoteLoading(false)
        })
    }
  }, [activeTab, aiEmployees.length])

  const totalTasks = teamMembers.reduce((s, m) => s + (m.tasks_completed ?? 0), 0)
  const totalMessages = aiEmployees.reduce((s, e) => s + (e.messages_handled ?? 0), 0)

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-8 w-32 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-[500px] rounded-xl bg-muted animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Team</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {activeTab === "in-house"
              ? <>{teamMembers.length} members &middot; {totalTasks} tasks completed</>
              : <>{aiEmployees.length} remote members &middot; {totalMessages} messages handled</>
            }
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <UserPlus className="size-4" />
          Add Member
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/60 w-fit">
        <button
          onClick={() => setActiveTab("in-house")}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "in-house"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="size-3.5" />
          In-House Team
        </button>
        <button
          onClick={() => setActiveTab("remote")}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "remote"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wifi className="size-3.5" />
          Remote Team
        </button>
      </div>

      {/* In-House Team Cards */}
      {activeTab === "in-house" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {teamMembers.map((member, i) => {
            const sc = statusConfig[member.status] ?? statusConfig.offline
            const dept = getDeptBadge(member.role)
            const isLead = member.name === "Lakshay"
            const accentColor = isLead ? "#10b981" : ACCENT_COLORS[i % ACCENT_COLORS.length]
            const joinDate = member.created_at ? new Date(member.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : null

            return (
              <div
                key={member.id}
                className="rounded-xl overflow-hidden bg-card"
                style={{
                  border: isLead ? "2px solid #10b981" : "1px solid hsl(var(--border))",
                }}
              >
                {/* Photo */}
                <div className="p-2.5 pb-0">
                  <div className="relative rounded-md overflow-hidden">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.name}
                        className="w-full aspect-[4/3] object-cover object-top"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-full aspect-[4/3] flex items-center justify-center text-white text-3xl font-bold"
                        style={{ backgroundColor: accentColor }}
                      >
                        {getInitials(member.name)}
                      </div>
                    )}
                    {isLead && (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                        <Award className="size-2" />
                        LEAD
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-2.5 space-y-2">
                  {/* Name + Role */}
                  <div>
                    <h3 className="text-sm font-bold font-heading leading-tight">{member.name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{member.role}</p>
                  </div>

                  {/* Department + Status badges */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${dept.cls}`}>
                      <Briefcase className="size-2.5" />
                      {dept.label}
                    </span>
                  </div>

                  {/* Workload summary */}
                  {(() => {
                    const tasks = memberTasks[member.name] ?? []
                    const active = tasks.filter(t => t.status !== "done").length
                    const done = tasks.filter(t => t.status === "done").length
                    const isExpanded = expandedMember === member.id
                    return (
                      <>
                        <button
                          onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                          className="w-full flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/40 text-[10px]"
                        >
                          <span className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-blue-600"><Clock className="size-2.5" /> {active} active</span>
                            <span className="flex items-center gap-1 text-emerald-600"><CheckSquare className="size-2.5" /> {done} done</span>
                          </span>
                          {isExpanded ? <ChevronUp className="size-3 text-muted-foreground" /> : <ChevronDown className="size-3 text-muted-foreground" />}
                        </button>
                        {isExpanded && tasks.length > 0 && (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {tasks.filter(t => t.status !== "done").slice(0, 8).map(t => (
                              <div key={t.id} className="flex items-center gap-1.5 py-0.5 px-1">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.priority === "high" ? "bg-red-500" : t.priority === "medium" ? "bg-amber-500" : "bg-slate-400"}`} />
                                <span className="text-[10px] truncate">{t.title.replace(/^\[(Daily|Weekly)\]\s*/, "")}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )
                  })()}

                  {/* Action buttons */}
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    <a
                      href={`mailto:${member.email}`}
                      className="inline-flex items-center justify-center gap-1 h-7 rounded border border-red-100 bg-red-50 text-[9px] font-medium text-red-600"
                    >
                      <Mail className="size-2.5" />
                      Email
                    </a>
                    <a
                      href={member.phone ? `tel:${member.phone}` : "#"}
                      className="inline-flex items-center justify-center gap-1 h-7 rounded border border-blue-100 bg-blue-50 text-[9px] font-medium text-blue-600"
                    >
                      <Phone className="size-2.5" />
                      Call
                    </a>
                    <a
                      href={member.phone ? `https://wa.me/${member.phone?.replace(/[^0-9]/g, "")}` : "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 h-7 rounded border border-emerald-100 bg-emerald-50 text-[9px] font-medium text-emerald-600"
                    >
                      <MessageCircle className="size-2.5" />
                      WA
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Remote Team Cards */}
      {activeTab === "remote" && (
        remoteLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-[400px] rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {aiEmployees.map((emp, i) => {
              const photoUrl = emp.avatar_url
              const dept = getDeptBadgeFromDept(emp.department || "Operations")
              const accentColor = REMOTE_ACCENT_COLORS[i % REMOTE_ACCENT_COLORS.length]
              const skills: string[] = emp.skills ?? []

              return (
                <div
                  key={emp.id}
                  className="rounded-xl overflow-hidden bg-card border border-border"
                >
                  {/* Photo */}
                  <div className="p-2.5 pb-0">
                    <div className="relative rounded-md overflow-hidden">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={emp.name}
                          className="w-full aspect-[4/3] object-cover object-top"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="w-full aspect-[4/3] flex items-center justify-center text-white text-3xl font-bold"
                          style={{ backgroundColor: accentColor }}
                        >
                          {getInitials(emp.name)}
                        </div>
                      )}
                      {/* WFH badge */}
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-violet-600 text-white text-[9px] font-bold">
                        <Wifi className="size-2" />
                        WFH
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-2.5 space-y-2">
                    {/* Name + Role */}
                    <div>
                      <h3 className="text-sm font-bold font-heading leading-tight">{emp.name}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{emp.role}</p>
                    </div>

                    {/* Department badge */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${dept.cls}`}>
                        <Briefcase className="size-2.5" />
                        {dept.label}
                      </span>
                    </div>

                    {/* Skills tags */}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {skills.slice(0, 5).map((skill) => (
                          <span
                            key={skill}
                            className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100"
                          >
                            {skill}
                          </span>
                        ))}
                        {skills.length > 5 && (
                          <span className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            +{skills.length - 5}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Messages handled */}
                    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/40 text-[10px]">
                      <span className="flex items-center gap-1 text-indigo-600">
                        <MessageCircle className="size-2.5" />
                        {emp.messages_handled ?? 0} messages handled
                      </span>
                    </div>

                    {/* Chat + CV buttons */}
                    <div className="grid grid-cols-2 gap-1 pt-0.5">
                      <Link
                        href="/workspace/ai-team"
                        className="inline-flex items-center justify-center gap-1 h-7 rounded border border-indigo-100 bg-indigo-50 text-[9px] font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
                      >
                        <MessageCircle className="size-2.5" />
                        Chat
                      </Link>
                      <button
                        onClick={() =>
                          setCvEmployee({
                            id: emp.id,
                            name: emp.name,
                            role: emp.role,
                            department: emp.department || "Operations",
                            avatar_url: emp.avatar_url ?? undefined,
                            bio: emp.bio,
                            education: emp.education,
                            tools_used: emp.tools_used,
                            connectors: emp.connectors,
                            specializations: emp.specializations,
                            messages_handled: emp.messages_handled ?? 0,
                            joined_at: emp.joined_at,
                          })
                        }
                        className="inline-flex items-center justify-center gap-1 h-7 rounded border border-violet-100 bg-violet-50 text-[9px] font-medium text-violet-600 hover:bg-violet-100 transition-colors"
                      >
                        <FileText className="size-2.5" />
                        View CV
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* CV Modal */}
      {cvEmployee && (
        <EmployeeCVModal employee={cvEmployee} onClose={() => setCvEmployee(null)} />
      )}
    </div>
  )
}
