import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',   // ← This is the key

  // Optional but recommended for Azure
  images: {
    unoptimized: true,      // Azure doesn't support Next.js image optimization easily
  },
};

export default nextConfig;
