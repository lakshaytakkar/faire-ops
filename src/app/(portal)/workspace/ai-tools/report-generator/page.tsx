"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, BarChart3, Loader2, Download, CheckCircle2, AlertCircle } from "lucide-react"
import { generateProductResearchReport, isGeminiConfigured, type ProductResearchReport } from "@/lib/gemini"

export default function ReportGeneratorPage() {
  const [product, setProduct] = useState("")
  const [market, setMarket] = useState("India")
  const [businessModel, setBusinessModel] = useState("D2C")
  const [additionalContext, setAdditionalContext] = useState("")
  const [report, setReport] = useState<ProductResearchReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    if (!product.trim()) {
      setError("Product is required")
      return
    }
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const data = await generateProductResearchReport(product.trim(), market.trim(), businessModel.trim(), additionalContext.trim())
      setReport(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate report")
    } finally {
      setLoading(false)
    }
  }

  function handleDownload() {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${product.toLowerCase().replace(/\s+/g, "-")}-report.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto w-full">
      <Link
        href="/workspace/ai-tools/all"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to AI Tools
      </Link>

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
          <BarChart3 className="size-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Product Research Report</h1>
          <p className="text-sm text-muted-foreground">
            AI-generated D2C opportunity report — market, competitors, supplier, ROI, GTM plan
          </p>
        </div>
      </div>

      {!isGeminiConfigured() && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>
            Gemini API key not configured. Add <code className="px-1 py-0.5 bg-amber-100 rounded">NEXT_PUBLIC_GEMINI_API_KEY</code> to your environment.
          </span>
        </div>
      )}

      {/* Form */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-foreground">Product *</label>
            <input
              type="text"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. Baby walker, Smart water bottle, Pet shampoo"
              className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Target Market</label>
            <input
              type="text"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              placeholder="India"
              className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Business Model</label>
            <input
              type="text"
              value={businessModel}
              onChange={(e) => setBusinessModel(e.target.value)}
              placeholder="D2C / Wholesale / Marketplace"
              className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Additional Context (optional)</label>
          <textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="Any specific angle, budget constraints, or focus areas..."
            rows={3}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={loading || !product.trim()}
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <BarChart3 className="size-4" />}
            {loading ? "Researching…" : "Generate Report"}
          </button>
          {report && (
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 h-9 px-3 text-sm font-medium rounded-md border border-border hover:bg-muted transition-colors"
            >
              <Download className="size-4" />
              Download JSON
            </button>
          )}
        </div>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900 flex items-start gap-2">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {report && <ReportDisplay report={report} />}
    </div>
  )
}

