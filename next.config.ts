import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This tells Next.js not to bundle pdf-parse, fixing the Turbopack build error!
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;