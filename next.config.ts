import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow optimization for uploaded images served via API
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/api/uploads/**",
      },
      {
        protocol: "https",
        hostname: "**", // Allow any HTTPS domain for production deployments
        pathname: "/api/uploads/**",
      },
    ],
    // Disable image optimization for uploaded images to reduce complexity
    unoptimized: false,
  },
  experimental: {
    // Ensure API routes work properly in production
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
