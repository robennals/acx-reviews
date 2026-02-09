/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable image optimization for static export
  images: {
    unoptimized: true,
    domains: [],
  },
};

export default nextConfig;
