import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // Use unoptimized for external images (user-uploaded content)
    // This avoids security risks from allowing arbitrary hostnames
    // while still enabling next/image for local images
    unoptimized: true,
  },
};

export default nextConfig;
