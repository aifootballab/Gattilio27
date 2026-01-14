# 🔌 Come Connettere Supabase a Cursor AI

**Data**: 2025-01-12  
**Status**: 📋 Guida Completa  
**Obiettivo**: Permettere a Cursor AI di interagire direttamente con Supabase

---

## 🎯 OPZIONI DISPONIBILI

### **Opzione 1: Supabase CLI tramite Terminale - CONSIGLIATO** ⭐

Posso eseguire comandi Supabase CLI direttamente tramite il terminale integrato di Cursor.

#### **Step 1: Installa Supabase CLI**

```bash
# Windows (PowerShell)
npm install -g supabase

# Verifica installazione
supabase --version
```

#### **Step 2: Login a Supabase**

```bash
# Login (apre browser per autenticazione)
supabase login

# Verifica progetti disponibili
supabase projects list
```

#### **Step 3: Link al Progetto**

```bash
# Link al progetto (usa il Project Reference ID)
supabase link --project-ref YOUR_PROJECT_REF

# Esempio:
# supabase link --project-ref zliuuorrwdetylollrua
```

**Dove trovare Project Reference**:
- Supabase Dashboard → Settings → General → Reference ID

#### **Step 4: Verifica Connessione**

```bash
# Verifica stato connessione
supabase status
```

**Ora posso eseguire comandi come**:
- ✅ `supabase db push` - Eseguire migrations
- ✅ `supabase functions deploy` - Deploy Edge Functions
- ✅ `supabase db execute` - Eseguire query SQL
- ✅ `supabase db diff` - Vedere differenze schema

---

### **Opzione 2: Script SQL Eseguibili** 📝

Posso creare script SQL che tu puoi eseguire nel Supabase Dashboard, oppure posso preparare comandi che esegui manualmente.

#### **Vantaggi**:
- ✅ Non richiede installazione CLI
- ✅ Funziona subito
- ✅ Sicuro (esegui tu nel Dashboard)

#### **Come funziona**:
1. Ti preparo lo script SQL completo
2. Tu copi/incolli nel Supabase Dashboard → SQL Editor
3. Esegui e verifichi

**Esempio**: Ho già creato `ESEGUI_MIGRATION_003_SUPABASE.md` con istruzioni complete.

---

### **Opzione 3: API REST Supabase** 🌐

Posso interagire con Supabase tramite API REST usando `curl` o script.

#### **Configurazione**

Crea un file `.env.local` con:
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### **Esempi di Comandi che Posso Eseguire**:

```bash
# Eseguire query SQL
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/rest/v1/rpc/exec_sql" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM players_base LIMIT 10"}'

# Deploy Edge Function (tramite API)
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-screenshot-gpt" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"image_url": "...", "image_type": "player_profile", "user_id": "..."}'
```

---

## 🔐 SICUREZZA: Come Ottenere le Credenziali

### **1. Supabase URL e Anon Key** (già configurato)

1. Vai su **Supabase Dashboard** → **Settings** → **API**
2. Copia:
   - **Project URL** → `https://your-project-ref.supabase.co`
   - **anon/public key** → Usa per frontend

### **2. Service Role Key** (per MCP/CLI - ACCESSO COMPLETO)

1. Vai su **Supabase Dashboard** → **Settings** → **API**
2. Copia **service_role key** (⚠️ SEGRETO - non esporre nel frontend!)
3. Usa solo per:
   - MCP Server
   - Supabase CLI
   - Script backend/server-side

### **3. Project Reference**

1. Vai su **Supabase Dashboard** → **Settings** → **General**
2. Copia **Reference ID** (es. `zliuuorrwdetylollrua`)

---

## 📋 CHECKLIST CONFIGURAZIONE

### **Per CLI (Opzione 1 - CONSIGLIATO)**:
- [ ] Installato Supabase CLI (`npm install -g supabase`)
- [ ] Eseguito `supabase login`
- [ ] Eseguito `supabase link --project-ref YOUR_PROJECT_REF`
- [ ] Verificato con `supabase status`
- [ ] Testato: chiedi a me di eseguire `supabase db push` o query

### **Per Script SQL (Opzione 2)**:
- [ ] Aperto Supabase Dashboard → SQL Editor
- [ ] Pronto a copiare/incollare script SQL che preparo
- [ ] Testato: chiedi a me di preparare una query SQL

### **Per API REST (Opzione 3)**:
- [ ] Creato `.env.local` con credenziali
- [ ] Testato con `curl` o script

---

## 🧪 TEST CONNESSIONE

### **Test CLI (Opzione 1)**:
```bash
# Verifica connessione
supabase status

# Test query (se CLI supporta)
supabase db execute --query "SELECT COUNT(*) FROM players_base"
```

### **Test Script SQL (Opzione 2)**:
1. Chiedimi: "Esegui una query per vedere le prime 5 righe di players_base"
2. Ti preparo lo script SQL
3. Tu lo esegui nel Supabase Dashboard → SQL Editor
4. Vedi i risultati

### **Test API REST (Opzione 3)**:
```bash
# Test endpoint
curl -X GET "https://YOUR_PROJECT_REF.supabase.co/rest/v1/players_base?select=*&limit=5" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### **Test API**:
```bash
# Test endpoint
curl -X GET "https://YOUR_PROJECT_REF.supabase.co/rest/v1/players_base?select=*&limit=5" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## ⚠️ TROUBLESHOOTING

### **CLI non funziona**:
- Verifica installazione: `supabase --version`
- Esegui `supabase login` di nuovo
- Verifica che il progetto sia linkato: `supabase projects list`

### **API REST non funziona**:
- Verifica che le credenziali siano corrette
- Controlla che l'endpoint sia corretto
- Verifica CORS se necessario

---

## 🎯 RACCOMANDAZIONE

**Per uso con Cursor AI, consiglio Opzione 1 (CLI)** perché:
- ✅ Posso eseguire comandi direttamente dal terminale
- ✅ Accesso completo alle funzionalità Supabase
- ✅ Posso deployare Edge Functions automaticamente
- ✅ Posso eseguire migrations con un comando

**Alternativa: Opzione 2 (Script SQL)** se:
- ⚠️ Non vuoi installare CLI
- ✅ Preferisci controllo manuale
- ✅ Vuoi vedere/eseguire ogni query tu stesso

---

## 📝 PROSSIMI PASSI

1. **Scegli un'opzione** (MCP consigliato)
2. **Segui gli step** della guida
3. **Testa la connessione**
4. **Dimmi quando sei pronto** e posso aiutarti a:
   - Eseguire la migration 003
   - Deployare le Edge Functions
   - Eseguire query di verifica
   - Gestire il database

---

**Status**: 🟢 **GUIDA COMPLETA** - Scegli l'opzione e seguiamo gli step!
