import { SubNav } from "@/components/shared/sub-nav"

const COMMS_NAV = [
  { title: "Overview", href: "/workspace/comms/overview" },
  { title: "Templates", href: "/workspace/comms/templates" },
  { title: "Campaigns", href: "/workspace/comms/campaigns" },
  { title: "Triggers", href: "/workspace/comms/triggers" },
  { title: "Logs", href: "/workspace/comms/logs" },
]

export default function CommsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav items={COMMS_NAV} />
      {children}
    </>
  )
}
