/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [
      'upload.wikimedia.org',
      'github.githubassets.com',
      'dash.gallery'
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*', // This now points to internal Next.js API routes
      },
    ];
  },
};

module.exports = nextConfig;