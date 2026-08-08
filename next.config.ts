import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false }
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
  turbopack: {
    resolveAlias: {
      net: './lib/empty.js',
      tls: './lib/empty.js',
      fs: './lib/empty.js',
      lokijs: './lib/empty.js',
      encoding: './lib/empty.js',
      'pino-pretty': './lib/empty.js',
      '@x402/core/client': './lib/empty.js',
      '@x402/evm/exact/client': './lib/empty.js',
      '@x402/evm/upto/client': './lib/empty.js',
      '@x402/svm/exact/client': './lib/empty.js',
      '@x402/evm': './lib/empty.js',
      '@x402/core': './lib/empty.js',
      '@x402/svm': './lib/empty.js',
    },
  },
}

export default nextConfig
