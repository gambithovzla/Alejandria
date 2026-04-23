import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Manrope } from 'next/font/google'

import { PwaRegister } from '@/components/system/pwa-register'
import './globals.css'

const displayFont = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
})

const uiFont = Manrope({
  subsets: ['latin'],
  variable: '--font-ui',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Alejandria',
  description: 'Estudio editorial asistido por IA con mesa de trabajo, lector aprobado y modo instalable.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Alejandria',
  },
}

export const viewport: Viewport = {
  themeColor: '#7e5d37',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${displayFont.variable} ${uiFont.variable}`}>
      <body className="font-[family-name:var(--font-ui)] antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}
