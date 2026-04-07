import { Resend } from "resend"

const API_KEY = process.env.RESEND_API_KEY ?? ""
const FROM_EMAIL = "notifications@suprans.in"
const FROM_NAME = "Faire Ops"

export const resend = API_KEY ? new Resend(API_KEY) : null

export function isResendConfigured(): boolean {
  return API_KEY !== "" && API_KEY !== "your-resend-api-key-here"
}

export async function sendEmail(args: {
  to: string
  toName?: string
  subject: string
  html: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resend) return { success: false, error: "Resend not configured" }
  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: args.to,
      subject: args.subject,
      html: args.html,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, id: data?.id }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

export function renderTemplate(html: string, variables: Record<string, string>): string {
  let result = html
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value)
  }
  return result
}
