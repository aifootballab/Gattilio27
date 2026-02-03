# 📚 Documentazione Completa - Guida Interattiva (Assistant Chat)

**Data:** 3 Febbraio 2026  
**Versione:** 1.1.0  
**Status:** ✅ **PRODUZIONE** - Funzionante e testato

**Aggiornamenti 3 feb 2026**: Prompt migliorato (tono unificato, Ala prolifica ricevere, % opzionale, appState.uploadingPlayer). Vedi `docs/ANALISI_PROMPT_ASSISTANT_CHAT.md`.

---

## 🎯 PANORAMICA

La **Guida Interattiva** è un assistente AI personale e amichevole che accompagna il cliente nell'uso della piattaforma. Non è solo un assistente tecnico, ma un **compagno di viaggio** che guida, motiva e incoraggia.

### **Caratteristiche Principali:**
- ✅ **Personale:** Usa nome cliente, conosce team, ricorda preferenze
- ✅ **Amichevole:** Tono conversazionale, empatico, incoraggiante
- ✅ **Motivante:** Celebra successi, incoraggia quando serve
- ✅ **Contestuale:** Capisce dove è il cliente e cosa sta facendo
- ✅ **Preciso:** Non inventa funzionalità, risponde solo su funzionalità reali
- ✅ **Bilingue:** Supporto IT/EN completo

---

## 🏗️ ARCHITETTURA

### **Stack Tecnologico:**
- **Frontend:** React component (`components/AssistantChat.jsx`)
- **Backend:** Next.js API Route (`app/api/assistant-chat/route.js`)
- **AI:** GPT-4o (modello stabile e disponibile)
- **Database:** Supabase (`user_profiles` per contesto personale)
- **Autenticazione:** Bearer token (Supabase Auth)
- **Rate Limiting:** 30 richieste/minuto per utente

### **Componenti:**
1. **`components/AssistantChat.jsx`** - Widget chat frontend
2. **`app/api/assistant-chat/route.js`** - Endpoint API backend
3. **`app/layout.tsx`** - Integrazione globale (sempre disponibile)

---

## 📁 FILE E STRUTTURA

### **1. Frontend: `components/AssistantChat.jsx`**

**Funzionalità:**
- Widget chat fluttuante (bottom-right)
- Stato aperto/chiuso
- Lista messaggi con scroll automatico
- Input con invio Enter
- Quick actions (suggerimenti rapidi)
- Saluto personale al primo accesso
- Loading indicator animato
- Gestione errori user-friendly

**State Management:**
```javascript
const [isOpen, setIsOpen] = useState(false)
const [messages, setMessages] = useState([])
const [input, setInput] = useState('')
const [loading, setLoading] = useState(false)
const [userProfile, setUserProfile] = useState(null)
const [currentPage, setCurrentPage] = useState('')
```

**Tracking Route:**
- Usa `window.location.pathname` per tracciare pagina corrente
- `window.addEventListener('popstate')` per aggiornare su navigazione
- `currentPage` passato all'API per contesto

**Quick Actions:**
- "Come carico una partita?"
- "Come gestisco la formazione?"
- "Dove sono?"
- "Cosa puoi fare?"

---

### **2. Backend: `app/api/assistant-chat/route.js`**

**Flusso Completo:**

1. **Autenticazione:**
   - Estrae Bearer token da header
   - Valida token con Supabase
   - Verifica `user_id`

2. **Rate Limiting:**
   - 30 richieste/minuto per utente
   - Headers rate limit restituiti
   - Messaggio chiaro quando limite raggiunto

3. **Build Context:**
   - Recupera profilo utente da `user_profiles`
   - Estrae: `first_name`, `team_name`, `ai_name`, `how_to_remember`, `common_problems`
   - Gestione errori con fallback a contesto vuoto

4. **Build Prompt:**
   - Prompt personalizzato con nome cliente
   - Lista completa 6 funzionalità disponibili
   - Regole critiche: NON inventare funzionalità
   - Esempi tono amichevole e motivante
   - Contesto pagina e stato app

5. **Chiama OpenAI:**
   - Modello: `gpt-4o` (stabile)
   - Temperature: 0.7 (bilanciato: creativo ma preciso)
   - Max tokens: 300 (breve ma efficace)
   - System prompt con regole critiche
   - Gestione errori robusta

6. **Parse Risposta:**
   - Estrae `content` da `data.choices[0].message.content`
   - Fallback sicuro se struttura diversa
   - Validazione risposta

7. **Return Response:**
   - `{ response: content, remaining, resetAt }`
   - Gestione errori con messaggi chiari

---

## 🔐 SICUREZZA

### **Autenticazione:**
- ✅ Bearer token obbligatorio
- ✅ Validazione token con Supabase
- ✅ Verifica `user_id` prima di procedere
- ✅ Error 401 se autenticazione fallisce

### **Rate Limiting:**
- ✅ 30 richieste/minuto per utente
- ✅ Contatore in-memory (Redis per produzione)
- ✅ Headers rate limit restituiti
- ✅ Error 429 quando limite raggiunto

