import type { NextConfig } from "next";

const nextConfig: NextConfig = {
        typescript: {
                  ignoreBuildErrors: true,
        },
        eslint: {
                  ignoreDuringBuilds: true,
        },
        images: {
                  remotePatterns: [
                        { protocol: "https", hostname: "utfs.io" },
                        { protocol: "https", hostname: "uploadthing.com" },
                            ],
        },
        serverExternalPackages: [
                  "@prisma/client",
                  "@prisma/adapter-pg",
                  "pg",
                  "bcryptjs",
                ],
        webpack: (config) => {
                  return config;
        },
};

export default nextConfig;
