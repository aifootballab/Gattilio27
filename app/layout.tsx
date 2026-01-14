import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gattilio27 - Rosa (Local)',
  description: 'Test locale: drop screenshot → estrazione dati → inserimento rosa',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body>
        {children}
      </body>
    </html>
  )
}
