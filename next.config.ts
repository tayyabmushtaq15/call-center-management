import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
};

export default nextConfig;
