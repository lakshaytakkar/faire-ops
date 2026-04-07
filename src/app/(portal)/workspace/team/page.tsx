"use client"

import { Mail, Phone, Users, CheckCircle, BarChart3, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TeamMember {
  id: string
  name: string
  initials: string
  role: string
  email: string
  phone: string
  department: string
  status: "online" | "away" | "offline"
  lastActive: string
  tasksCompleted: number
  avatarColor: string
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "1",
    name: "Lakshay",
    initials: "LK",
    role: "Founder & CEO",
    email: "lakshay@faire-ops.com",
    phone: "+1 (555) 100-0001",
    department: "Leadership",
    status: "online",
    lastActive: "Just now",
    tasksCompleted: 42,
    avatarColor: "bg-primary",
  },
  {
    id: "2",
    name: "Aditya",
    initials: "AD",
    role: "Operations Manager",
    email: "aditya@faire-ops.com",
    phone: "+1 (555) 100-0002",
    department: "Operations",
    status: "online",
    lastActive: "Just now",
    tasksCompleted: 38,
    avatarColor: "bg-emerald-500",
  },
  {
    id: "3",
    name: "Khushal",
    initials: "KH",
    role: "Fulfillment Lead",
    email: "khushal@faire-ops.com",
    phone: "+1 (555) 100-0003",
    department: "Fulfillment",
    status: "away",
    lastActive: "15 min ago",
    tasksCompleted: 31,
    avatarColor: "bg-amber-500",
  },
  {
    id: "4",
    name: "Bharti",
    initials: "BH",
    role: "CRM Specialist",
    email: "bharti@faire-ops.com",
    phone: "+1 (555) 100-0004",
    department: "CRM",
    status: "online",
    lastActive: "Just now",
    tasksCompleted: 27,
    avatarColor: "bg-purple-500",
  },
  {
    id: "5",
    name: "Allen",
    initials: "AL",
    role: "Product Manager",
    email: "allen@faire-ops.com",
    phone: "+1 (555) 100-0005",
    department: "Product",
    status: "offline",
    lastActive: "2 hours ago",
    tasksCompleted: 35,
    avatarColor: "bg-blue-500",
  },
  {
    id: "6",
    name: "Harsh",
    initials: "HA",
    role: "Analytics Lead",
    email: "harsh@faire-ops.com",
    phone: "+1 (555) 100-0006",
    department: "Analytics",
    status: "online",
    lastActive: "Just now",
    tasksCompleted: 29,
    avatarColor: "bg-pink-500",
  },
]

const statusDotColor: Record<TeamMember["status"], string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-slate-300",
}

export default function TeamPage() {
  const onlineCount = TEAM_MEMBERS.filter((m) => m.status === "online").length
  const totalTasks = TEAM_MEMBERS.reduce((sum, m) => sum + m.tasksCompleted, 0)
  const avgTasks = Math.round(totalTasks / TEAM_MEMBERS.length)

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Team</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            6 members across all departments
          </p>
        </div>
        <Button size="lg">
          <UserPlus className="size-4" />
          Invite Member
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Members</p>
            <p className="text-2xl font-bold font-heading mt-2">{TEAM_MEMBERS.length}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
        </div>

        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Online Now</p>
            <p className="text-2xl font-bold font-heading mt-2 text-emerald-600">{onlineCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-emerald-500/10">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </div>
        </div>

        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Tasks Completed</p>
            <p className="text-2xl font-bold font-heading mt-2">{totalTasks}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-amber-500/10">
            <BarChart3 className="h-4 w-4 text-amber-600" />
          </div>
        </div>

        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Avg Tasks/Member</p>
            <p className="text-2xl font-bold font-heading mt-2">{avgTasks}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-blue-500/10">
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEAM_MEMBERS.map((member) => (
          <div
            key={member.id}
            className="rounded-md border bg-card p-5 hover:shadow-sm transition-shadow"
          >
            {/* Top row: Avatar + Name + Role + Status */}
            <div className="flex items-start gap-3">
              <div className="relative">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold ${member.avatarColor}`}
                >
                  {member.initials}
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-card ${statusDotColor[member.status]}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </div>
            </div>

            {/* Info rows */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate">{member.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">{member.phone}</span>
              </div>
              <div>
                <span className="inline-flex items-center border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {member.department}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                Tasks: {member.tasksCompleted}
              </span>
              <span className="text-xs text-muted-foreground">{member.lastActive}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
