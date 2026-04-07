import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  getProfiles,
  getBalances,
  getStatement,
  extractWiseTransaction,
  isWiseConfigured,
} from "@/lib/wise-api"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
)

export async function POST() {
  try {
    const configured = isWiseConfigured()
    const envKey = process.env.WISE_API_KEY ?? "NOT_SET"

    if (!configured) {
      return NextResponse.json({
        error: "Wise API key not configured",
        debug: { envKeyLength: envKey.length, envKeyPrefix: envKey.slice(0, 8) },
      }, { status: 400 })
    }

    // Step 1: Get profiles
    const profiles = await getProfiles()
    if (profiles.length === 0) {
      return NextResponse.json({ error: "No Wise profiles found", debug: { envKey: (process.env.WISE_API_KEY ?? "").slice(0, 12) } }, { status: 400 })
    }

    const profile = profiles.find((p) => p.type.toLowerCase() === "business") ?? profiles[0]
    console.log(`Wise sync: Using profile ${profile.id} (${profile.type})`)

    const results: {
      accounts_synced: number
      transactions_synced: number
      total_balance_usd: number
    } = { accounts_synced: 0, transactions_synced: 0, total_balance_usd: 0 }

    // Step 2: Get balances
    const balances = await getBalances(profile.id)

    console.log(`Wise sync: Found ${balances.length} balances`)
    // Only sync accounts with balance > 0 (skip empty currency accounts)
    const activeBalances = balances.filter((b) => b.amount.value > 0)
    console.log(`Wise sync: ${activeBalances.length} active balances`)

    for (const balance of activeBalances) {
      // Try insert first, then update if exists
      const name = `Wise ${balance.currency}`
      const balanceCents = Math.round(balance.amount.value * 100)

      const { data: existing } = await supabase
        .from("bank_accounts")
        .select("id")
        .eq("name", name)
        .single()

      let accountId: string
      if (existing) {
        await supabase
          .from("bank_accounts")
          .update({ balance_cents: balanceCents, last_synced_at: new Date().toISOString() })
          .eq("id", existing.id)
        accountId = existing.id
      } else {
        const { data: inserted } = await supabase
          .from("bank_accounts")
          .insert({
            name,
            currency: balance.currency,
            balance_cents: balanceCents,
            account_type: "checking",
            provider: "wise",
            account_number_last4: String(balance.id).slice(-4),
            last_synced_at: new Date().toISOString(),
          })
          .select("id")
          .single()
        if (!inserted) continue
        accountId = inserted.id
      }

      results.accounts_synced++
      if (balance.currency === "USD") {
        results.total_balance_usd = balance.amount.value
      }
      const account = { id: accountId }

      // Step 3: Get all-time transactions (from account creation)
      const endDate = new Date().toISOString()
      const startDate = new Date("2024-01-01T00:00:00Z").toISOString() // all-time from 2024

      const statement = await getStatement(
        profile.id,
        balance.id,
        balance.currency,
        startDate,
        endDate
      )

      if (statement.transactions.length > 0) {
        const txnRows = statement.transactions.map((txn) => ({
          ...extractWiseTransaction(txn),
          account_id: account.id,
        }))

        // Upsert by reference to avoid duplicates
        for (const row of txnRows) {
          if (row.reference) {
            await supabase
              .from("bank_transactions_v2")
              .upsert(row, { onConflict: "id" })
              .select()
          } else {
            await supabase.from("bank_transactions_v2").insert(row)
          }
          results.transactions_synced++
        }
      }
    }

    return NextResponse.json({
      success: true,
      profile_id: profile.id,
      profile_type: profile.type,
      balances_found: balances.length,
      active_balances: activeBalances.length,
      ...results,
      synced_at: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
