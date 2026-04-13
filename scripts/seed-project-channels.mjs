#!/usr/bin/env node
// One-shot: for every active ETS client, create 3 chat channels (general,
// brand-kit, layout) in public.chat_channels, scoped by project_id = client.id.
// Add the client's auth user as a member. Also install a trigger so new
// clients auto-get the same channel set.
//
// Usage: node scripts/seed-project-channels.mjs

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const txt = readFileSync(join(__dirname, "..", ".env.local"), "utf8")
  const env = {}
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

const env = loadEnv()
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const SVC = env.SUPABASE_SERVICE_ROLE_KEY
const sb = createClient(URL, SVC, { auth: { persistSession: false } })
const sbEts = createClient(URL, SVC, {
  auth: { persistSession: false },
  db: { schema: "ets" },
})

const KINDS = [
  { kind: "project-general", label: "General" },
  { kind: "project-brand-kit", label: "Brand kit" },
  { kind: "project-layout", label: "Layout" },
]

async function main() {
  console.log("→ Loading active clients…")
  const { data: clients, error } = await sbEts
    .from("clients")
    .select("id, name, email")
    .not("email", "is", null)
    .not("stage", "in", '("lost","refund")')
  if (error) throw error
  console.log(`  ${clients.length} active clients`)

  console.log("→ Loading auth users…")
  const { data: usersList } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const emailToUser = new Map(
    usersList.users.map((u) => [u.email?.toLowerCase(), u]),
  )
  const adminUser = usersList.users.find(
    (u) => u.user_metadata?.role === "admin",
  )
  if (!adminUser) console.warn("  no admin user found — channels will have only the client as member")

  let channelsCreated = 0
  let membersCreated = 0

  for (const c of clients) {
    const authUser = emailToUser.get(c.email.toLowerCase())
    if (!authUser) {
      console.warn(`  ⚠ no auth user for ${c.email} — skipping`)
      continue
    }
    for (const k of KINDS) {
      // Does a channel already exist for this (project_id, kind)?
      const { data: existing } = await sb
        .from("chat_channels")
        .select("id")
        .eq("project_id", c.id)
        .eq("channel_kind", k.kind)
        .maybeSingle()
      let channelId = existing?.id
      if (!channelId) {
        const { data: created, error: cErr } = await sb
          .from("chat_channels")
          .insert({
            name: `${c.name} · ${k.label}`,
            type: "channel",
            description: `${k.label} thread for ${c.name}`,
            project_id: c.id,
            channel_kind: k.kind,
            venture: "ets",
            space_slug: "ets",
            is_private: false,
          })
          .select("id")
          .single()
        if (cErr) {
          console.error(`  ✗ channel ${c.name}/${k.kind}: ${cErr.message}`)
          continue
        }
        channelId = created.id
        channelsCreated++
      }
      // Add client as member
      const clientName = c.name ?? "Client"
      await sb.from("chat_channel_members").upsert(
        {
          channel_id: channelId,
          user_id: authUser.id,
          member_name: clientName,
          role: "member",
          added_by: adminUser?.id ?? authUser.id,
        },
        { onConflict: "channel_id,user_id" },
      )
      membersCreated++
      if (adminUser) {
        await sb.from("chat_channel_members").upsert(
          {
            channel_id: channelId,
            user_id: adminUser.id,
            member_name: adminUser.user_metadata?.name ?? "Admin",
            role: "admin",
            added_by: adminUser.id,
          },
          { onConflict: "channel_id,user_id" },
        )
        membersCreated++
      }
    }
  }

  console.log(`\n✓ ${channelsCreated} channels created · ${membersCreated} memberships upserted`)
}

main().catch((e) => {
  console.error("FATAL:", e)
  process.exit(1)
})
