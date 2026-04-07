/**
 * Seed 3 sample reports by calling the generate API.
 * Usage: npx tsx scripts/seed-reports.ts
 * Requires the dev server running at localhost:3000
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000"

async function generate(report_type: string) {
  console.log(`Generating ${report_type} report...`)
  const res = await fetch(`${BASE}/api/reports/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report_type }),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error(`  Failed (${res.status}): ${text}`)
    return
  }
  const { report } = await res.json()
  console.log(`  Created: ${report.title} (id: ${report.id})`)
}

async function main() {
  // Generate one of each type
  await generate("daily")
  await generate("weekly")
  await generate("monthly")
  console.log("\nDone! 3 reports seeded.")
}

main().catch(console.error)
