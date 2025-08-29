import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // パフォーマンス最適化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 3600,
  },
  // 開発時のパフォーマンス向上
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
