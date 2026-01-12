# 🚀 Migrazione Next.js - Istruzioni Finali
## Cosa fare ora

**Data**: 2025-01-12  
**Status**: 🟡 **MIGRAZIONE BASE COMPLETATA - FIX RIMANENTI**

---

## ✅ FATTO

- ✅ Next.js 14 installato e configurato
- ✅ Struttura `app/` creata con routes
- ✅ `lib/supabase.ts` migrato (usa `NEXT_PUBLIC_*`)
- ✅ `contexts/RosaContext.tsx` migrato (Client Component)
- ✅ Routes base create
- ✅ Servizi aggiornati per usare `@/lib/supabase`
- ✅ `vercel.json` aggiornato per Next.js

---

## ⚠️ DA FARE MANUALMENTE

### **1. Installare Dipendenze**

```bash
npm install
```

Questo installerà Next.js e tutte le dipendenze necessarie.

---

### **2. Creare File `.env.local` (Sviluppo Locale)**

Crea file `.env.local` nella root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://zliuuorrwdetylollrua.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr
```

**Nota**: Le variabili sono già configurate in Vercel, questo è solo per sviluppo locale.

---

### **3. Fix Componenti con react-router-dom**

Alcuni componenti devono ancora essere aggiornati:

**File da fixare**:
- `components/dashboard/MainHeader.jsx` - Sostituire `Link` da `react-router-dom` con `next/link`
- `components/pages/NotFoundPage.jsx` - Sostituire `Link` da `react-router-dom` con `next/link`

**Pattern da seguire**:
```jsx
// DA (Vite/React Router):
import { Link } from 'react-router-dom'
<Link to="/path">Text</Link>

// A (Next.js):
import Link from 'next/link'
<Link href="/path">Text</Link>
```

---

### **4. Fix Import Paths**

Alcuni componenti usano ancora `../` invece di `@/`:

**Pattern da seguire**:
```jsx
// DA:
import { useRosa } from '../../contexts/RosaContext'
import Component from '../components/Component'

// A:
import { useRosa } from '@/contexts/RosaContext'
import Component from '@/components/Component'
```

---

### **5. Aggiungere 'use client' ai Componenti Interattivi**

Tutti i componenti che usano:
- `useState`, `useEffect`, `useContext`
- Event handlers (`onClick`, `onChange`)
- Browser APIs (`localStorage`, `window`)

Devono avere `'use client'` in cima al file.

**Esempio**:
```jsx
'use client'

import React, { useState } from 'react'
// ... resto del codice
```

---

## 🧪 TEST

### **1. Test Locale**

```bash
# Installa dipendenze
npm install

# Avvia dev server
npm run dev
```

Dovrebbe aprire `http://localhost:3000`

### **2. Test Build**

```bash
npm run build
```

Dovrebbe compilare senza errori.

---

## 🐛 PROBLEMI NOTI

### **1. SidebarNavigation**
- ✅ Fixato: usa `usePathname` invece di `useLocation`
- ✅ Fixato: usa `Link` da `next/link`

### **2. HomePage**
- ✅ Fixato: usa `Link` da `next/link` con `href` invece di `to`

### **3. Altri Componenti**
- ⚠️ Da fixare: `MainHeader`, `NotFoundPage` e altri che usano `react-router-dom`

---

## 📋 CHECKLIST FINALE

- [ ] `npm install` eseguito
- [ ] `.env.local` creato (opzionale, solo per locale)
- [ ] Tutti i componenti aggiornati per usare `next/link`
- [ ] Tutti gli import aggiornati per usare `@/`
- [ ] `'use client'` aggiunto ai componenti interattivi
- [ ] `npm run dev` funziona
- [ ] `npm run build` funziona
- [ ] Test su Vercel

---

## 🚀 DEPLOY VERCEL

Dopo aver fixato tutto:

1. **Commit e Push**:
   ```bash
   git add -A
   git commit -m "fix: completamento migrazione Next.js"
   git push origin master
   ```

2. **Vercel**:
   - Vercel rileverà automaticamente Next.js
   - Le variabili `NEXT_PUBLIC_*` sono già configurate
   - Deploy automatico

---

**Status**: 🟡 **MIGRAZIONE BASE COMPLETA - FIX RIMANENTI**
