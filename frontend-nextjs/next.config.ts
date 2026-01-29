import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Disable Turbopack and use webpack for builds (better path alias support)
  experimental: {
    turbo: {
      enabled: false
    }
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
