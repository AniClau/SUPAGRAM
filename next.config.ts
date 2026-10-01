import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Necesario si un antivirus/proxy intercepta HTTPS y next/font no puede bajar las fuentes de Google
    turbopackUseSystemTlsCerts: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
