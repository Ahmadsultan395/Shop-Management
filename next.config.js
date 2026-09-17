/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" produces a self-contained server (server.js + minimal
  // node_modules) that Electron bundles. This is what lets the packaged
  // app run without the customer installing Node.js.
  output: "standalone",
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
