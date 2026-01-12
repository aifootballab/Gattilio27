/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zliuuorrwdetylollrua.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Escludi cartella src/ dal build (contiene file Vite legacy con import.meta.env)
  experimental: {
    outputFileTracingExcludes: {
      '*': ['./src/**/*'],
    },
  },
  webpack: (config) => {
    // Ignora file in src/ durante il bundle
    config.resolve.alias = {
      ...config.resolve.alias,
    }
    // Escludi src/ dal resolve
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      'node_modules',
    ]
    return config
  },
}

module.exports = nextConfig
