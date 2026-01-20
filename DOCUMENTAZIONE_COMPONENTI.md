# 🧩 Documentazione Componenti - eFootball AI Coach

**Data Aggiornamento**: Gennaio 2025  
**Versione**: 1.2.0

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [components/LanguageSwitch.jsx](#componentslanguageswitchjsx)
3. [components/LanguageProviderWrapper.jsx](#componentslanguageproviderwrapperjsx)

---

## 🎯 Panoramica

I componenti in `components/` sono componenti React riutilizzabili per funzionalità comuni:
- **LanguageSwitch**: Selettore lingua IT/EN
- **LanguageProviderWrapper**: Wrapper per provider i18n

---

## 🌐 components/LanguageSwitch.jsx

**Scopo**: Componente per cambio lingua IT/EN

### Props

Nessuna prop (usa context i18n)

### Comportamento

- Mostra lingua corrente (IT o EN)
- Click alterna tra IT e EN
- Salva preferenza in localStorage
- Stile neon coerente con design system

### Design

- Icona Globe (lucide-react)
- Badge con lingua corrente (IT/EN)
- Hover effect con glow
- Stile inline (no CSS esterno)

### Esempio Uso

```jsx
import LanguageSwitch from '@/components/LanguageSwitch'

function Header() {
  return (
    <header>
      <LanguageSwitch />
    </header>
  )
}
```

### Note

- ✅ Usa `useTranslation()` hook
- ✅ Cambio lingua immediato (reload automatico se necessario)
- ✅ Persistenza in localStorage

---

## 🔄 components/LanguageProviderWrapper.jsx

**Scopo**: Wrapper per `LanguageProvider` in layout Next.js

### Props

- `children` (ReactNode): Componenti figli da wrappare

### Comportamento

- Wrappa children con `LanguageProvider`
- Necessario per usare `useTranslation()` in tutta l'app
- Usato in `app/layout.tsx`

### Esempio Uso

```jsx
// app/layout.tsx
import LanguageProviderWrapper from '@/components/LanguageProviderWrapper'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <LanguageProviderWrapper>
          {children}
        </LanguageProviderWrapper>
      </body>
    </html>
  )
}
```

### Note

- ✅ Client component ('use client')
- ✅ Fornisce context i18n a tutta l'app
- ✅ Necessario per funzionamento `useTranslation()`

---

## 📝 Note Implementazione

### Pattern Comuni

1. **Client Components**: Tutti i componenti sono 'use client' (interattività)
2. **Context Usage**: LanguageSwitch usa context, non props
3. **Styling**: Stile inline per coerenza design system

### Best Practices

- ✅ Usare LanguageProviderWrapper in layout root
- ✅ LanguageSwitch posizionabile ovunque
- ✅ Mantenere stile coerente con design system

---

**Fine Documentazione Componenti**
