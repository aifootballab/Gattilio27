import type { Metadata } from 'next'
import './globals.css'
import LanguageProviderWrapper from '@/components/LanguageProviderWrapper'
import AssistantChat from '@/components/AssistantChat'
import CreditsBar from '@/components/CreditsBar'
import GuideTour from '@/components/GuideTour'
import BackgroundLoader from '@/components/BackgroundLoader'

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
          {/* Custom Background Layer - scelta utente da Profilo (BackgroundLoader applica background_key) */}
          <div className="custom-background" />
          <BackgroundLoader />
          {/* Barra utility in-flow (scrolla con la pagina): Crediti AI + Mostrami come - stile coerente con altri btn */}
          <header className="top-utility-bar" aria-label="Crediti e guida">
            <CreditsBar />
            <GuideTour />
          </header>
          {children}
          {/* Assistant Chat Widget - Solo consigli tattici (no supporto uso app) */}
          <AssistantChat />
        </LanguageProviderWrapper>
      </body>
    </html>
  )
}
