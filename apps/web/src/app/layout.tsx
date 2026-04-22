import type { Metadata } from 'next'
import { Cormorant_Garamond, Manrope } from 'next/font/google'

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
  title: 'NovelEngine',
  description: 'Estudio editorial asistido por IA para novelas largas.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${displayFont.variable} ${uiFont.variable}`}>
      <body className="font-[family-name:var(--font-ui)] antialiased">{children}</body>
    </html>
  )
}
