import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
