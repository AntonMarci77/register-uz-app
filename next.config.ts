import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // V produkcii zachytávame chyby cez CI/CD
    ignoreBuildErrors: false,
  },
  // Povolenie externých obrázkov z registeruz.sk ak by boli potrebné
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.registeruz.sk",
      },
    ],
  },
  // Experimentálne: serverActions pre sync
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
