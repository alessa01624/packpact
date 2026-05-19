import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PackPact — La vacanza di gruppo, senza litigi',
  description: 'Organizza la vacanza di gruppo con voti anonimi, proposte e decisione condivisa.',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'PackPact',
    description: 'La vacanza di gruppo, senza litigi',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#09090b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}
