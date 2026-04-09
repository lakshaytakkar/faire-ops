"use client"

import { useState, useEffect } from "react"
import { Mail, Phone, Users, UserPlus, MessageCircle, Calendar, Award, Briefcase, ChevronDown, ChevronUp, CheckSquare, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"

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

const ACCENT_COLORS = ["#10b981", "#3b5bdb", "#f59e0b", "#8b5cf6"]

export default function TeamPage() {
  interface MemberTask { id: string; title: string; status: string; priority: string; due_date: string; tags?: string[] }

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [memberTasks, setMemberTasks] = useState<Record<string, MemberTask[]>>({})
  const [expandedMember, setExpandedMember] = useState<string | null>(null)

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

  const totalTasks = teamMembers.reduce((s, m) => s + (m.tasks_completed ?? 0), 0)

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
            {teamMembers.length} members &middot; {totalTasks} tasks completed
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <UserPlus className="size-4" />
          Add Member
        </button>
      </div>

      {/* Team Cards */}
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
    </div>
  )
}
