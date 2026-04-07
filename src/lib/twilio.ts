import twilio from "twilio"

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? ""
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? ""
const FROM_PHONE = process.env.TWILIO_PHONE_NUMBER ?? ""

function getClient() {
  if (!ACCOUNT_SID || !AUTH_TOKEN) return null
  return twilio(ACCOUNT_SID, AUTH_TOKEN)
}

export function isTwilioConfigured(): boolean {
  return ACCOUNT_SID !== "" && AUTH_TOKEN !== "" && FROM_PHONE !== ""
}

export async function sendSMS(args: {
  to: string
  body: string
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  const client = getClient()
  if (!client) return { success: false, error: "Twilio not configured" }
  try {
    const message = await client.messages.create({
      body: args.body,
      from: FROM_PHONE,
      to: args.to,
    })
    return { success: true, sid: message.sid }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

export async function sendWhatsApp(args: {
  to: string
  body: string
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  const client = getClient()
  if (!client) return { success: false, error: "Twilio not configured" }
  try {
    // WhatsApp requires "whatsapp:" prefix
    const toNumber = args.to.startsWith("whatsapp:") ? args.to : `whatsapp:${args.to}`
    const message = await client.messages.create({
      body: args.body,
      from: `whatsapp:${FROM_PHONE}`,
      to: toNumber,
    })
    return { success: true, sid: message.sid }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

export function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value)
  }
  return result
}
