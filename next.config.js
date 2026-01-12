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
  // Questa cartella è legacy da Vite e non deve essere processata da Next.js
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        './src/**/*',
        './src/**',
        'src/**/*',
        'src/**',
      ],
    },
  },
  webpack: (config, { webpack, isServer }) => {
    // Ignora completamente i file in src/ che usano import.meta.env (Vite)
    // Questi file sono legacy e non devono essere processati
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/src\//,
        contextRegExp: /src/,
      })
    )
    
    // Ignora anche import.meta che non esiste in Node.js/Next.js
    config.plugins.push(
      new webpack.IgnorePlugin({
        checkResource(resource) {
          if (resource && typeof resource === 'string') {
            // Ignora qualsiasi file che contiene import.meta
            if (resource.includes('import.meta') || resource.includes('src/lib/supabase')) {
              return true
            }
          }
          return false
        },
      })
    )
    
    return config
  },
}

module.exports = nextConfig
