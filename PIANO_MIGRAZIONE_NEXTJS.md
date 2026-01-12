# 🚀 Piano Migrazione Next.js
## Step-by-Step per SaaS eFootball

**Data**: 2025-01-12  
**Target**: Migrazione completa da Vite a Next.js  
**Tempo stimato**: 3 giorni

---

## 📋 OVERVIEW

### **Obiettivo**:
Migrare da Vite + React a Next.js 14 (App Router) mantenendo tutte le funzionalità esistenti.

### **Vantaggi**:
- ✅ SEO per landing page pubblica
- ✅ Performance ottimizzate
- ✅ Image optimization automatica
- ✅ API routes per logica crediti
- ✅ Professional appearance

---

## 🗓️ TIMELINE

### **Giorno 1: Setup e Configurazione**
- Setup Next.js
- Configurazione Supabase
- Migrazione variabili ambiente
- Setup routing base

### **Giorno 2: Migrazione Componenti**
- Migrazione pages
- Migrazione components
- Migrazione contexts
- Migrazione services

### **Giorno 3: Testing e Ottimizzazioni**
- Test completo funzionalità
- Fix bug
- Ottimizzazioni performance
- Deploy

---

## 📝 STEP-BY-STEP

### **STEP 1: Backup e Preparazione**

```bash
# 1. Crea branch backup
git checkout -b backup-vite-version
git push origin backup-vite-version

# 2. Torna a master
git checkout master

# 3. Crea branch migrazione
git checkout -b migrate-to-nextjs
```

---

### **STEP 2: Install Next.js**

```bash
# Installa Next.js (mantieni file esistenti)
npm install next@latest react@latest react-dom@latest

# Installa TypeScript (opzionale ma consigliato)
npm install -D typescript @types/react @types/node

# Rimuovi Vite (dopo migrazione completa)
# npm uninstall vite @vitejs/plugin-react
```

---

### **STEP 3: Configurazione Next.js**

**Crea `next.config.js`**:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['zliuuorrwdetylollrua.supabase.co'],
    formats: ['image/avif', 'image/webp'],
  },
  // Mantieni compatibilità con Supabase
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
}

module.exports = nextConfig
```

**Crea `tsconfig.json`** (se usi TypeScript):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

### **STEP 4: Struttura Directory Next.js**

**Da**:
```
src/
├── pages/
├── components/
├── contexts/
├── services/
└── lib/
```

**A**:
```
app/                    # Next.js App Router
├── (auth)/             # Route group per auth
│   ├── login/
│   └── signup/
├── (dashboard)/        # Route group per dashboard
│   ├── dashboard/
│   ├── rosa/
│   ├── sinergie/
│   └── ...
├── layout.tsx          # Root layout
├── page.tsx            # Landing page (/)
└── globals.css

components/             # Componenti condivisi
├── dashboard/
├── rosa/
└── ...

lib/                    # Utilities
├── supabase.ts
└── ...

contexts/               # React Contexts (Client Components)
└── RosaContext.tsx
```

---

### **STEP 5: Migra Supabase Client**

**Crea `lib/supabase.ts`**:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Per Server Components** (se necessario):
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component
          }
        },
      },
    }
  )
}
```

---

### **STEP 6: Migra Routing**

**Esempio: Landing Page**

**Da `src/pages/HomePage.jsx`**:
```jsx
export default function HomePage() {
  return <div>Home</div>
}
```

**A `app/page.tsx`**:
```tsx
export default function HomePage() {
  return <div>Home</div>
}
```

**Esempio: Dashboard**

**Da `src/pages/DashboardPage.jsx`**:
```jsx
export default function DashboardPage() {
  return <DashboardLayout>...</DashboardLayout>
}
```

**A `app/(dashboard)/dashboard/page.tsx`**:
```tsx
import DashboardLayout from '@/components/dashboard/DashboardLayout'

export default function DashboardPage() {
  return <DashboardLayout>...</DashboardLayout>
}
```

