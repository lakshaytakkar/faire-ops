import { LnTopbar } from "@/components/legalnations/ln-topbar"
import { MessageCircle, Mail, ChevronDown } from "lucide-react"

const FAQ_ITEMS = [
  {
    q: "How long does LLC formation take?",
    a: "Typically 3-7 business days for Wyoming, 7-14 for Delaware.",
  },
  {
    q: "What documents do I need to provide?",
    a: "Government-issued ID, proof of address, and a completed application form.",
  },
  {
    q: "How do I get my EIN?",
    a: "We file Form SS-4 with the IRS on your behalf. Processing takes 4-8 weeks for international applicants.",
  },
  {
    q: "What is included in my plan?",
    a: "Visit our pricing page or contact your dedicated manager for plan details.",
  },
  {
    q: "How can I make a payment?",
    a: "We accept UPI, bank transfer, and card payments. Contact your account manager.",
  },
  {
    q: "How do I upload documents?",
    a: "Go to the Documents section and use the upload zone, or email them to your manager.",
  },
  {
    q: "What happens after my LLC is delivered?",
    a: "We proceed with EIN filing, bank account setup, and other steps per your plan.",
  },
]

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[hsl(0_0%_99%)]">
      <LnTopbar />

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-[hsl(200_15%_12%)]">
            Help &amp; Support
          </h1>
          <p className="text-sm text-[hsl(200_8%_46%)] mt-1">
            Get assistance with your account
          </p>
        </div>

        {/* Contact card — emerald gradient hero */}
        <div className="rounded-lg bg-gradient-to-br from-[hsl(160_45%_22%)] to-[hsl(160_40%_16%)] p-6 md:p-8 text-white">
          <h2 className="text-lg font-bold mb-1">Need help with your LLC?</h2>
          <p className="text-sm text-white/80 mb-5">
            Our legal team is available Mon-Sat, 10am-7pm IST
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://wa.me/919306500349"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[hsl(42_80%_55%)] text-[hsl(200_15%_12%)] text-sm font-semibold hover:bg-[hsl(42_80%_50%)] transition-colors"
            >
              <MessageCircle className="size-4" />
              WhatsApp Us
            </a>
            <a
              href="mailto:support@legalnations.com"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-white text-[hsl(160_45%_22%)] text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              <Mail className="size-4" />
              Email Support
            </a>
          </div>
        </div>

        {/* FAQ section */}
        <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-5">
          <h2 className="text-[0.9375rem] font-semibold tracking-tight text-[hsl(200_15%_12%)] mb-4">
            Frequently Asked Questions
          </h2>
          <div className="divide-y divide-[hsl(40_10%_92%)]">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-2">
                  <ChevronDown className="size-4 mt-0.5 text-[hsl(160_45%_22%)] shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[hsl(200_15%_12%)]">
                      {item.q}
                    </p>
                    <p className="text-sm text-[hsl(200_8%_46%)] mt-1">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
