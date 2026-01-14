# ⚡ Installa Node.js e Supabase CLI sul Nuovo PC

**Situazione**: Hai cambiato PC e devi reinstallare Node.js e Supabase CLI

---

## 🚀 STEP 1: Installa Node.js

### **Opzione A: Download Diretto (CONSIGLIATO)** 🎯

1. **Vai su**: https://nodejs.org/
2. **Scarica**: LTS Version (Long Term Support) - es. v20.x.x
3. **Installa**: 
   - Esegui il file `.msi` scaricato
   - Segui l'installer (Next, Next, Install)
   - ✅ **IMPORTANTE**: Assicurati che "Add to PATH" sia selezionato
4. **Riavvia PowerShell** (chiudi e riapri)

### **Opzione B: Usando Chocolatey** (se hai Chocolatey)

```powershell
choco install nodejs
```

### **Verifica Installazione**:

```powershell
# Apri NUOVO PowerShell (dopo riavvio)
node --version
npm --version
```

**Output atteso**: 
- `v20.x.x` (o simile)
- `10.x.x` (o simile)

---

## 🔧 STEP 2: Installa Supabase CLI

Dopo che Node.js è installato:

```powershell
# Installa Supabase CLI globalmente
npm install -g supabase

# Verifica installazione
supabase --version
```

**Output atteso**: `supabase x.x.x` (versione)

---

## 🔐 STEP 3: Login a Supabase

```powershell
# Login (apre browser per autenticazione)
supabase login
```

**Cosa succede**:
1. Si apre il browser
2. Fai login con il tuo account Supabase
3. Autorizza l'accesso
4. Torna al terminale - vedrai "Logged in as: your-email"

---

## 🔗 STEP 4: Link al Progetto

```powershell
# Vai nella directory del progetto
cd C:\Users\attil\Desktop\Gattilio27-master\Gattilio27-master

# Link al progetto (usa il tuo Project Reference ID)
supabase link --project-ref YOUR_PROJECT_REF
```

**Dove trovare Project Reference**:
1. Vai su https://supabase.com/dashboard
2. Seleziona il tuo progetto
3. Vai su **Settings** → **General**
4. Copia **Reference ID** (es. `zliuuorrwdetylollrua`)

**Esempio**:
```powershell
supabase link --project-ref zliuuorrwdetylollrua
```

**Output atteso**: `Linked to project: your-project-name`

---

## ✅ STEP 5: Verifica Tutto Funziona

```powershell
# Verifica stato
supabase status

# Verifica che sei nella directory giusta
pwd
```

---

## ⚠️ PROBLEMI COMUNI

### **Errore: "node: command not found" dopo installazione**
- **Soluzione**: Riavvia PowerShell completamente (chiudi e riapri)
- Verifica PATH: `$env:PATH` dovrebbe contenere percorso Node.js

### **Errore: "npm: command not found"**
- **Soluzione**: Node.js include npm, se npm non funziona, reinstalla Node.js
- Assicurati di aver selezionato "Add to PATH" durante installazione

### **Errore: "supabase: command not found" dopo installazione**
- **Soluzione**: Riavvia PowerShell dopo `npm install -g supabase`
- Verifica: `npm list -g supabase` dovrebbe mostrare la versione installata

---

## 📋 CHECKLIST RAPIDA

- [ ] Node.js installato (`node --version` funziona)
- [ ] npm installato (`npm --version` funziona)
- [ ] Supabase CLI installato (`supabase --version` funziona)
- [ ] Loggato (`supabase login` completato)
- [ ] Progetto linkato (`supabase link --project-ref XXX` completato)
- [ ] Verificato (`supabase status` mostra il progetto)

---

## 🎯 DOPO CONFIGURAZIONE

Una volta completato, posso aiutarti a:
- ✅ Eseguire la migration 003
- ✅ Deployare le Edge Functions GPT-Realtime
- ✅ Eseguire query SQL
- ✅ Gestire il database

---

**Status**: 📋 **SEGUI GLI STEP** - Dopo installazione Node.js, tutto sarà veloce!
