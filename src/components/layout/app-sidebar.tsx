"use client"

import * as React from "react"
import {
  LayoutDashboard,
  ShoppingCart,
  Layers,
  Package,
  Users,
  BarChart2,
  Settings,
} from "lucide-react"

import { NavMain } from "@/components/layout/nav-main"
import { NavProjects } from "@/components/layout/nav-projects"
import { NavUser } from "@/components/layout/nav-user"
import { TeamSwitcher } from "@/components/layout/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { BRANDS, ORDERS } from "@/lib/data"

const pendingCount = ORDERS.filter((o) => o.status === "pending").length

const data = {
  user: {
    name: "Lakshay",
    email: "Founder · Admin",
    avatar: "",
  },
  teams: [
    {
      name: "All Brands (6)",
      logo: <span className="text-[11px] font-bold">F</span>,
      plan: "Suprans · 6 Stores",
    },
    ...BRANDS.map((b) => ({
      name: b.name,
      logo: (
        <span
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: b.color }}
        />
      ),
      plan: b.category,
    })),
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboard />,
      isActive: false,
      items: [],
    },
    {
      title: "Orders",
      url: "/orders",
      icon: <ShoppingCart />,
      isActive: true,
      badge: pendingCount > 0 ? pendingCount : undefined,
      items: [],
    },
    {
      title: "Scraper & Pipeline",
      url: "/pipeline",
      icon: <Layers />,
      isActive: false,
      items: [],
    },
    {
      title: "Products",
      url: "/products",
      icon: <Package />,
      isActive: false,
      items: [],
    },
    {
      title: "CRM & Outreach",
      url: "/crm",
      icon: <Users />,
      isActive: false,
      items: [],
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: <BarChart2 />,
      isActive: false,
      items: [],
    },
  ],
  projects: [
    {
      name: "Settings",
      url: "/settings",
      icon: <Settings />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
