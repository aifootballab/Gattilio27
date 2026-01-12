# 🔧 Setup Google Vision API + Vercel
## Configurazione Completa per Agente

---

## 📋 PROMPT PER AGENTE

```
Configura Google Cloud Vision API per il progetto eFootball AI Coach e crea le variabili d'ambiente necessarie in Vercel.

REQUISITI:

1. GOOGLE CLOUD SETUP:
   - Crea un nuovo progetto Google Cloud (o usa esistente)
   - Nome progetto: "efootball-ai-coach" (o simile)
   - Abilita "Cloud Vision API"
   - Crea un Service Account:
     * Nome: "vision-api-service"
     * Ruolo: "Cloud Vision API User"
   - Genera chiave JSON per il Service Account
   - Scarica il file JSON delle credentials

2. VARIABILI VERCEL:
   Crea le seguenti variabili d'ambiente in Vercel:
   
   a) GOOGLE_VISION_PROJECT_ID
      - Valore: ID del progetto Google Cloud
      - Esempio: "efootball-ai-coach-123456"
      - Environment: Production, Preview, Development
   
   b) GOOGLE_VISION_CREDENTIALS
      - Valore: Contenuto completo del file JSON credentials (come stringa)
      - Formato: JSON stringificato (tutto su una riga)
      - Environment: Production, Preview, Development
      - IMPORTANTE: Non includere newlines, usa \n se necessario
   
   c) GOOGLE_VISION_API_ENABLED
      - Valore: "true"
      - Environment: Production, Preview, Development
   
   d) GOOGLE_VISION_MAX_IMAGE_SIZE_MB
      - Valore: "10"
      - Environment: Production, Preview, Development

3. VERIFICA:
   - Verifica che Vision API sia abilitata nel progetto
   - Verifica che il Service Account abbia i permessi corretti
   - Testa le variabili in Vercel (Environment Variables)

4. DOCUMENTAZIONE:
   - Crea file .env.example con le variabili (senza valori reali)
   - Documenta il processo in SETUP_GOOGLE_VISION.md

AZIONI RICHIESTE:
1. Esegui setup Google Cloud (se non esiste)
2. Crea Service Account e scarica credentials
3. Configura variabili in Vercel
4. Crea file .env.example
5. Crea documentazione setup
```

---

## 🔧 SETUP MANUALE DETTAGLIATO

### **STEP 1: Google Cloud Console**

1. **Vai a**: https://console.cloud.google.com/
2. **Crea/Seleziona Progetto**:
   - Nome: `efootball-ai-coach`
   - Project ID: `efootball-ai-coach-{random}`
3. **Abilita Vision API**:
   - Menu → "APIs & Services" → "Library"
   - Cerca "Cloud Vision API"
   - Click "Enable"
4. **Crea Service Account**:
   - Menu → "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Nome: `vision-api-service`
   - Ruolo: `Cloud Vision API User`
   - Click "Done"
5. **Genera Chiave JSON**:
   - Click sul Service Account creato
   - Tab "Keys" → "Add Key" → "Create new key"
   - Tipo: JSON
   - Download del file JSON

---

### **STEP 2: Preparare Credentials JSON**

Il file JSON scaricato avrà questa struttura:

```json
{
  "type": "service_account",
  "project_id": "efootball-ai-coach-123456",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "vision-api-service@efootball-ai-coach-123456.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

**IMPORTANTE**: Per Vercel, devi convertire questo JSON in una stringa su una riga:

```bash
# Linux/Mac
cat credentials.json | jq -c

