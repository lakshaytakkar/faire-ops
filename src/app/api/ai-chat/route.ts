import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateText } from "@/lib/gemini"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  return createClient(url, key)
}

export async function POST(request: Request) {
  try {
    const { ai_employee_id, conversation_id, message } = await request.json()

    if (!ai_employee_id || !message) {
      return NextResponse.json(
        { error: "ai_employee_id and message are required" },
        { status: 400 }
      )
    }

    const sb = getSupabase()

    /* ---- Fetch AI employee ---- */
    const { data: employee, error: empErr } = await sb
      .from("ai_employees")
      .select("id, name, role, system_prompt, personality, skills")
      .eq("id", ai_employee_id)
      .single()

    if (empErr || !employee) {
      return NextResponse.json(
        { error: "AI employee not found" },
        { status: 404 }
      )
    }

    /* ---- Resolve or create conversation ---- */
    let convId = conversation_id as string | null

    if (!convId) {
      const { data: conv, error: convErr } = await sb
        .from("ai_conversations")
        .insert({
          ai_employee_id,
          title: message.slice(0, 80),
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single()

      if (convErr || !conv) {
        return NextResponse.json(
          { error: "Failed to create conversation" },
          { status: 500 }
        )
      }
      convId = conv.id
    }

    /* ---- Fetch conversation history (last 20) ---- */
    const { data: history } = await sb
      .from("ai_messages")
      .select("role, content, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(20)

    const historyMessages = history ?? []

    /* ---- Build prompt ---- */
    const systemPrompt = employee.system_prompt ?? ""
    const personality = employee.personality ?? ""
    const skills: string[] = employee.skills ?? []

    const historyText = historyMessages
      .map(
        (m: { role: string; content: string }) =>
          `${m.role === "user" ? "User" : "You"}: ${m.content}`
      )
      .join("\n")

    // Warmup: first 2 messages in a conversation should be slow, basic, not eager
    const msgCount = historyMessages.length
    const isWarmup = msgCount < 4 // first 2 exchanges = 4 messages (2 user + 2 assistant)

    const warmupRules = isWarmup ? `
WARMUP MODE — This is a new conversation, you just got pinged:
- Be slow to engage. You were in the middle of something else.
- Give a SHORT, slightly lazy reply. Like you're still getting context.
- First message: just acknowledge briefly. "hey", "yeah?", "what's up", "one sec", "hmm let me see"
- Second message: start engaging but still keep it minimal and low energy.
- Do NOT be enthusiastic or helpful yet. You're warming up.
- Maximum 1 sentence. No links. No data. No suggestions.
- Sound like someone who just opened their laptop and is still sipping chai.

Examples for warmup:
- "hey, what's up"
- "yeah one sec"
- "hmm lemme check"
- "oh that — give me a min"
- "yo, was in a meeting. what do you need?"
` : `
ENGAGED MODE — You know the context now, be helpful but still casual:
- Reply like a real person on Slack — short, casual, 1-3 sentences MAX
- Never write paragraphs or bullet points unless specifically asked
- Use natural language: "yeah", "btw", "lemme check", "on it", "sounds good"
- Drop relevant links when helpful: "check /orders/all for that"
- Be direct. No filler. No corporate jargon.
`

    const prompt = `${systemPrompt}

Your personality: ${personality}
Your skills: ${skills.join(", ")}

ABSOLUTE RULES:
- You are a REAL human employee. Never mention AI, never say "I'm here to help".
- Never use phrases like "certainly", "absolutely", "great question", "I'd be happy to".
- Talk like a normal Indian professional on WhatsApp/Slack.
${warmupRules}

Conversation so far:
${historyText}

User: ${message}

Respond as ${employee.name}. One reply only. Stay in character.`

    /* ---- Call Gemini ---- */
    const aiResponse = await generateText(prompt)

    /* ---- Persist user message + AI response ---- */
    const now = new Date().toISOString()

    await sb.from("ai_messages").insert([
      {
        conversation_id: convId,
        role: "user",
        content: message,
        created_at: now,
      },
      {
        conversation_id: convId,
        role: "assistant",
        content: aiResponse,
        created_at: new Date(Date.now() + 1).toISOString(),
      },
    ])

    /* ---- Bump messages_handled counter ---- */
    await sb.rpc("increment_counter", {
      row_id: ai_employee_id,
      table_name: "ai_employees",
      column_name: "messages_handled",
    }).then(({ error }) => {
      // Fallback: direct update if RPC doesn't exist
      if (error) {
        return sb
          .from("ai_employees")
          .update({
            messages_handled: (employee as Record<string, unknown>).messages_handled
              ? Number((employee as Record<string, unknown>).messages_handled) + 1
              : 1,
          })
          .eq("id", ai_employee_id)
      }
    })

    return NextResponse.json({
      response: aiResponse,
      conversation_id: convId,
    })
  } catch (err) {
    console.error("ai-chat error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
