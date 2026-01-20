# 🔒 Audit Sicurezza - eFootball AI Coach

**Data Audit**: Gennaio 2025  
**Versione Sistema**: 1.2.0  
**Tipo Audit**: Completo - Allineamento Cartelle/Funzioni/Pagine/Tabelle

---

## 📋 Indice

1. [Panoramica Generale](#panoramica-generale)
2. [Audit API Routes](#audit-api-routes)
3. [Audit Pagine Frontend](#audit-pagine-frontend)
4. [Audit Database e RLS](#audit-database-e-rls)
5. [Audit Librerie](#audit-librerie)
6. [Vulnerabilità Identificate](#vulnerabilità-identificate)
7. [Raccomandazioni](#raccomandazioni)

---

## 🎯 Panoramica Generale

**Sistema**: eFootball AI Coach  
**Stack**: Next.js 14, Supabase, OpenAI GPT-4 Vision  
**Autenticazione**: Supabase Auth (Email/Password)  
**Sicurezza Database**: Row Level Security (RLS) abilitato

### Stato Sicurezza Generale
- ✅ **Autenticazione**: Implementata correttamente
- ✅ **RLS Policies**: Presenti e configurate
- ✅ **Validazione Input**: Parzialmente implementata
- ⚠️ **Rate Limiting**: Non implementato
- ⚠️ **Input Sanitization**: Parziale

---

## 🔌 Audit API Routes

### `app/api/extract-player/route.js`

**Metodo**: POST  
**Autenticazione**: ❌ **NON RICHIESTA**  
**Validazione Input**: ✅ Parziale

#### Analisi Dettagliata:

**Sicurezza Input**:
- ✅ Valida presenza `imageDataUrl`
- ✅ Valida tipo stringa
- ✅ Estrae base64 da dataUrl
- ⚠️ **NON valida dimensione immagine** (rischio DoS con immagini giganti)
- ⚠️ **NON valida formato immagine** (accetta qualsiasi stringa)
- ⚠️ **NON ha rate limiting** (rischio abuso API OpenAI)

**Sicurezza Output**:
- ✅ Normalizza dati (limita array, converte numeri)
- ✅ Gestisce errori OpenAI
- ⚠️ **Espone messaggi errore dettagliati** (può rivelare info sistema)

**Variabili Ambiente**:
- ✅ Usa `process.env.OPENAI_API_KEY` (server-side)
- ✅ Verifica presenza API key

**Vulnerabilità**:
1. **CRITICA**: Nessuna autenticazione - endpoint pubblico
2. **ALTA**: Nessun rate limiting - rischio abuso quota OpenAI
3. **MEDIA**: Nessuna validazione dimensione immagine
4. **BASSA**: Messaggi errore troppo dettagliati

**Raccomandazioni**:
- Aggiungere autenticazione (Bearer token)
- Implementare rate limiting
- Validare dimensione max immagine (es. 10MB)
- Sanitizzare messaggi errore

---

### `app/api/extract-formation/route.js`

**Metodo**: POST  
**Autenticazione**: ❌ **NON RICHIESTA**  
**Validazione Input**: ✅ Parziale

#### Analisi Dettagliata:

**Sicurezza Input**:
- ✅ Valida presenza `imageDataUrl`
- ✅ Valida tipo stringa
- ✅ Valida struttura JSON response
- ✅ Limita slot_index a 0-10
- ⚠️ **NON valida dimensione immagine**
- ⚠️ **NON ha rate limiting**

**Sicurezza Output**:
- ✅ Valida presenza 11 giocatori (warning, non bloccante)
- ✅ Normalizza slot_index
- ⚠️ **Espone warning dettagliati in log**

**Vulnerabilità**:
1. **CRITICA**: Nessuna autenticazione
2. **ALTA**: Nessun rate limiting
3. **MEDIA**: Nessuna validazione dimensione immagine

**Raccomandazioni**:
- Aggiungere autenticazione
- Implementare rate limiting
- Validare dimensione max immagine

---

### `app/api/supabase/save-player/route.js`

**Metodo**: POST  
**Autenticazione**: ✅ **RICHIESTA** (Bearer token)  
**Validazione Input**: ✅ Completa

#### Analisi Dettagliata:

**Autenticazione**:
- ✅ Estrae Bearer token da header
- ✅ Valida token con `validateToken()`
- ✅ Verifica user_id da token
- ✅ Usa Service Role Key per operazioni admin

**Sicurezza Input**:
- ✅ Valida presenza `player.player_name`
- ✅ Normalizza input (`toInt()`, `toText()`)
- ✅ Sanitizza stringhe (trim)
- ✅ Limita array (skills max 40, com_skills max 20)
- ✅ Valida slot_index (0-10)
- ⚠️ **NON valida lunghezza massima campi testo** (rischio DoS)
- ⚠️ **NON valida dimensione JSONB** (base_stats, metadata)

**Sicurezza Database**:
- ✅ Inserisce con `user_id` dal token (non dal body)
- ✅ Usa Service Role (bypass RLS necessario)
- ✅ Verifica esistenza playing_style prima di referenziare

**Logging**:
- ⚠️ **Log contiene user_id** (compliance/privacy)

**Vulnerabilità**:
1. **MEDIA**: Possibile DoS con campi testo molto lunghi
2. **MEDIA**: Possibile DoS con JSONB molto grandi
3. **BASSA**: Logging user_id (GDPR compliance)

**Raccomandazioni**:
- Aggiungere validazione lunghezza massima campi
- Limitare dimensione JSONB (es. 500KB)
- Rimuovere user_id dai log (usare hash)

---

### `app/api/supabase/save-formation-layout/route.js`

**Metodo**: POST  
**Autenticazione**: ✅ **RICHIESTA** (Bearer token)  
**Validazione Input**: ✅ Completa

#### Analisi Dettagliata:

**Autenticazione**:
- ✅ Estrae Bearer token
- ✅ Valida token
- ✅ Verifica user_id

**Sicurezza Input**:
- ✅ Valida presenza `formation`
- ✅ Completa slot mancanti (default positions)
- ✅ Valida slot_keys (0-10)
- ✅ Valida `preserve_slots` come array
- ⚠️ **NON valida dimensione slot_positions JSONB**

**Sicurezza Database**:
- ✅ Usa UPSERT con `user_id` (UNIQUE constraint)
- ✅ Aggiorna solo giocatori dell'utente autenticato
- ✅ Libera solo slot specificati (preserve_slots)

**Vulnerabilità**:
1. **MEDIA**: Possibile DoS con slot_positions JSONB molto grande

**Raccomandazioni**:
- Validare dimensione slot_positions (es. max 50KB)

---

### `app/api/supabase/assign-player-to-slot/route.js`

**Metodo**: PATCH  
**Autenticazione**: ✅ **RICHIESTA** (Bearer token)  
**Validazione Input**: ✅ Completa

#### Analisi Dettagliata:

**Autenticazione**:
- ✅ Estrae Bearer token
- ✅ Valida token
- ✅ Verifica user_id

**Sicurezza Input**:
- ✅ Valida `slot_index` (0-10)
- ✅ Richiede `player_id` O `player_data`
- ✅ Valida esistenza giocatore
- ✅ Verifica `user_id` del giocatore (previene accesso non autorizzato)
- ✅ Normalizza input

**Sicurezza Database**:
- ✅ Verifica giocatore appartiene all'utente
- ✅ Libera vecchio slot prima di assegnare nuovo
- ✅ Usa transazioni implicite (UPDATE sequenziali)

**Vulnerabilità**:
1. **BASSA**: Race condition possibile (due richieste simultanee)

**Raccomandazioni**:
- Usare transazioni esplicite per operazioni atomiche

---

## 📄 Audit Pagine Frontend

### `app/page.jsx` (Dashboard)

**Autenticazione**: ✅ Verifica sessione  
**Query Database**: Query dirette Supabase (RLS-protected)

#### Analisi Dettagliata:

**Sicurezza**:
- ✅ Verifica `supabase` client disponibile
- ✅ Verifica sessione attiva
- ✅ Redirect a `/login` se non autenticato
- ✅ Query protette da RLS (`formation_layout`, `players`)
- ✅ Filtra risultati nulli

**Vulnerabilità**:
- ✅ Nessuna vulnerabilità critica identificata

---

### `app/login/page.jsx`

**Autenticazione**: Gestisce login/signup  
**Validazione Input**: ✅ Client-side

#### Analisi Dettagliata:

**Sicurezza**:
- ✅ Valida presenza email/password
- ✅ Normalizza email (trim, lowercase)
- ✅ Min length password (6 caratteri)
- ✅ Gestisce errori autenticazione
- ⚠️ **Password inviata in chiaro** (normale, usa HTTPS)
- ⚠️ **NON valida complessità password** (solo length)

**Vulnerabilità**:
1. **MEDIA**: Password deboli accettate (min 6 caratteri)

**Raccomandazioni**:
- Aggiungere validazione complessità password (min 8 char, maiuscole, numeri)
- Configurare Supabase Auth password policy

---

### `app/gestione-formazione/page.jsx`

**Autenticazione**: ✅ Verifica sessione  
**Operazioni Database**: Mix query dirette + API routes

#### Analisi Dettagliata:

**Sicurezza**:
- ✅ Verifica sessione per operazioni critiche
- ✅ Usa token Bearer per API routes
- ✅ Query dirette protette da RLS
- ✅ Valida input prima di chiamare API
- ⚠️ **Operazioni DELETE senza conferma** (solo per riserve)

**Vulnerabilità**:
1. **BASSA**: Rimozione da slot senza conferma (UX, non sicurezza)

---

### `app/giocatore/[id]/page.jsx`

**Autenticazione**: ✅ Verifica sessione  
**Query Database**: Query dirette + API routes

#### Analisi Dettagliata:

**Sicurezza**:
- ✅ Verifica sessione
- ✅ Query protette da RLS (solo giocatori dell'utente)
- ✅ Valida `id` parametro (UUID)
- ✅ Usa token Bearer per API

**Vulnerabilità**:
- ✅ Nessuna vulnerabilità critica

---

## 🗄️ Audit Database e RLS

### Tabella: `players`

**RLS**: ✅ Abilitato  
**Policies**: 4 policies (SELECT, INSERT, UPDATE, DELETE)

#### Policies Verificate:

1. **"Users can view own players"** (SELECT)
   - ✅ Qual: `auth.uid() = user_id`
   - ✅ Permissive: PERMISSIVE
   - ✅ Roles: public
   - **Stato**: ✅ Corretto

2. **"Users can insert own players"** (INSERT)
   - ✅ With_check: `auth.uid() = user_id`
   - ✅ Permissive: PERMISSIVE
   - ✅ Roles: public
   - **Stato**: ✅ Corretto

3. **"Users can update own players"** (UPDATE)
   - ✅ Qual: `auth.uid() = user_id`
   - ✅ With_check: `auth.uid() = user_id`
   - ✅ Permissive: PERMISSIVE
   - ✅ Roles: public
   - **Stato**: ✅ Corretto

4. **"Users can delete own players"** (DELETE)
   - ✅ Qual: `auth.uid() = user_id`
   - ✅ Permissive: PERMISSIVE
   - ✅ Roles: public
   - **Stato**: ✅ Corretto

**Vulnerabilità**:
- ✅ Nessuna vulnerabilità identificata

**Raccomandazioni**:
- ✅ Policies corrette, nessuna modifica necessaria

---

### Tabella: `formation_layout`

**RLS**: ✅ Abilitato  
**Policies**: 1 policy (ALL)

#### Policies Verificate:

1. **"Users can manage own layout"** (ALL)
   - ✅ Qual: `auth.uid() = user_id`
   - ✅ Permissive: PERMISSIVE
   - ✅ Roles: public
   - ✅ Covers: SELECT, INSERT, UPDATE, DELETE
   - **Stato**: ✅ Corretto

**Vulnerabilità**:
- ✅ Nessuna vulnerabilità identificata

---

### Tabella: `playing_styles`

**RLS**: ✅ Abilitato  
**Policies**: 1 policy (SELECT)

#### Policies Verificate:

1. **"Public read access for playing_styles"** (SELECT)
   - ✅ Qual: `true` (pubblico)
   - ✅ Permissive: PERMISSIVE
   - ✅ Roles: public
   - **Stato**: ✅ Corretto (dati pubblici, cataloghi)

**Vulnerabilità**:
- ✅ Nessuna vulnerabilità (dati pubblici)

---

## 📚 Audit Librerie

### `lib/authHelper.js`

**Funzioni**: `validateToken()`, `extractBearerToken()`

#### Analisi Dettagliata:

**validateToken()**:
- ✅ Valida parametri richiesti
- ✅ Usa `anonKey` da env (non hardcoded)
- ✅ Usa `auth.getUser()` per validare token
- ✅ Gestisce errori correttamente
- ✅ Restituisce userData solo se valido

**extractBearerToken()**:
- ✅ Supporta case-insensitive headers
- ✅ Estrae token da "Bearer " prefix
- ✅ Gestisce header mancanti

**Vulnerabilità**:
- ✅ Nessuna vulnerabilità identificata

---

### `lib/supabaseClient.js`

**Funzioni**: Crea client Supabase frontend

#### Analisi Dettagliata:

**Sicurezza**:
- ✅ Usa variabili env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- ✅ Configura autoRefreshToken, persistSession
- ✅ Gestisce caso env mancanti (null client)

**Vulnerabilità**:
- ✅ Nessuna vulnerabilità (normale esporre anon key frontend)

---

## ⚠️ Vulnerabilità Identificate

### Critiche (Priorità 1)

1. **`/api/extract-player` e `/api/extract-formation` - Nessuna Autenticazione**
   - **Descrizione**: Endpoint pubblici senza autenticazione
   - **Impatto**: Abuso quota OpenAI, costi elevati
   - **Fix**: Aggiungere autenticazione Bearer token

### Alte (Priorità 2)

2. **Nessun Rate Limiting su Endpoint OpenAI**
   - **Descrizione**: Possibile spam di richieste
   - **Impatto**: Quota OpenAI esaurita rapidamente
   - **Fix**: Implementare rate limiting (es. 10 req/min per utente)

3. **Nessuna Validazione Dimensione Immagine**
   - **Descrizione**: Possibile DoS con immagini giganti
   - **Impatto**: Server overload, costi OpenAI
   - **Fix**: Validare max 10MB per immagine

### Medie (Priorità 3)

4. **Password Policy Debole**
   - **Descrizione**: Min 6 caratteri, nessuna complessità
   - **Impatto**: Account vulnerabili a brute force
   - **Fix**: Configurare policy Supabase Auth (min 8, maiuscole, numeri)

5. **Nessuna Validazione Lunghezza Campi Testo**
   - **Descrizione**: Possibile DoS con campi molto lunghi
   - **Impatto**: Database overload
   - **Fix**: Aggiungere max length validations

6. **Logging User ID**
   - **Descrizione**: User ID nei log console
   - **Impatto**: Privacy/GDPR compliance
   - **Fix**: Hashare o rimuovere user_id dai log

### Basse (Priorità 4)

7. **Messaggi Errore Troppo Dettagliati**
   - **Descrizione**: Espone dettagli sistema
   - **Impatto**: Information disclosure
   - **Fix**: Sanitizzare messaggi errore

8. **Race Condition in Assign Slot**
   - **Descrizione**: Due richieste simultanee possono causare inconsistenza
   - **Impatto**: Dati inconsistenti
   - **Fix**: Usare transazioni atomiche

---

## 📋 Raccomandazioni

### Immediate (Questa Settimana)

1. ✅ Aggiungere autenticazione a `/api/extract-player` e `/api/extract-formation`
2. ✅ Implementare rate limiting base (middleware Next.js)
3. ✅ Validare dimensione immagini (max 10MB)

### Breve Termine (Questo Mese)

4. ✅ Configurare password policy Supabase Auth
5. ✅ Aggiungere validazione lunghezza campi
6. ✅ Sanitizzare messaggi errore
7. ✅ Rimuovere user_id dai log

### Medio Termine (Prossimi 3 Mesi)

8. ✅ Implementare rate limiting avanzato (per-utente)
9. ✅ Aggiungere transazioni atomiche per operazioni critiche
10. ✅ Implementare logging sicuro (hash user_id)
11. ✅ Aggiungere monitoring/alerting sicurezza

---

## ✅ Checklist Implementazione

- [ ] Autenticazione endpoint extract-player
- [ ] Autenticazione endpoint extract-formation
- [ ] Rate limiting middleware
- [ ] Validazione dimensione immagini
- [ ] Password policy Supabase
- [ ] Validazione lunghezza campi
- [ ] Sanitizzazione errori
- [ ] Rimozione user_id da log
- [ ] Transazioni atomiche
- [ ] Monitoring sicurezza

---

**Fine Audit Sicurezza**
