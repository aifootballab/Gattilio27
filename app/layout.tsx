import type { Metadata } from 'next'
import { RosaProvider } from '@/contexts/RosaContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'eFootball AI Coach',
  description: 'Coaching professionale per eFootball',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body>
        <RosaProvider>
          {children}
        </RosaProvider>
      </body>
    </html>
  )
}
