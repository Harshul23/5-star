import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization configuration
  images: {
    // Enable image optimization
    unoptimized: false,
    // Cache optimized images for 60 seconds, stale for 1 year
    minimumCacheTTL: 60,
    // Allow images from common image hosting domains
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    // Image sizes for srcset
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Output format preference
    formats: ["image/avif", "image/webp"],
  },
  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },
  // Compiler options for production optimization
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
