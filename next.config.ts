import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.faire.com" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "d3v0px0pttie1i.cloudfront.net" },
    ],
  },
  compress: true,
  poweredByHeader: false,
  devIndicators: false,
  experimental: {
    serverActions: {
      // Voice notes can be up to ~15 MB (the VoiceRecorder component
      // enforces that ceiling too). Default is 1 MB.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
