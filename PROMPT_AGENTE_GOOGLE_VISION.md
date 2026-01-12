# 🤖 Prompt per Agente - Setup Google Vision API

## PROMPT COMPLETO

```
Sei un agente di configurazione per progetti cloud. Il tuo compito è configurare Google Cloud Vision API per il progetto eFootball AI Coach e creare tutte le variabili d'ambiente necessarie in Vercel.

CONTESTO PROGETTO:
- Nome: eFootball AI Coach
- Piattaforma: Vercel (frontend) + Supabase (backend)
- Funzionalità: Estrazione dati da screenshot giocatori eFootball usando Vision API

COMPITI RICHIESTI:

1. GOOGLE CLOUD SETUP:
   a) Accedi a Google Cloud Console (https://console.cloud.google.com/)
   b) Crea un nuovo progetto (o identifica progetto esistente):
      - Nome progetto: "efootball-ai-coach"
      - Project ID: generato automaticamente o personalizzato
   c) Abilita "Cloud Vision API":
      - Vai a "APIs & Services" → "Library"
      - Cerca "Cloud Vision API"
      - Click "Enable"
   d) Crea Service Account:
      - Vai a "IAM & Admin" → "Service Accounts"
      - Click "Create Service Account"
      - Nome: "vision-api-service"
      - Descrizione: "Service account per Vision API processing screenshot"
      - Ruolo: "Cloud Vision API User"
      - Click "Done"
   e) Genera e scarica chiave JSON:
      - Click sul Service Account creato
      - Tab "Keys" → "Add Key" → "Create new key"
      - Tipo: JSON
      - Download del file JSON (salva come "google-vision-credentials.json")

2. PREPARAZIONE CREDENTIALS (SCEGLI UN METODO):

   METODO A - API KEY (CONSIGLIATO - Più Semplice):
   a) Vai a Google Cloud Console → APIs & Services → Credentials
   b) Click "Create Credentials" → "API Key"
   c) Copia l'API Key generata
   d) (Opzionale) Limita API Key a "Cloud Vision API" per sicurezza
   
   METODO B - Service Account (Più Complesso):
   a) Apri il file JSON scaricato
   b) Converti in stringa su una riga (rimuovi newlines, mantieni \n nel private_key)
   c) Verifica che contenga:
      - project_id
      - private_key
      - client_email
      - type: "service_account"

3. CONFIGURAZIONE VERCEL:
   a) Accedi a Vercel Dashboard
   b) Seleziona progetto "efootball-ai-coach" (o nome progetto)
   c) Vai a Settings → Environment Variables
   d) Crea le seguenti variabili:

   VARIABILE 1 (OPZIONALE):
   - Name: GOOGLE_VISION_PROJECT_ID
   - Value: [project_id dal JSON credentials o progetto]
   - Environment: Production, Preview, Development
   - Description: "Google Cloud Project ID per Vision API"
   - Nota: Non strettamente necessaria se usi API Key

   VARIABILE 2 (OPZIONALE - se non usi API Key):
   - Name: GOOGLE_VISION_CREDENTIALS
   - Value: [JSON credentials come stringa su una riga]
   - Environment: Production, Preview, Development
   - Description: "Service Account credentials JSON per Vision API"
   - IMPORTANTE: Il valore deve essere tutto su UNA RIGA, senza newlines
   
   ALTERNATIVA (CONSIGLIATA - più semplice):
   - Name: GOOGLE_VISION_API_KEY
   - Value: [API Key da Google Cloud Console]
   - Environment: Production, Preview, Development
   - Description: "API Key per Vision API (metodo più semplice)"

   VARIABILE 3:
   - Name: GOOGLE_VISION_API_ENABLED
   - Value: true
   - Environment: Production, Preview, Development
   - Description: "Flag per abilitare/disabilitare Vision API"

   VARIABILE 4:
   - Name: GOOGLE_VISION_MAX_IMAGE_SIZE_MB
   - Value: 10
   - Environment: Production, Preview, Development
   - Description: "Dimensione massima immagine in MB"

4. VERIFICA CONFIGURAZIONE:
   a) Verifica che Vision API sia abilitata nel progetto Google Cloud
   b) Verifica che il Service Account abbia il ruolo "Cloud Vision API User"
   c) Verifica che tutte le variabili siano presenti in Vercel
   d) Testa accesso (opzionale): crea un test script per verificare connessione

5. DOCUMENTAZIONE:
   a) Crea file .env.example nella root del progetto con template variabili
   b) Crea file SETUP_GOOGLE_VISION.md con istruzioni setup manuale
   c) Documenta:
      - Come ottenere credentials
      - Come configurare variabili Vercel
      - Troubleshooting comune
      - Costi stimati

6. SICUREZZA:
   a) Verifica che credentials JSON NON siano nel repository
   b) Verifica che .env.example NON contenga valori reali
   c) Verifica che variabili Vercel siano marcate come "Sensitive"
   d) Documenta best practices sicurezza

OUTPUT RICHIESTO:
1. Conferma completamento setup Google Cloud
2. Lista variabili Vercel create (senza valori sensibili)
3. File .env.example creato
4. Documentazione setup creata
5. Checklist completamento

ERRORI COMUNI DA EVITARE:
- Non committare credentials JSON nel repository
- Non includere newlines nel valore GOOGLE_VISION_CREDENTIALS
- Non dimenticare di abilitare Vision API nel progetto
- Non dimenticare di assegnare ruolo corretto al Service Account

Procedi con la configurazione e fornisci report dettagliato.
```

