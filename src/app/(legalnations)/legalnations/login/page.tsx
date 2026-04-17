"use client"

import { Shield } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(0_0%_99%)] px-4">
      <div className="w-full max-w-sm">
        {/* Login card */}
        <div className="bg-white rounded-xl border border-[hsl(40_10%_88%)] p-8 shadow-sm">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <div className="size-9 rounded-lg bg-[hsl(160_45%_22%)] flex items-center justify-center">
              <span className="text-white text-sm font-bold">LN</span>
            </div>
            <span className="text-lg font-bold text-[hsl(200_15%_12%)]">
              LegalNations
            </span>
          </div>

          <h1 className="text-center text-base font-semibold text-[hsl(200_15%_12%)] mb-6">
            Sign in to your account
          </h1>

          {/* Form (visual only) */}
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(200_15%_12%)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-md border border-[hsl(40_10%_82%)] bg-white px-3 py-2 text-sm text-[hsl(200_15%_12%)] placeholder:text-[hsl(200_8%_70%)] outline-none focus:border-[hsl(160_45%_22%)] focus:ring-1 focus:ring-[hsl(160_45%_22%)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(200_15%_12%)] mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full rounded-md border border-[hsl(40_10%_82%)] bg-white px-3 py-2 text-sm text-[hsl(200_15%_12%)] placeholder:text-[hsl(200_8%_70%)] outline-none focus:border-[hsl(160_45%_22%)] focus:ring-1 focus:ring-[hsl(160_45%_22%)] transition-colors"
              />
            </div>

            <button
              type="button"
              className="w-full rounded-md bg-[hsl(160_45%_22%)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[hsl(160_45%_18%)] transition-colors"
            >
              Sign in
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[hsl(40_10%_88%)]" />
            <span className="text-xs text-[hsl(200_8%_62%)]">or</span>
            <div className="flex-1 h-px bg-[hsl(40_10%_88%)]" />
          </div>

          {/* Magic link */}
          <button
            type="button"
            className="w-full rounded-md border border-[hsl(40_10%_82%)] bg-white px-4 py-2.5 text-sm font-semibold text-[hsl(160_45%_22%)] hover:bg-[hsl(40_10%_97%)] transition-colors"
          >
            Sign in with magic link
          </button>

          {/* Footer */}
          <p className="text-center text-sm text-[hsl(200_8%_46%)] mt-5">
            Don&apos;t have an account?{" "}
            <a
              href="https://wa.me/919306500349"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[hsl(160_45%_22%)] font-medium hover:underline"
            >
              Contact us
            </a>
          </p>
        </div>

        {/* Protected badge */}
        <div className="flex items-center justify-center gap-1.5 mt-5">
          <Shield className="size-3.5 text-[hsl(200_8%_70%)]" />
          <span className="text-xs text-[hsl(200_8%_62%)]">
            Protected by LegalNations
          </span>
        </div>
      </div>
    </div>
  )
}