### **Input Validation:**
- ✅ Verifica `message` non vuoto
- ✅ Verifica tipo string
- ✅ Trim automatico
- ✅ Error 400 se validazione fallisce

### **Error Handling:**
- ✅ Try-catch completo
- ✅ Logging dettagliato
- ✅ Messaggi errori user-friendly
- ✅ Fallback sicuri per contesto/prompt

---

## 📱 FUNZIONALITÀ DOCUMENTATE NEL PROMPT

L'AI conosce SOLO queste 6 funzionalità (non inventa altre):

1. **Dashboard (/)** - Panoramica, top players, ultime partite
2. **Gestione Formazione (/gestione-formazione)** - Campo 2D, 14 formazioni, upload
3. **Aggiungi Partita (/match/new)** - Wizard 5 step
4. **Dettaglio Partita (/match/[id])** - Visualizza, genera riassunto AI
5. **Dettaglio Giocatore (/giocatore/[id])** - Visualizza, completa profilo
6. **Impostazioni Profilo (/impostazioni-profilo)** - Dati personali, preferenze

**Regole Critiche:**
- NON inventare funzionalità che non esistono
- Se cliente chiede qualcosa che non esiste, essere onesti
- Suggerire alternativa esistente
- Mantenere coerenza: se dice "vai su X", X deve esistere

---

## 💬 PROMPT AI - PERSONALITÀ

### **Tono:**
- Amichevole, empatico, motivante, incoraggiante
- Conversazionale (come parlare con un amico)
- Usa SEMPRE il nome del cliente
- Celebra successi: "Ottimo lavoro!", "Bravo!", "Fantastico!" 🎉
- Incoraggia quando serve: "Non ti preoccupare!", "Andiamo passo-passo insieme!" 💪

### **Esempi Risposte:**

**Cliente:** "Come carico una partita?"  
**AI:** "Ciao [Nome]! Perfetto, ti guido subito! 💪  
Vai su 'Aggiungi Partita' nella dashboard, poi segui i 5 step:  
1. Carica screenshot pagelle giocatori  
2. Carica screenshot statistiche squadra  
3. Carica screenshot aree attacco  
4. Carica screenshot recuperi palla  
5. Carica screenshot formazione avversaria  
Io estraggo tutto automaticamente. Se hai dubbi, dimmelo!"

**Cliente:** "Non funziona"  
**AI:** "Non ti preoccupare, [Nome]!  
Dimmi cosa non funziona e ti aiuto subito.  
Siamo qui per questo! 🔧"

**Cliente:** "Come faccio a [funzionalità inesistente]?"  
**AI:** "Mi dispiace [Nome], questa funzionalità non è ancora disponibile.  
Ma posso aiutarti con [funzionalità simile esistente]. Vuoi che ti guidi?"

---

## 🔧 CONFIGURAZIONE

### **Variabili Ambiente Richieste:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### **Rate Limiting:**
```javascript
// lib/rateLimiter.js
'/api/assistant-chat': {
  maxRequests: 30,
  windowMs: 60000 // 1 minuto
}
```

### **Database:**
- Tabella `user_profiles` con colonne:
  - `first_name` (text)
  - `team_name` (text)
  - `ai_name` (text)
  - `how_to_remember` (text)
  - `common_problems` (text[])

---

## 🐛 PROBLEMI RISOLTI

### **1. Errore 500 - Modello GPT-5 non disponibile**
- **Problema:** Modello `gpt-5` non disponibile
- **Soluzione:** Cambiato a `gpt-4o` (stabile e disponibile)
- **Status:** ✅ Risolto

### **2. Errore window.addEventListener**
- **Problema:** Conflitto con Next.js App Router
- **Soluzione:** Mantenuto `window.addEventListener('popstate')` con cleanup corretto
- **Status:** ✅ Risolto

### **3. Errore setCurrentPage**
- **Problema:** `setCurrentPage` non definito dopo rimozione
- **Soluzione:** Ripristinato `currentPage` come state
- **Status:** ✅ Risolto

### **4. Gestione Errori**
- **Problema:** Errori non gestiti correttamente
- **Soluzione:** Aggiunto try-catch robusto, validazione response, fallback sicuri
- **Status:** ✅ Risolto

---

