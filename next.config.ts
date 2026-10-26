import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // npm run dev:local builds into its own folder so it can run next to a normal dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
};

export default nextConfig;
