import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gattilio27 - Rosa (Production)',
  description: 'Carica screenshot giocatori → estrazione dati → salvataggio in Supabase',
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
