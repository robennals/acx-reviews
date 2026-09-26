/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['undici'],
  async headers() {
    return [{ source: '/preview', headers: [
      { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ] }];
  },
  // Disable image optimization for static export
  images: {
    unoptimized: true,
    domains: [],
  },
};

export default nextConfig;
