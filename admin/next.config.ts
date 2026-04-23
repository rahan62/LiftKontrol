import { config } from "dotenv";
import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const adminDir = path.dirname(fileURLToPath(import.meta.url));

// Monorepo: load env from repo root first, then admin-local overrides.
config({ path: path.join(adminDir, "..", ".env.local") });
config({ path: path.join(adminDir, ".env.local"), override: true });

const nextConfig: NextConfig = {
  // Hoisted `next` lives in the monorepo root `node_modules`.
  turbopack: {
    root: path.join(adminDir, ".."),
  },
};

export default nextConfig;