# Windows PowerShell
Get-Content credentials.json | ConvertFrom-Json | ConvertTo-Json -Compress
```

---

### **STEP 3: Variabili Vercel**

Vai su Vercel Dashboard → Il tuo progetto → Settings → Environment Variables

#### **Variabile 1: `GOOGLE_VISION_PROJECT_ID`**
```
Name: GOOGLE_VISION_PROJECT_ID
Value: efootball-ai-coach-123456
Environment: Production, Preview, Development
```

#### **Variabile 2: `GOOGLE_VISION_CREDENTIALS`**
```
Name: GOOGLE_VISION_CREDENTIALS
Value: {"type":"service_account","project_id":"efootball-ai-coach-123456",...}
Environment: Production, Preview, Development
```

**⚠️ ATTENZIONE**: 
- Il valore deve essere tutto su UNA RIGA
- Non includere newlines
- Usa `\n` per i newlines nel private_key se necessario

#### **Variabile 3: `GOOGLE_VISION_API_ENABLED`**
```
Name: GOOGLE_VISION_API_ENABLED
Value: true
Environment: Production, Preview, Development
```

#### **Variabile 4: `GOOGLE_VISION_MAX_IMAGE_SIZE_MB`**
```
Name: GOOGLE_VISION_MAX_IMAGE_SIZE_MB
Value: 10
Environment: Production, Preview, Development
```

---

### **STEP 4: File .env.example**

Crea file `.env.example` nella root del progetto:

```env
# Google Cloud Vision API
GOOGLE_VISION_PROJECT_ID=your-project-id-here
GOOGLE_VISION_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
GOOGLE_VISION_API_ENABLED=true
GOOGLE_VISION_MAX_IMAGE_SIZE_MB=10
```

**⚠️ NON COMMITTARE** il file `.env` con valori reali!

---

### **STEP 5: Verifica Setup**

#### **Test Locale (con .env):**

```typescript
// test-vision.ts
import { GoogleAuth } from "https://deno.land/x/google_auth@v1.0.0/mod.ts"

const credentials = JSON.parse(Deno.env.get('GOOGLE_VISION_CREDENTIALS') || '{}')
const auth = new GoogleAuth({ credentials })

const vision = await auth.getClient()

console.log('✅ Google Vision API configurato correttamente!')
```

#### **Test in Vercel Edge Function:**

```typescript
// supabase/functions/process-screenshot/index.ts
const credentials = JSON.parse(Deno.env.get('GOOGLE_VISION_CREDENTIALS') || '{}')

if (!credentials.project_id) {
  throw new Error('GOOGLE_VISION_CREDENTIALS non configurato')
}

console.log('Project ID:', credentials.project_id)
```

---

## 📝 DOCUMENTAZIONE SETUP

Crea file `SETUP_GOOGLE_VISION.md`:

```markdown
# Setup Google Vision API

## Prerequisiti
- Account Google Cloud
- Progetto Vercel configurato

## Passi

1. Crea progetto Google Cloud
2. Abilita Vision API
3. Crea Service Account
4. Scarica credentials JSON
5. Configura variabili Vercel
6. Testa configurazione

## Variabili Vercel Richieste

- GOOGLE_VISION_PROJECT_ID
- GOOGLE_VISION_CREDENTIALS
- GOOGLE_VISION_API_ENABLED
- GOOGLE_VISION_MAX_IMAGE_SIZE_MB

## Troubleshooting

- Errore "Permission denied": Verifica ruoli Service Account
- Errore "Invalid credentials": Verifica formato JSON (una riga)
- Errore "API not enabled": Abilita Vision API nel progetto
```

---

## 🎯 CHECKLIST FINALE

- [ ] Progetto Google Cloud creato
- [ ] Vision API abilitata
- [ ] Service Account creato
- [ ] Credentials JSON scaricato
- [ ] Variabili Vercel configurate:
  - [ ] GOOGLE_VISION_PROJECT_ID
  - [ ] GOOGLE_VISION_CREDENTIALS
  - [ ] GOOGLE_VISION_API_ENABLED
  - [ ] GOOGLE_VISION_MAX_IMAGE_SIZE_MB
- [ ] File .env.example creato
- [ ] Documentazione creata
- [ ] Test configurazione eseguito

---

## ⚠️ SICUREZZA

1. **NON COMMITTARE** credentials JSON nel repository
2. **USA** variabili d'ambiente Vercel (non hardcode)
3. **LIMITA** permessi Service Account (solo Vision API)
4. **ROTA** credentials periodicamente
5. **MONITORA** usage e costi Google Cloud

---

## 💰 COSTI

Google Vision API pricing (aggiornato 2025):
- **Text Detection**: $1.50 per 1,000 immagini (primi 1,000/mese gratis)
- **Document Text Detection**: $1.50 per 1,000 immagini
- **Label Detection**: $2.00 per 1,000 immagini

**Stima mensile** (100 utenti, 10 screenshot/utente):
- 1,000 immagini/mese
- Costo: ~$5-10/mese (dopo free tier)

---

**Status**: 🟢 Pronto per configurazione
