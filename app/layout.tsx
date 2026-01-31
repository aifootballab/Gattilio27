import type { Metadata } from 'next'
import './globals.css'
import LanguageProviderWrapper from '@/components/LanguageProviderWrapper'
import AssistantChat from '@/components/AssistantChat'
import CreditsBar from '@/components/CreditsBar'
import GuideTour from '@/components/GuideTour'

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
        <LanguageProviderWrapper>
          {/* Custom Background Layer - QUI PUOI INSERIRE IL TUO SFONDO */}
          <div className="custom-background" />
          {/* Barra crediti: sempre montata per ascoltare credits-consumed e aggiornarsi subito dopo ogni API */}
          <CreditsBar />
          {children}
          {/* Tour contestuale (Mostrami come) - coerente UX, responsive, bilingue */}
          <GuideTour />
          {/* Assistant Chat Widget - Sempre disponibile */}
          <AssistantChat />
        </LanguageProviderWrapper>
      </body>
    </html>
  )
}
