import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendSMS, sendWhatsApp, renderTemplate, isTwilioConfigured } from "@/lib/twilio"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { channel, template_id, to_number, to_name, variables, body_override } = body as {
      channel: "sms" | "whatsapp"
      template_id?: string
      to_number: string
      to_name?: string
      variables?: Record<string, string>
      body_override?: string
    }

    if (!to_number) return NextResponse.json({ error: "to_number is required" }, { status: 400 })
    if (!channel) return NextResponse.json({ error: "channel is required" }, { status: 400 })

    let messageBody: string

    if (template_id) {
      const { data: template } = await getSupabase().from("sms_templates").select("*").eq("id", template_id).single()
      if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 })
      messageBody = renderTemplate(template.body, variables ?? {})
    } else if (body_override) {
      messageBody = body_override
    } else {
      return NextResponse.json({ error: "Either template_id or body_override required" }, { status: 400 })
    }

    if (!isTwilioConfigured()) {
      await getSupabase().from("sms_logs").insert({
        template_id: template_id ?? null,
        channel,
        to_number,
        to_name: to_name ?? null,
        body: messageBody,
        status: "simulated",
        metadata: { variables, note: "Twilio not configured" },
      })
      return NextResponse.json({ success: true, simulated: true })
    }

    const result = channel === "whatsapp"
      ? await sendWhatsApp({ to: to_number, body: messageBody })
      : await sendSMS({ to: to_number, body: messageBody })

    await getSupabase().from("sms_logs").insert({
      template_id: template_id ?? null,
      channel,
      to_number,
      to_name: to_name ?? null,
      body: messageBody,
      status: result.success ? "sent" : "failed",
      twilio_sid: result.sid ?? null,
      error_message: result.error ?? null,
      metadata: { variables },
    })

    return NextResponse.json({ success: result.success, sid: result.sid, error: result.error })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
