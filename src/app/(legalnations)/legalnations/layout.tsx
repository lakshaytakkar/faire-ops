import { Toaster } from "sonner"

export const metadata = {
  title: "LegalNations — Client Portal",
  description: "Track your LLC formation, tax filings, and compliance status.",
}

export default function LegalNationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[hsl(0_0%_99%)] text-[hsl(200_15%_12%)]">
      {children}
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  )
}
