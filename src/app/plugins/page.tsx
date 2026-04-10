import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  PLUGIN_CATEGORIES,
  countInstalled,
  countPending,
} from "@/lib/plugins-catalog"
import { PluginsCatalogue } from "@/components/home/plugins-catalogue"

export const metadata = {
  title: "Plugins — TeamSync AI",
  description:
    "Universal modules that can be installed into any space. Each space stays isolated; install only what it needs.",
}

/**
 * Standalone /plugins route — a full-page view of the plugins catalogue.
 * Shares the <PluginsCatalogue> presentation component with the inline
 * view on the homepage so both render from one source of truth.
 */
export default function PluginsPage() {
  const totalInstalled = countInstalled()
  const totalPending = countPending()

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-[1280px] mx-auto px-6 py-10 md:py-14">
        {/* Back to home */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>

        <PluginsCatalogue
          categories={PLUGIN_CATEGORIES}
          totalInstalled={totalInstalled}
          totalPending={totalPending}
          tone="light"
        />
      </div>
    </main>
  )
}
