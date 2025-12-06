import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly set the project root to avoid workspace detection issues
  experimental: {
    // This helps Next.js understand the project structure
  },
};

export default nextConfig;
