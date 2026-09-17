/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Required for src/instrumentation.ts to run at server startup.
    // Next.js 14 does not enable this by default.
    instrumentationHook: true,
  },
};

module.exports = nextConfig;