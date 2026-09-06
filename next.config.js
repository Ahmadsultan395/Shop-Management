/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" produces a self-contained server (server.js + minimal
  // node_modules) that Tauri bundles as a sidecar binary. This is what lets
  // the packaged Windows app run without the customer installing Node.js.
  output: "standalone",
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // better-sqlite3 is a native module; keep it external to the server
  // bundle so its compiled .node binary is used as-is instead of being
  // processed by webpack.
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
};

module.exports = nextConfig;
