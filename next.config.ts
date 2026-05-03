
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "uploadthing.com" },
    ],
  turbopack: {},
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
  },
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
  ],
  webpack: (config, { webpack: wp }) => {
    // Prisma 7 generated client uses node: URI scheme; strip the prefix
    // so webpack can resolve them as standard Node.js built-ins
    config.plugins.push(
      new wp.NormalModuleReplacementPlugin(/^node:(.*)/, (resource: { request: string }) => {
        resource.request = resource.request.replace(/^node:/, "");
      })
    );
    return config;
  },
};

export default nextConfig;
