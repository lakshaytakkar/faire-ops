import type { Metadata } from "next"
import localFont from "next/font/local"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const plusJakarta = localFont({
  src: [
    { path: "./fonts/PlusJakartaSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/PlusJakartaSans-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/PlusJakartaSans-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/PlusJakartaSans-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-plus-jakarta",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
})

export const metadata: Metadata = {
  title: "NexusOS — Business Suite",
  description: "One operating system for every part of your business.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  )
}