---

## 📋 CHECKLIST PER AGENTE

### **Fase 1: Google Cloud**
- [ ] Progetto creato/identificato
- [ ] Vision API abilitata
- [ ] Service Account creato
- [ ] Ruolo "Cloud Vision API User" assegnato
- [ ] Chiave JSON generata e scaricata

### **Fase 2: Preparazione**
- [ ] JSON convertito in stringa una riga
- [ ] Project ID estratto
- [ ] Credentials validati

### **Fase 3: Vercel**
- [ ] GOOGLE_VISION_PROJECT_ID creata
- [ ] GOOGLE_VISION_CREDENTIALS creata
- [ ] GOOGLE_VISION_API_ENABLED creata
- [ ] GOOGLE_VISION_MAX_IMAGE_SIZE_MB creata
- [ ] Tutte le variabili in Production, Preview, Development

### **Fase 4: Documentazione**
- [ ] .env.example creato
- [ ] SETUP_GOOGLE_VISION.md creato
- [ ] Troubleshooting documentato

### **Fase 5: Verifica**
- [ ] Test connessione (opzionale)
- [ ] Verifica permessi Service Account
- [ ] Verifica variabili Vercel

---

## 🎯 OUTPUT ATTESO

L'agente dovrebbe fornire:

```
✅ SETUP COMPLETATO

Google Cloud:
- Progetto: efootball-ai-coach-123456
- Vision API: Abilitata
- Service Account: vision-api-service@efootball-ai-coach-123456.iam.gserviceaccount.com

Vercel Variables:
✅ GOOGLE_VISION_PROJECT_ID (Production, Preview, Development)
✅ GOOGLE_VISION_CREDENTIALS (Production, Preview, Development)
✅ GOOGLE_VISION_API_ENABLED (Production, Preview, Development)
✅ GOOGLE_VISION_MAX_IMAGE_SIZE_MB (Production, Preview, Development)

Files Created:
✅ .env.example
✅ SETUP_GOOGLE_VISION.md

Next Steps:
1. Test configurazione con Edge Function
2. Monitorare usage e costi Google Cloud
3. Implementare rate limiting se necessario
```

---

**Status**: 🟢 Pronto per uso con agente
