import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.faire.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  compress: true,
  poweredByHeader: false,
  devIndicators: false,
};

export default nextConfig;