---

### **STEP 7: Migra Componenti**

**Regola**: 
- **Server Components** (default): Per dati statici, SEO
- **Client Components** (`'use client'`): Per interattività, hooks, contexts

**Esempio: RosaContext**

**Crea `contexts/RosaContext.tsx`**:
```tsx
'use client' // IMPORTANTE: Contexts devono essere Client Components

import { createContext, useContext, ... } from 'react'
// ... resto del codice identico
```

**Esempio: ScreenshotUpload**

**Crea `components/rosa/ScreenshotUpload.tsx`**:
```tsx
'use client' // IMPORTANTE: Componenti interattivi = Client Components

import { useState } from 'react'
// ... resto del codice identico
```

---

### **STEP 8: Migra Layout**

**Crea `app/layout.tsx`**:
```tsx
import type { Metadata } from 'next'
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
      <body>{children}</body>
    </html>
  )
}
```

**Crea `app/(dashboard)/layout.tsx`** (per dashboard condivisa):
```tsx
import DashboardLayout from '@/components/dashboard/DashboardLayout'

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
```

---

### **STEP 9: Aggiorna package.json**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.39.0",
    "lucide-react": "^0.303.0"
  }
}
```

---

### **STEP 10: Aggiorna Vercel Config**

**Aggiorna `vercel.json`**:
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

**Oppure rimuovi** (Vercel auto-rileva Next.js)

---

### **STEP 11: Variabili Ambiente**

**Vercel Environment Variables** (già configurate):
- ✅ `NEXT_PUBLIC_SUPABASE_URL` (già presente!)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (già presente!)
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `GOOGLE_VISION_CREDENTIALS`
- ✅ `GOOGLE_VISION_PROJECT_ID`
- ✅ `GOOGLE_VISION_API_ENABLED`
- ✅ `GOOGLE_VISION_MAX_IMAGE_SIZE_MB`

**Nota**: Le variabili `NEXT_PUBLIC_*` sono già configurate! ✅

---

### **STEP 12: Testing**

```bash
# 1. Test locale
npm run dev

# 2. Test build
npm run build

# 3. Test produzione
npm run start
```

**Checklist test**:
- [ ] Landing page carica
- [ ] Routing funziona
- [ ] Dashboard carica
- [ ] Rosa page funziona
- [ ] Screenshot upload funziona
- [ ] Supabase auth funziona
- [ ] Context funziona
- [ ] Performance OK

---

### **STEP 13: Deploy**

```bash
# 1. Commit migrazione
git add .
git commit -m "feat: migrazione a Next.js 14"

# 2. Push
git push origin migrate-to-nextjs

# 3. Merge in master (dopo test)
git checkout master
git merge migrate-to-nextjs
git push origin master
```

---

## 🐛 TROUBLESHOOTING

### **Problema: "use client" necessario**
**Soluzione**: Aggiungi `'use client'` in cima ai file che usano:
- useState, useEffect, useContext
- Event handlers (onClick, onChange)
- Browser APIs (localStorage, window)

### **Problema: Supabase non funziona**
**Soluzione**: 
- Verifica variabili `NEXT_PUBLIC_*`
- Usa `createClient` per Client Components
- Usa `createServerClient` per Server Components

### **Problema: Routing non funziona**
**Soluzione**: 
- Verifica struttura `app/` directory
- Usa `Link` da `next/link` invece di `react-router-dom`
- Usa `useRouter` da `next/navigation` per navigation

---

## ✅ CHECKLIST FINALE

- [ ] Next.js installato
- [ ] Configurazione completata
- [ ] Routing migrato
- [ ] Componenti migrati
- [ ] Contexts migrati
- [ ] Services migrati
- [ ] Supabase funziona
- [ ] Test completati
- [ ] Build funziona
- [ ] Deploy su Vercel
- [ ] Performance OK
- [ ] SEO verificato

---

**Status**: 🟢 **PIANO COMPLETO - PRONTO PER MIGRAZIONE**
