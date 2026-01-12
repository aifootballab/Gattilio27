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
  webpack: (config, { webpack }) => {
    // Ignora completamente i file in src/ che usano import.meta.env (Vite)
    config.plugins.push(
      new webpack.IgnorePlugin({
        checkResource(resource, context) {
          // Ignora tutti i file in src/ directory
          if (context && context.includes('src')) {
            return true
          }
          // Ignora import.meta.env
          if (resource && resource.includes('import.meta')) {
            return true
          }
          return false
        },
      })
    )
    return config
  },
}

module.exports = nextConfig
