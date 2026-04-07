import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendEmail, renderTemplate, isResendConfigured } from "@/lib/resend"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { template_id, to_email, to_name, variables, subject_override, html_override } = body as {
      template_id?: string
      to_email: string
      to_name?: string
      variables?: Record<string, string>
      subject_override?: string
      html_override?: string
    }

    if (!to_email) {
      return NextResponse.json({ error: "to_email is required" }, { status: 400 })
    }

    let subject: string
    let html: string

    if (template_id) {
      const { data: template } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", template_id)
        .single()

      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 })
      }

      subject = renderTemplate(template.subject, variables ?? {})
      html = renderTemplate(template.body_html, variables ?? {})
    } else if (subject_override && html_override) {
      subject = subject_override
      html = html_override
    } else {
      return NextResponse.json({ error: "Either template_id or subject_override+html_override required" }, { status: 400 })
    }

    if (!isResendConfigured()) {
      // Log but don't actually send
      await supabase.from("email_logs").insert({
        template_id: template_id ?? null,
        to_email,
        to_name: to_name ?? null,
        subject,
        body_html: html,
        status: "simulated",
        metadata: { variables, note: "Resend API key not configured" },
      })
      return NextResponse.json({ success: true, simulated: true, message: "Email logged but not sent (no API key)" })
    }

    const result = await sendEmail({ to: to_email, toName: to_name, subject, html })

    await supabase.from("email_logs").insert({
      template_id: template_id ?? null,
      to_email,
      to_name: to_name ?? null,
      subject,
      body_html: html,
      status: result.success ? "sent" : "failed",
      resend_id: result.id ?? null,
      error_message: result.error ?? null,
      metadata: { variables },
    })

    return NextResponse.json({ success: result.success, id: result.id, error: result.error })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