## 📊 FLUSSO DATI

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENTE (Browser)                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  AssistantChat.jsx                                    │   │
│  │  1. Carica profilo utente                            │   │
│  │  2. Traccia pagina corrente (window.location)       │   │
│  │  3. Cliente invia messaggio                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                    ↓ POST /api/assistant-chat              │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (Next.js API Route)                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/assistant-chat/route.js                        │   │
│  │  1. Autentica (Bearer token)                         │   │
│  │  2. Rate limiting                                    │   │
│  │  3. Build context (Supabase user_profiles)          │   │
│  │  4. Build prompt personalizzato                     │   │
│  │  5. Chiama OpenAI (GPT-4o)                          │   │
│  │  6. Parse risposta                                   │   │
│  │  7. Return JSON { response, remaining, resetAt }    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  OPENAI API                                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  GPT-4o                                               │   │
│  │  - System prompt (regole critiche)                   │   │
│  │  - User prompt (personalizzato con contesto)         │   │
│  │  - Temperature: 0.7                                   │   │
│  │  - Max tokens: 300                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  CLIENTE (Browser)                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  AssistantChat.jsx                                    │   │
│  │  1. Riceve risposta AI                               │   │
│  │  2. Aggiunge messaggio alla lista                    │   │
│  │  3. Auto-scroll a ultimo messaggio                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ TESTING

### **Test Manuali:**
1. ✅ Apertura chat widget
2. ✅ Invio messaggio
3. ✅ Ricezione risposta AI
4. ✅ Quick actions funzionanti
5. ✅ Saluto personale al primo accesso
6. ✅ Gestione errori (session expired, rate limit, ecc.)
7. ✅ Tracking pagina corrente
8. ✅ Contesto personale (nome, team)

### **Test Edge Cases:**
1. ✅ Messaggio vuoto → Non inviato
2. ✅ Session expired → Messaggio chiaro
3. ✅ Rate limit → Messaggio chiaro con resetAt
4. ✅ Errore API → Messaggio user-friendly
5. ✅ Profilo non trovato → Usa fallback "amico"
6. ✅ Contesto build fallisce → Usa contesto vuoto

---

## 📈 METRICHE E MONITORAGGIO

### **Logging:**
- `[assistant-chat]` - Endpoint backend
- `[AssistantChat]` - Componente frontend
- Errori loggati con dettagli completi

### **Rate Limiting:**
- Contatore per utente
- Reset automatico ogni minuto
- Headers restituiti: `X-RateLimit-*`

### **Performance:**
- Risposta AI: ~1-3 secondi (GPT-4o)
- Build context: ~100-200ms (Supabase query)
- Total: ~1.5-3.5 secondi per risposta

---

## 🔄 INTEGRAZIONE

### **Layout Globale:**
```tsx
// app/layout.tsx
import AssistantChat from '@/components/AssistantChat'

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <LanguageProviderWrapper>
          {children}
          <AssistantChat /> {/* Sempre disponibile */}
        </LanguageProviderWrapper>
      </body>
    </html>
  )
}
```

### **CSS Animazioni:**
```css
/* app/globals.css */
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
```

### **Traduzioni:**
```javascript
// lib/i18n.js
translations = {
  it: {
    howToAddMatch: 'Come carico una partita?',
    howToManageFormation: 'Come gestisco la formazione?',
    whereAmI: 'Dove sono?',
    whatCanYouDo: 'Cosa puoi fare?',
    typeMessage: 'Scrivi un messaggio...',
    openAssistant: 'Apri assistente',
    closeAssistant: 'Chiudi assistente',
    sendMessage: 'Invia messaggio',
    yourCoach: 'Il tuo Coach AI'
  },
  en: { /* ... */ }
}
```

---

## 🚀 DEPLOYMENT

### **Vercel:**
- ✅ Endpoint API Route funzionante
- ✅ Componente client-side funzionante
- ✅ Variabili ambiente configurate
- ✅ Rate limiting in-memory (Redis per produzione)

### **Checklist Pre-Deploy:**
- ✅ Variabili ambiente configurate
- ✅ Rate limiting configurato
- ✅ Error handling completo
- ✅ Logging attivo
- ✅ Test manuali completati

---

## 📝 NOTE TECNICHE

### **Modello AI:**
- **Attuale:** GPT-4o (stabile)
- **Futuro:** GPT-5 quando disponibile e testato
- **Temperature:** 0.7 (bilanciato: creativo ma preciso)
- **Max Tokens:** 300 (breve ma efficace)

### **Contesto:**
- Profilo utente caricato al mount
- Pagina corrente tracciata con `window.location.pathname`
- Stato app determinato da `currentPage`
- Fallback sicuri se contesto non disponibile

### **Prompt Engineering:**
- System prompt con regole critiche
- User prompt personalizzato con contesto
- Lista funzionalità completa nel prompt
- Esempi tono amichevole e motivante
- Istruzioni esplicite: NON inventare funzionalità

---

## ✅ STATUS FINALE

**✅ PRODUZIONE - Funzionante e testato**

- ✅ Frontend: Widget chat funzionante
- ✅ Backend: Endpoint API funzionante
- ✅ AI: GPT-4o con prompt ottimizzato
- ✅ Sicurezza: Autenticazione e rate limiting
- ✅ Error Handling: Completo e robusto
- ✅ UX: Personale, amichevole, motivante
- ✅ Bilingue: Supporto IT/EN
- ✅ Documentazione: Completa

**Pronto per produzione! 🚀**

---

**Ultimo aggiornamento:** 23 Gennaio 2026  
**Versione:** 1.0.0
