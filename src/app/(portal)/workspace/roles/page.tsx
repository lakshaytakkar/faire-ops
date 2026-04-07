"use client"

import { CheckCircle, Minus, Shield, Users, Eye, Settings } from "lucide-react"

interface Role {
  name: string
  description: string
  memberCount: number
  icon: React.ReactNode
  iconBg: string
}

const ROLES: Role[] = [
  {
    name: "Admin",
    description: "Full access",
    memberCount: 1,
    icon: <Shield className="size-4 text-red-600" />,
    iconBg: "bg-red-500/10",
  },
  {
    name: "Manager",
    description: "Operations access",
    memberCount: 2,
    icon: <Settings className="size-4 text-blue-600" />,
    iconBg: "bg-blue-500/10",
  },
  {
    name: "Operator",
    description: "Day-to-day tasks",
    memberCount: 2,
    icon: <Users className="size-4 text-amber-600" />,
    iconBg: "bg-amber-500/10",
  },
  {
    name: "Viewer",
    description: "Read-only access",
    memberCount: 1,
    icon: <Eye className="size-4 text-slate-600" />,
    iconBg: "bg-slate-500/10",
  },
]

const PERMISSIONS = [
  "View Dashboard",
  "Manage Orders",
  "Accept Orders",
  "Manage Products",
  "Edit Pipeline",
  "View CRM",
  "Send Outreach",
  "View Analytics",
  "Manage Team",
  "Edit Settings",
] as const

type Permission = (typeof PERMISSIONS)[number]

const PERMISSION_MATRIX: Record<string, Set<Permission>> = {
  Admin: new Set(PERMISSIONS),
  Manager: new Set<Permission>([
    "View Dashboard",
    "Manage Orders",
    "Accept Orders",
    "Manage Products",
    "Edit Pipeline",
    "View CRM",
    "Send Outreach",
    "View Analytics",
  ]),
  Operator: new Set<Permission>([
    "View Dashboard",
    "Manage Orders",
    "Accept Orders",
    "Manage Products",
    "Edit Pipeline",
    "View CRM",
    "View Analytics",
  ]),
  Viewer: new Set<Permission>(["View Dashboard", "View CRM", "View Analytics"]),
}

export default function RolesPermissionsPage() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Roles &amp; Permissions
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Define access levels for team members
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLES.map((role) => (
          <div key={role.name} className="rounded-md border bg-card p-5">
            <div className="flex items-center gap-3">
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center ${role.iconBg}`}
              >
                {role.icon}
              </div>
              <div>
                <p className="text-sm font-semibold">{role.name}</p>
                <p className="text-xs text-muted-foreground">{role.description}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{role.memberCount}</span>{" "}
                {role.memberCount === 1 ? "member" : "members"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Permissions Matrix */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b">
          <h2 className="text-sm font-semibold">Permissions Matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">
                  Permission
                </th>
                {ROLES.map((role) => (
                  <th
                    key={role.name}
                    className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center"
                  >
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((permission) => (
                <tr
                  key={permission}
                  className="border-b last:border-b-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3.5 text-sm">{permission}</td>
                  {ROLES.map((role) => {
                    const granted = PERMISSION_MATRIX[role.name].has(permission)
                    return (
                      <td key={role.name} className="px-4 py-3.5 text-center">
                        {granted ? (
                          <CheckCircle className="size-4 text-emerald-600 mx-auto" />
                        ) : (
                          <Minus className="size-4 text-muted-foreground/30 mx-auto" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
