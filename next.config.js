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
  webpack: (config, { webpack, isServer }) => {
    // Ignora completamente i file in src/ che usano import.meta.env (Vite)
    if (!isServer) {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^\.\/src\//,
        })
      )
    }
    // Escludi src/ dal resolve
    config.resolve.alias = {
      ...config.resolve.alias,
    }
    return config
  },
}

module.exports = nextConfig
