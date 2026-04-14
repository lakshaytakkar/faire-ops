import { supabaseUsdrop } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { SmsTabs } from "./SmsTabs"

export const dynamic = "force-dynamic"
export const metadata = { title: "SMS — USDrop | Suprans" }

async function fetchAll() {
  const [t, a, l] = await Promise.all([
    supabaseUsdrop
      .from("sms_templates")
      .select("id, name, body, category, type, is_active, created_at")
      .order("created_at", { ascending: false }),
    supabaseUsdrop
      .from("sms_automations")
      .select(
        "id, name, trigger, delay, delay_unit, is_active, target_audience, template_id, created_at",
      )
      .order("created_at", { ascending: false }),
    supabaseUsdrop
      .from("sms_logs")
      .select("id, recipient_phone, message, status, sent_at, template_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ])
  return {
    templates: t.data ?? [],
    automations: a.data ?? [],
    logs: l.data ?? [],
  }
}

export default async function SmsPage() {
  const { templates, automations, logs } = await fetchAll()
  return (
    <div className="space-y-5">
      <PageHeader
        title="SMS automation"
        subtitle="Templates, triggered automations, and the most recent delivery logs."
      />
      <SmsTabs templates={templates} automations={automations} logs={logs} />
    </div>
  )
}