function ReportDisplay({ report }: { report: ProductResearchReport }) {
  return (
    <div className="space-y-5">
      {/* Cover */}
      <section className="rounded-lg border border-border/80 bg-gradient-to-br from-indigo-50 to-slate-50 p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">{report.coverSubtitle}</p>
        <h2 className="text-3xl font-bold font-heading mt-1">{report.product}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{report.coverDescription}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {report.coverPills.map((pill, i) => (
            <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-full bg-white border border-indigo-200 text-indigo-800">
              {pill}
            </span>
          ))}
        </div>
      </section>

      {/* Product Intelligence + Demand Signals */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Product Intelligence">
          <KeyValueList items={report.productIntelligence} />
        </Section>
        <Section title="Demand Signals">
          <KeyValueList items={report.demandSignals} />
        </Section>
      </div>

      {/* Product Types */}
      {report.productTypes?.length > 0 && (
        <Section title="Product Types">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.productTypes.map((pt, i) => (
              <div key={i} className={`rounded-md border p-3 ${pt.recommended ? "border-emerald-300 bg-emerald-50/30" : "border-border bg-card"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{pt.name}</span>
                  {pt.recommended && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-600 text-white">RECOMMENDED</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pt.description}</p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">Share: <strong className="text-foreground">{pt.marketShare}</strong></span>
                  <span className="text-muted-foreground">Price: <strong className="text-foreground">{pt.priceRange}</strong></span>
                </div>
                <ul className="mt-2 text-xs text-muted-foreground space-y-0.5">
                  {pt.features?.map((f, j) => <li key={j}>• {f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Market */}
      <Section title="Market">
        <p className="text-base font-semibold">{report.marketHeadline}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {report.marketChips?.map((c, i) => (
            <span key={i} className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">{c}</span>
          ))}
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          {report.marketVerdict?.map((v, i) => (
            <li key={i} className="flex items-start gap-2"><CheckCircle2 className="size-4 text-emerald-600 mt-0.5 shrink-0" />{v}</li>
          ))}
        </ul>
      </Section>

      {/* Supplier + SKUs */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Supplier">
          <p className="text-base font-semibold">{report.supplierName}</p>
          <p className="text-xs text-muted-foreground">
            {report.supplierLocation} · {report.supplierYears} years · MOQ {report.supplierMOQ} · FOB {report.supplierFOBRange}
          </p>
          <p className="text-sm mt-2">{report.supplierAbout}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {report.supplierCertifications?.map((c, i) => (
              <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{c}</span>
            ))}
          </div>
        </Section>
        <Section title="SKUs">
          <div className="space-y-2">
            {report.skus?.map((sku, i) => (
              <div key={i} className={`rounded-md border p-2.5 ${sku.recommended ? "border-emerald-300 bg-emerald-50/30" : "border-border"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{sku.name}</span>
                  <span className="text-xs font-semibold tabular-nums">{sku.price}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{sku.code}</p>
                <ul className="mt-1 text-xs text-muted-foreground">
                  {sku.features?.map((f, j) => <li key={j}>• {f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Competition */}
      <Section title="Competition">
        <p className="text-base font-semibold">{report.competitionHeadline}</p>
        <div className="mt-3 space-y-1.5">
          {report.competitorData?.map((c, i) => {
            const max = Math.max(...report.competitorData.map((x) => x.price))
            const pct = (c.price / max) * 100
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs w-32 truncate">{c.name}</span>
                <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-medium tabular-nums w-20 text-right">{report.currencySymbol}{c.price.toLocaleString()}</span>
              </div>
            )
          })}
        </div>
        <p className="text-sm mt-3 text-muted-foreground">{report.competitionVerdict}</p>
      </Section>

      {/* ROI Pipeline */}
      <Section title="Unit Economics">
        <p className="text-base font-semibold mb-3">{report.financialsHeadline}</p>
        <div className="grid gap-3 sm:grid-cols-4">
          {report.roiPipeline?.map((p, i) => (
            <div key={i} className="rounded-md border border-border p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{p.label}</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">{p.value}</p>
              <p className="text-[11px] text-muted-foreground">{p.sub}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {report.costTable?.map((r, i) => (
                <tr key={i} className={`border-b last:border-0 ${r.bold ? "bg-indigo-50" : ""}`}>
                  <td className={`px-3 py-2 ${r.bold ? "font-semibold" : ""}`}>{r.label}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${r.bold ? "font-semibold" : ""}`}>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Scenarios */}
      {report.scenarios?.length > 0 && (
        <Section title="Scenarios">
          <div className="grid gap-3 sm:grid-cols-3">
            {report.scenarios.map((s, i) => (
              <div key={i} className={`rounded-md border p-3 ${s.accent ? "border-emerald-400 bg-emerald-50" : "border-border"}`}>
                <p className="text-sm font-semibold">{s.scenario}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.units}</p>
                <div className="mt-2 space-y-0.5 text-xs">
                  <div><span className="text-muted-foreground">Revenue:</span> <strong>{s.revenue}</strong></div>
                  <div><span className="text-muted-foreground">Profit:</span> <strong>{s.profit}</strong></div>
                  <div><span className="text-muted-foreground">ROI:</span> <strong>{s.roi}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* GTM */}
      {report.gtmPhases?.length > 0 && (
        <Section title="Go-to-Market Plan">
          <div className="grid gap-3 lg:grid-cols-3">
            {report.gtmPhases.map((phase, i) => (
              <div key={i} className="rounded-md border border-border p-3">
                <p className="text-sm font-semibold">{phase.title}</p>
                <p className="text-[11px] text-muted-foreground">{phase.timeline}</p>
                <ul className="mt-2 text-xs space-y-1">
                  {phase.steps?.map((s, j) => <li key={j} className="flex gap-1.5"><span className="text-muted-foreground">{j + 1}.</span>{s}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Yes Because / Only If */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Yes, because…" tone="emerald">
          <ul className="space-y-1.5 text-sm">
            {report.yesBecause?.map((y, i) => (
              <li key={i} className="flex items-start gap-2"><CheckCircle2 className="size-4 text-emerald-600 mt-0.5 shrink-0" />{y}</li>
            ))}
          </ul>
        </Section>
        <Section title="Only if…" tone="amber">
          <ul className="space-y-1.5 text-sm">
            {report.onlyIf?.map((o, i) => (
              <li key={i} className="flex items-start gap-2"><AlertCircle className="size-4 text-amber-600 mt-0.5 shrink-0" />{o}</li>
            ))}
          </ul>
        </Section>
      </div>

      {/* Safety */}
      <Section title="Safety & Compliance">
        <p className="text-base font-semibold">{report.safetyHeadline}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {report.safetyMarkets?.map((m, i) => (
            <div key={i} className={`rounded-md border p-2.5 ${m.isPrimary ? "border-indigo-300 bg-indigo-50" : "border-border"}`}>
              <p className="text-xs font-semibold">{m.market}</p>
              <p className="text-[11px] text-muted-foreground">{m.standard}</p>
              <p className="text-[11px] mt-1">{m.body}</p>
            </div>
          ))}
        </div>
        <ul className="mt-3 text-sm space-y-0.5">
          {report.safetyFeatures?.map((f, i) => <li key={i}>• {f}</li>)}
        </ul>
      </Section>

      {/* Team View / Quote */}
      <Section title="Team View">
        <blockquote className="text-lg font-heading font-bold uppercase tracking-tight text-indigo-900 border-l-4 border-indigo-500 pl-4 whitespace-pre-line">
          {report.teamViewQuote}
        </blockquote>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {report.teamViewPoints?.map((pt, i) => (
            <div key={i} className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold">{pt.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{pt.body}</p>
            </div>
          ))}
        </div>
        <p className="text-sm italic mt-3 text-muted-foreground">{report.teamViewRemember}</p>
      </Section>

      {/* Sources */}
      {report.sources?.length > 0 && (
        <Section title="Sources">
          <ol className="text-xs space-y-0.5 text-muted-foreground">
            {report.sources.map((s, i) => (
              <li key={i}>[{s[0]}] <strong>{s[1]}</strong> — {s[2]}</li>
            ))}
          </ol>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "emerald" | "amber" }) {
  const toneClass = tone === "emerald" ? "border-emerald-200 bg-emerald-50/40" : tone === "amber" ? "border-amber-200 bg-amber-50/40" : "border-border/80 bg-card"
  return (
    <section className={`rounded-lg border ${toneClass} shadow-sm p-5`}>
      <h3 className="text-[0.9375rem] font-semibold tracking-tight mb-3">{title}</h3>
      {children}
    </section>
  )
}

function KeyValueList({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="space-y-1.5 text-sm">
      {items?.map((item, i) => (
        <div key={i} className="flex items-baseline justify-between gap-3 border-b border-border/50 last:border-0 py-1">
          <dt className="text-xs text-muted-foreground shrink-0">{item.label}</dt>
          <dd className="text-sm font-medium text-right">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
