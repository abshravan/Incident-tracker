import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `NEXT_OUTPUT=standalone` produces a self-contained server bundle for the
  // Docker image. Left unset for Vercel/Netlify and plain `next start`.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  agentRules: false,
};

export default nextConfig;
