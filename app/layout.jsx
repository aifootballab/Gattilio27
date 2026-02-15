import './globals.css'
import LanguageProviderWrapper from '@/components/LanguageProviderWrapper'
import AssistantChat from '@/components/AssistantChat'
import AppHeader from '@/components/AppHeader'

// Layout unico: usare solo questo file. Non creare layout.tsx (conflitti / layout sbagliato = dashboard non carica).
// Title/description: default IT; client can set document.title by lang via LanguageProviderWrapper
export const metadata = {
  title: 'From Zero to Hero - eFootball AI Coach',
  description: 'Coach AI per eFootball: rosa, partite, analisi e consigli tattici personalizzati.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <LanguageProviderWrapper>
          <AppHeader />
          {children}
          <AssistantChat />
        </LanguageProviderWrapper>
      </body>
    </html>
  )
}
