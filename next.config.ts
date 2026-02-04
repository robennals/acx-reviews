import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable image optimization for static export
  images: {
    unoptimized: true,
    domains: [],
  },
};

export default nextConfig;
