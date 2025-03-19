/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'upload.wikimedia.org',
      'github.githubassets.com',
      'dash.gallery'
    ],
  },
};

module.exports = nextConfig;
