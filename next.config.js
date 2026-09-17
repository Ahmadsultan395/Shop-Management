/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // sql.js is a CJS/ESM hybrid package that breaks when webpack bundles it.
  // Keep it external so it's require()'d at runtime from node_modules instead.
  experimental: {
    serverComponentsExternalPackages: ["sql.js"],
  },
};

module.exports = nextConfig;