# Backup e Sicurezza - Gattilio27

> Documentazione completa per backup, disaster recovery e sicurezza enterprise

## Indice

1. [Strategia Backup](#strategia-backup)
2. [Backup Database Supabase](#backup-database-supabase)
3. [Backup Codice e Configurazione](#backup-codice-e-configurazione)
4. [Sicurezza](#sicurezza)
5. [Disaster Recovery](#disaster-recovery)
6. [Monitoraggio e Alerting](#monitoraggio-e-alerting)
7. [Checklist Operativa](#checklist-operativa)

---

## Strategia Backup

### Principi Fondamentali

1. **3-2-1 Rule**: 3 copie, 2 supporti diversi, 1 offsite
2. **Backup Automatici**: Automatizzati e verificati
3. **Backup Incrementali**: Giornalieri + settimanali completi
4. **Retention Policy**: 30 giorni incrementali, 12 mesi mensili
5. **Test Restore**: Verifica mensile dei backup

### Cosa Fare Backup

#### Critico (Priorità 1)
- ✅ **Database Supabase** (dati utenti, giocatori, rose)
- ✅ **Environment Variables** (chiavi API, secrets)
- ✅ **Codice sorgente** (repository Git)

#### Importante (Priorità 2)
- ✅ **Configurazione Supabase** (RLS policies, triggers, functions)
- ✅ **Log di processing** (screenshot_processing_log)
- ✅ **Deployment configuration** (Vercel settings)

#### Opzionale (Priorità 3)
- ✅ **Documentazione** (markdown files)
- ✅ **Assets statici** (backgrounds, immagini)

---

## Backup Database Supabase

### Metodo 1: Backup Automatico Supabase (Consigliato)

Supabase offre backup automatici per progetti Pro/Team:

1. **Abilita Backup Automatici**
   - Dashboard → Settings → Database
   - "Point-in-time Recovery" → ON
   - Retention: 7 giorni (gratis) o 30 giorni (Pro)

2. **Backup Manuale (On-Demand)**
   ```bash
   # Via Supabase Dashboard
   Dashboard → Database → Backups → "Create Backup"
   ```

3. **Export SQL Manuale**
   ```bash
   # Via Supabase CLI
   supabase db dump -f backup_$(date +%Y%m%d).sql
   ```

### Metodo 2: Backup Manuale via pg_dump

```bash
# Installa PostgreSQL client
# Windows: https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt-get install postgresql-client

# Ottieni connection string da Supabase Dashboard
# Settings → Database → Connection string (URI)

# Backup completo
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --file=backup_$(date +%Y%m%d_%H%M%S).sql \
  --verbose

# Backup solo schema (senza dati)
pg_dump "postgresql://..." --schema-only --file=schema_$(date +%Y%m%d).sql

# Backup solo dati (senza schema)
pg_dump "postgresql://..." --data-only --file=data_$(date +%Y%m%d).sql
```

### Metodo 3: Backup via Supabase API

```javascript
// Script Node.js per backup automatico
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const { exec } = require('child_process')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const dbPassword = process.env.SUPABASE_DB_PASSWORD

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `backup_${timestamp}.sql`
  
  // Usa pg_dump con connection string
  const connectionString = `postgresql://postgres:${dbPassword}@db.${supabaseUrl.replace('https://', '')}:5432/postgres`
  
  exec(`pg_dump "${connectionString}" > ${filename}`, (error, stdout, stderr) => {
    if (error) {
      console.error('Backup failed:', error)
      return
    }
    console.log('Backup completed:', filename)
  })
}

// Esegui backup giornaliero
backupDatabase()
```

### Retention e Storage

**Storage Locale**:
- Mantieni ultimi 7 backup giornalieri
- Mantieni ultimi 4 backup settimanali
- Mantieni ultimi 12 backup mensili

**Storage Cloud** (Consigliato):
- **AWS S3** con lifecycle policy
- **Google Cloud Storage** con retention
- **Azure Blob Storage** con versioning

**Script Automazione**:
```bash
#!/bin/bash
# backup_rotation.sh

BACKUP_DIR="./backups"
DAILY_RETENTION=7
WEEKLY_RETENTION=4
MONTHLY_RETENTION=12

# Rimuovi backup giornalieri vecchi
find $BACKUP_DIR -name "backup_daily_*.sql" -mtime +$DAILY_RETENTION -delete

# Rimuovi backup settimanali vecchi
find $BACKUP_DIR -name "backup_weekly_*.sql" -mtime +$((WEEKLY_RETENTION * 7)) -delete

# Rimuovi backup mensili vecchi
find $BACKUP_DIR -name "backup_monthly_*.sql" -mtime +$((MONTHLY_RETENTION * 30)) -delete
```

---

## Backup Codice e Configurazione

### Repository Git

**Backup Automatico**:
- ✅ Repository su GitHub (primary)
- ✅ Backup su GitLab (mirror, opzionale)
- ✅ Backup locale su server dedicato

**Script Mirror**:
```bash
#!/bin/bash
# git_mirror.sh

# Push a GitHub (primary)
git push origin master

# Push a GitLab (mirror)
git remote set-url --add --push mirror git@gitlab.com:aifootballab/gattilio27.git
git push mirror master
```

### Environment Variables

**Backup Manuale** (CRITICO):
1. Vercel Dashboard → Project → Settings → Environment Variables
2. Export completo come JSON o testo
3. Salva in password manager (1Password, LastPass, Bitwarden)

**Template Backup**:
```json
{
  "project": "gattilio27",
  "environment": "production",
  "date": "2025-01-16",
  "variables": {
    "OPENAI_API_KEY": "[REDACTED]",
    "NEXT_PUBLIC_SUPABASE_URL": "https://xxx.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "[REDACTED]",
    "SUPABASE_SERVICE_ROLE_KEY": "[REDACTED]"
  }
}
```

**⚠️ IMPORTANTE**: 
- **NON** committare mai secrets in Git
- Usa `.env.example` per template senza valori
- Usa password manager per storage sicuro

### Configurazione Supabase

**Backup Manuale**:
1. **RLS Policies**: Dashboard → Authentication → Policies → Export
2. **Database Schema**: `pg_dump --schema-only`
3. **Functions/Triggers**: Dashboard → Database → Functions → Export

**Script Backup Completo**:
```bash
#!/bin/bash
# supabase_config_backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./supabase_backups/$DATE"
mkdir -p $BACKUP_DIR

# Backup schema
pg_dump --schema-only > $BACKUP_DIR/schema.sql

# Backup RLS policies (via SQL query)
psql $CONNECTION_STRING -c "\d+ players_base" > $BACKUP_DIR/rls_policies.txt

# Backup functions
psql $CONNECTION_STRING -c "\df" > $BACKUP_DIR/functions.txt

echo "Backup completato: $BACKUP_DIR"
```

---

## Sicurezza

### Environment Variables

**Best Practices**:
1. ✅ **NON** esporre mai `SUPABASE_SERVICE_ROLE_KEY` nel client
2. ✅ Usa `NEXT_PUBLIC_` solo per variabili pubbliche (URL, anon key)
3. ✅ Ruota chiavi ogni 90 giorni
4. ✅ Usa variabili separate per dev/staging/production

**Checklist Sicurezza**:
- [ ] `OPENAI_API_KEY` → Server-only (non `NEXT_PUBLIC_`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` → Server-only
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Client (OK, è pubblica)
- [ ] Nessun secret in `.env.local` committato

### Autenticazione

**Configurazione Supabase**:
1. ✅ **Email Provider**: Abilitato, verifica email DISABILITATA
2. ✅ **Anonymous Auth**: DISABILITATO (rimosso)
3. ✅ **Password Policy**: Minimo 6 caratteri (configurabile)
4. ✅ **Session Timeout**: 7 giorni (default Supabase)

**Row Level Security (RLS)**:
- ✅ Tutte le tabelle hanno RLS abilitato
- ✅ Policies verificano `user_id` per isolamento dati
- ✅ Service role bypassa RLS (solo server-side)

### API Security

**Validazione Token**:
- ✅ Tutti gli endpoint validano `Authorization: Bearer <token>`
- ✅ Helper centralizzato `lib/authHelper.js` per validazione
- ✅ Supporta token email (non più anonimi)

**Rate Limiting** (Da implementare):
- ⚠️ Considera rate limiting per `/api/extract-batch`
- ⚠️ Limita chiamate OpenAI per utente/giorno

**CORS**:
- ✅ Vercel gestisce CORS automaticamente
- ✅ Solo domini autorizzati possono chiamare API

### Database Security

**Connection Security**:
- ✅ Supabase usa SSL/TLS per tutte le connessioni
- ✅ Connection string include `?sslmode=require`

**Backup Encryption**:
- ✅ Backup Supabase automatici sono criptati
- ✅ Backup manuali: usa `gpg` per encryption

```bash
# Encrypt backup
gpg --symmetric --cipher-algo AES256 backup.sql

# Decrypt backup
gpg --decrypt backup.sql.gpg > backup.sql
```

### Secrets Management

**Opzioni Enterprise**:
1. **Vercel Environment Variables** (attuale)
   - ✅ Integrato con deployment
   - ⚠️ Limite: solo per Vercel

2. **AWS Secrets Manager** (alternativa)
   - ✅ Rotazione automatica
   - ✅ Audit logging
   - ⚠️ Richiede integrazione custom

3. **HashiCorp Vault** (enterprise)
   - ✅ Gestione centralizzata
   - ✅ Dynamic secrets
   - ⚠️ Setup complesso

---

## Disaster Recovery

### Scenario 1: Database Corrotto

**Procedura**:
1. **Identifica problema**: Log Supabase, errori applicazione
2. **Stop applicazione**: Vercel → Pause deployment (opzionale)
3. **Restore backup**: Supabase Dashboard → Backups → Restore
4. **Verifica dati**: Query di test su tabelle critiche
5. **Riprendi applicazione**: Vercel → Resume deployment

**Tempo di Recovery (RTO)**: 15-30 minuti
**Point-in-time Recovery (RPO)**: 1 ora (con backup automatici)

### Scenario 2: Perdita Environment Variables

**Procedura**:
1. **Identifica variabili mancanti**: Vercel → Environment Variables
2. **Recupera da backup**: Password manager o backup JSON
3. **Reinserisci variabili**: Vercel → Settings → Environment Variables
4. **Redeploy**: Vercel → Deployments → Redeploy

**Tempo di Recovery**: 5-10 minuti

### Scenario 3: Perdita Codice (Repository)

**Procedura**:
1. **Verifica repository**: GitHub → Repository status
2. **Clone da backup**: Se GitHub down, usa mirror GitLab
3. **Verifica integrità**: `git fsck` per verificare repository
4. **Ripristina deployment**: Vercel → Connect repository

**Tempo di Recovery**: 10-15 minuti

### Scenario 4: Compromissione Account

**Procedura**:
1. **Revoca accessi**: Supabase → Team → Remove user
2. **Ruota chiavi**: Genera nuove API keys
3. **Aggiorna environment variables**: Vercel → Redeploy
4. **Audit log**: Verifica accessi sospetti

**Tempo di Recovery**: 30-60 minuti

---

## Monitoraggio e Alerting

### Metriche da Monitorare

**Database**:
- ✅ Connection pool usage
- ✅ Query performance (lente)
- ✅ Storage usage
- ✅ Backup status

**Applicazione**:
- ✅ Error rate (4xx, 5xx)
- ✅ Response time
- ✅ OpenAI API usage/costs
- ✅ Deployment status

**Sicurezza**:
- ✅ Failed login attempts
- ✅ Unusual API usage
- ✅ Token validation failures

### Alerting Setup

**Vercel**:
- ✅ Email notifications per deployment failures
- ✅ Slack integration (opzionale)

**Supabase**:
- ✅ Email alerts per database issues
- ✅ Storage quota warnings

**Custom Monitoring** (Da implementare):
```javascript
// app/api/health/route.js
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    openai: await checkOpenAI(),
    supabase: await checkSupabase()
  }
  
  const healthy = Object.values(checks).every(c => c.status === 'ok')
  
  return NextResponse.json({ 
    status: healthy ? 'healthy' : 'degraded',
    checks 
  }, { 
    status: healthy ? 200 : 503 
  })
}
```

---

## Checklist Operativa

### Backup Giornaliero

- [ ] Verifica backup automatico Supabase (Dashboard)
- [ ] Verifica backup codice (Git push)
- [ ] Verifica log errori applicazione

### Backup Settimanale

- [ ] Export manuale environment variables
- [ ] Verifica integrità backup database
- [ ] Test restore da backup (opzionale)

### Backup Mensile

- [ ] Backup completo configurazione Supabase
- [ ] Audit sicurezza (chiavi, accessi)
- [ ] Test disaster recovery completo
- [ ] Review retention policy

### Sicurezza Mensile

- [ ] Review accessi Supabase (Team members)
- [ ] Review Vercel team access
- [ ] Verifica RLS policies
- [ ] Rotazione chiavi (se necessario)

---

## Contatti e Supporto

**Supabase Support**:
- Dashboard → Support → Create ticket
- Email: support@supabase.io

**Vercel Support**:
- Dashboard → Help → Contact support
- Email: support@vercel.com

**OpenAI Support**:
- Platform → Help → Contact support
- Email: support@openai.com

---

**Ultimo Aggiornamento**: Gennaio 2025  
**Versione Documentazione**: 1.0.0
