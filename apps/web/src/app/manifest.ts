import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Alejandria',
    short_name: 'Alejandria',
    description: 'Mesa editorial asistida por IA con modo libro y lectura movil instalable.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f0e2',
    theme_color: '#7e5d37',
    orientation: 'portrait',
    icons: [
      {
        src: '/reader-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/reader-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
