import { supabaseUsdrop } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { EmailTabs } from "./EmailTabs"

export const dynamic = "force-dynamic"
export const metadata = { title: "Email — USDrop | Suprans" }

type Template = {
  id: string
  name: string | null
  subject: string | null
  type: string | null
  category: string | null
  is_active: boolean | null
  created_at: string | null
}

type Automation = {
  id: string
  name: string | null
  trigger: string | null
  delay: number | null
  delay_unit: string | null
  is_active: boolean | null
  target_audience: string | null
  template_id: string | null
  created_at: string | null
}

type Log = {
  id: string
  recipient_email: string | null
  subject: string | null
  status: string | null
  sent_at: string | null
  template_id: string | null
  created_at: string | null
}

async function fetchAll() {
  const [t, a, l] = await Promise.all([
    supabaseUsdrop
      .from("email_templates")
      .select("id, name, subject, type, category, is_active, created_at")
      .order("created_at", { ascending: false }),
    supabaseUsdrop
      .from("email_automations")
      .select(
        "id, name, trigger, delay, delay_unit, is_active, target_audience, template_id, created_at",
      )
      .order("created_at", { ascending: false }),
    supabaseUsdrop
      .from("email_logs")
      .select("id, recipient_email, subject, status, sent_at, template_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ])
  return {
    templates: (t.data ?? []) as Template[],
    automations: (a.data ?? []) as Automation[],
    logs: (l.data ?? []) as Log[],
  }
}

export default async function EmailPage() {
  const { templates, automations, logs } = await fetchAll()
  return (
    <div className="space-y-5">
      <PageHeader
        title="Email automation"
        subtitle="Templates, triggered automations, and the most recent delivery logs."
      />
      <EmailTabs templates={templates} automations={automations} logs={logs} />
    </div>
  )
}
