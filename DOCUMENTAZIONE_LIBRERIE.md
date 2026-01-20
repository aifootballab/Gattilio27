# 📚 Documentazione Librerie - eFootball AI Coach

**Data Aggiornamento**: Gennaio 2025  
**Versione**: 1.2.0

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [lib/authHelper.js](#libauthhelperjs)
3. [lib/supabaseClient.js](#libsupabaseclientjs)
4. [lib/normalize.js](#libnormalizejs)
5. [lib/i18n.js](#libi18njs)

---

## 🎯 Panoramica

Le librerie in `lib/` forniscono funzionalità core riutilizzabili:
- **Autenticazione**: Validazione token Supabase
- **Database**: Client Supabase configurato
- **Normalizzazione**: Funzioni di sanitizzazione dati
- **Internazionalizzazione**: Sistema traduzioni IT/EN

---

## 🔐 lib/authHelper.js

**Scopo**: Helper per validazione token Supabase nelle API routes

### Funzioni Esportate

#### `validateToken(token, supabaseUrl, anonKey)`

**Descrizione**: Valida un token Supabase (anon o email) e restituisce userData

**Parametri**:
- `token` (string): Bearer token da validare
- `supabaseUrl` (string): URL Supabase project
- `anonKey` (string): Anon key (JWT legacy o publishable key)

**Ritorna**: `Promise<{userData: object|null, error: Error|null}>`

**Comportamento**:
- Crea client Supabase con anonKey
- Usa `auth.getUser(token)` per validare
- Restituisce userData solo se token valido
- Gestisce errori gracefully

**Esempio Uso**:
```javascript
import { validateToken, extractBearerToken } from '@/lib/authHelper'

const token = extractBearerToken(req)
const { userData, error } = await validateToken(token, supabaseUrl, anonKey)

if (error || !userData?.user?.id) {
  return NextResponse.json({ error: 'Invalid auth' }, { status: 401 })
}

const userId = userData.user.id
```

**Note Sicurezza**:
- ✅ Usa SOLO anonKey da env (non hardcoded)
- ✅ Supporta sia token anonimi che email
- ✅ Valida sempre presenza user.id

---

#### `extractBearerToken(req)`

**Descrizione**: Estrae token Bearer dall'header Authorization

**Parametri**:
- `req` (Request): Next.js Request object

**Ritorna**: `string|null` - Token estratto o null se non trovato

**Comportamento**:
- Cerca header "authorization" (case-insensitive)
- Supporta sia "Bearer token" che "bearer token"
- Restituisce null se header mancante o formato errato

**Esempio Uso**:
```javascript
const token = extractBearerToken(req)
if (!token) {
  return NextResponse.json({ error: 'Missing token' }, { status: 401 })
}
```

**Note**:
- ✅ Case-insensitive header lookup
- ✅ Gestisce prefisso "Bearer " automaticamente

---

## 🗄️ lib/supabaseClient.js

**Scopo**: Crea e configura client Supabase per frontend

### Esportazione

#### `supabase` (Client)

**Descrizione**: Client Supabase configurato per uso frontend

**Configurazione**:
- URL: `process.env.NEXT_PUBLIC_SUPABASE_URL`
- Key: `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Auto refresh token: abilitato
- Persist session: abilitato
- Detect session in URL: disabilitato

**Comportamento**:
- Se env mancanti, restituisce `null`
- Client configurato per auto-refresh token
- Session persiste in localStorage

**Esempio Uso**:
```javascript
import { supabase } from '@/lib/supabaseClient'

if (!supabase) {
  // Gestisci caso env mancanti
  return
}

const { data, error } = await supabase
  .from('players')
  .select('*')
```

**Note Sicurezza**:
- ✅ Anon key esposta frontend (normale, protetto da RLS)
- ✅ RLS gestisce accesso ai dati
- ✅ Token refresh automatico

---

## 🔧 lib/normalize.js

**Scopo**: Funzioni di normalizzazione e sanitizzazione dati

### Funzioni Esportate

#### `normalizeStringArray(input)`

**Descrizione**: Normalizza input in array di stringhe, gestendo tutti i casi edge

**Parametri**:
- `input` (unknown): Input da normalizzare (array, stringa, oggetto, null, undefined)

**Ritorna**: `string[]` - Array di stringhe (sempre, anche se vuoto)

**Comportamento**:

1. **Se è array**: Filtra solo stringhe valide (trim, length > 0)
2. **Se è stringa**:
   - Prova JSON.parse (es: `'["stats","skills"]'`)
   - Se parse fallisce, tratta come stringa semplice
   - Se contiene virgole, splitta (es: `"stats,skills"`)
   - Altrimenti array con un elemento
3. **Se è oggetto**: Estrae valori e filtra stringhe
4. **Default**: Array vuoto

**Esempi**:
```javascript
normalizeStringArray(['stats', 'skills']) // ['stats', 'skills']
normalizeStringArray('["stats","skills"]') // ['stats', 'skills']
normalizeStringArray('stats,skills') // ['stats', 'skills']
normalizeStringArray('stats') // ['stats']
normalizeStringArray({a: 'stats', b: 'skills'}) // ['stats', 'skills']
normalizeStringArray(null) // []
normalizeStringArray(undefined) // []
```

**Note**:
- ✅ Gestisce tutti i casi edge
- ✅ Filtra stringhe vuote/whitespace
- ✅ Sempre ritorna array (mai null/undefined)

---

## 🌐 lib/i18n.js

**Scopo**: Sistema internazionalizzazione IT/EN

### Componenti Esportati

#### `LanguageProvider`

**Descrizione**: Provider React per gestione lingua globale

**Props**:
- `children` (ReactNode): Componenti figli

**Comportamento**:
- Legge lingua salvata in localStorage (`app_language`)
- Default: `'it'`
- Salva cambio lingua in localStorage
- Fornisce context a tutti i componenti

**Esempio Uso**:
```jsx
import { LanguageProvider } from '@/lib/i18n'

<LanguageProvider>
  <App />
</LanguageProvider>
```

---

#### `useTranslation()`

**Descrizione**: Hook React per accesso traduzioni

**Ritorna**: `{t: function, lang: string, changeLanguage: function}`

**Metodi**:
- `t(key)`: Traduce chiave (fallback a EN se mancante)
- `lang`: Lingua corrente ('it' | 'en')
- `changeLanguage(newLang)`: Cambia lingua e salva in localStorage

**Esempio Uso**:
```jsx
import { useTranslation } from '@/lib/i18n'

function MyComponent() {
  const { t, lang, changeLanguage } = useTranslation()
  
  return (
    <div>
      <h1>{t('dashboard')}</h1>
      <button onClick={() => changeLanguage('en')}>English</button>
    </div>
  )
}
```

**Fallback**:
- Se chiave mancante in lingua corrente, usa EN
- Se chiave mancante anche in EN, ritorna chiave stessa

---

#### `getTranslation(key, lang)`

**Descrizione**: Helper funzione per traduzioni fuori da componenti React

**Parametri**:
- `key` (string): Chiave traduzione
- `lang` (string|null): Lingua (opzionale, default da localStorage)

**Ritorna**: `string` - Traduzione o chiave se mancante

**Esempio Uso**:
```javascript
import { getTranslation } from '@/lib/i18n'

const text = getTranslation('dashboard', 'en') // 'Dashboard'
```

---

### Traduzioni Disponibili

**Lingue Supportate**: IT, EN

**Categorie Chiavi**:
- Dashboard
- Autenticazione (login, signup, logout)
- Rosa/Giocatori
- Formazione
- Statistiche
- Errori/Messaggi

**Totale Chiavi**: ~800+ traduzioni

**Note**:
- ✅ Tutte le chiavi hanno fallback EN
- ✅ Lingua salvata in localStorage
- ✅ Supporto completo IT/EN

---

## 📝 Note Implementazione

### Pattern Comuni

1. **Validazione Input**: Usa sempre `normalizeStringArray()` per array stringhe
2. **Autenticazione API**: Usa sempre `validateToken()` + `extractBearerToken()`
3. **Query Database**: Usa `supabase` client con RLS
4. **Traduzioni**: Usa `useTranslation()` hook in componenti React

### Best Practices

- ✅ Sempre validare token prima di operazioni database
- ✅ Usare normalizzazione per input utente
- ✅ Gestire errori gracefully
- ✅ Fallback traduzioni sempre presenti

---

**Fine Documentazione Librerie**
