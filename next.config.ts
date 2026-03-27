import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination:
          "https://financial-intelligence-processing-system.onrender.com/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
